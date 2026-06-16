/**
 * Shared Domain Context — Backend-connected version v2.
 * Fetches real data from the NurseConnect API, falls back to mock data
 * if the API is unavailable.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACTIVE_VISITS, CLINICAL_CASES, COMPLAINTS, CONSENTS,
  DISPUTES, INCIDENTS, PATIENTS, PAYOUTS,
  resolvePatientIdByName,
  type Patient,
} from "@/lib/mock-data";
import { OrchestrationProvider } from "@/lib/orchestration";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function apiFetch(path: string) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------- Entity types
export interface BookingEntity {
  id: string;
  patientId?: string;
  patientName: string;
  nurseName: string;
  service: string;
  area: string;
  startedAt: string;
  duration: string;
  rawStatus: string;
}

export interface VisitEntity extends BookingEntity {}

export interface ConsentEntity {
  id: string;
  patientId?: string;
  patientName: string;
  type: string;
  version: string;
  rawStatus: string;
  signedAt: string;
}

export interface IncidentEntity {
  id: string;
  patientId?: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  rawStatus: string;
  reporter: string;
  assigned: string;
  createdAt: string;
}

export interface PackageEntity {
  id: string;
  name: string;
  rawStatus: string;
}

// ---------------------------------------------------------------- Context
interface DomainState {
  bookings: BookingEntity[];
  visits: VisitEntity[];
  patients: Patient[];
  consents: ConsentEntity[];
  incidents: IncidentEntity[];
  packages: PackageEntity[];
  loading: boolean;

  getBooking: (id: string) => BookingEntity | undefined;
  getPatient: (nameOrId: string) => Patient | undefined;
  getVisitsForPatient: (patientName: string) => VisitEntity[];
  getConsentsForPatient: (patientName: string) => ConsentEntity[];
  getIncidentsForPatient: (patientName: string) => IncidentEntity[];
  getVisitsForPatientId: (patientId: string) => VisitEntity[];
  getConsentsForPatientId: (patientId: string) => ConsentEntity[];
  getIncidentsForPatientId: (patientId: string) => IncidentEntity[];
}

const DomainCtx = createContext<DomainState | null>(null);

// ── Map API booking → BookingEntity ──────────────────────────────
function mapBooking(
  b: any,
  patientMap: Map<string, string>,
  serviceMap: Map<string, string>,
): BookingEntity {
  const patientName = patientMap.get(b.patient_id) ?? "—";
  const service = serviceMap.get(b.service_id) ?? b.service_code ?? "Service";
  const area = b.address_snapshot
    ? [b.address_snapshot.line1, b.address_snapshot.city].filter(Boolean).join(", ")
    : "—";
  const startedAt = b.scheduled_date && b.scheduled_start_time
    ? `${b.scheduled_date} ${b.scheduled_start_time.slice(0, 5)}`
    : b.created_at ?? "";

  return {
    id: b.id ?? "",
    patientId: b.patient_id ?? undefined,
    patientName,
    nurseName: b.worker_name ?? "",
    service,
    area,
    startedAt,
    duration: b.scheduled_duration_minutes ? `${b.scheduled_duration_minutes} mins` : "—",
    rawStatus: b.status ?? "pending",
  };
}

// ── Map API patient → Patient ─────────────────────────────────────
function mapPatient(p: any): Patient {
  return {
    id: p.id ?? "",
    name: p.full_name ?? p.name ?? "—",
    age: p.age ?? 0,
    gender: p.gender === "female" ? "F" : "M",
    phone: p.phone_e164 ?? p.phone ?? "—",
    city: p.city ?? "—",
    plan: p.care_plan ?? p.relationship_to_consumer ?? "—",
    status: "Active",
    bpl: p.bpl ?? false,
    spent: "₹0",
    lastVisit: "—",
    ownerId: p.consumer_id ?? undefined,
  };
}

// ── Build mock fallback data ──────────────────────────────────────
function buildMockData() {
  const bookings: BookingEntity[] = ACTIVE_VISITS.map(v => ({
    id: v.id,
    patientId: resolvePatientIdByName(v.patient),
    patientName: v.patient, nurseName: v.nurse ?? "", service: v.service,
    area: v.area, startedAt: v.started, duration: v.duration, rawStatus: v.status,
  }));

  const consents: ConsentEntity[] = CONSENTS.map(c => ({
    id: c.id,
    patientId: resolvePatientIdByName(c.patient),
    patientName: c.patient, type: c.type, version: c.version,
    rawStatus: c.status, signedAt: c.signedAt,
  }));

  const incidents: IncidentEntity[] = [
    ...CLINICAL_CASES.map(c => ({
      id: c.id,
      patientId: resolvePatientIdByName(c.patient),
      title: `${c.issue} — ${c.patient}`,
      severity: c.severity as IncidentEntity["severity"],
      rawStatus: "open", reporter: c.nurse, assigned: "Clinical Desk",
      createdAt: c.raised,
    })),
    ...INCIDENTS.map(i => ({
      id: i.id, title: i.title,
      severity: i.severity as IncidentEntity["severity"],
      rawStatus: i.status, reporter: i.reporter, assigned: i.assigned,
      createdAt: i.created,
    })),
  ];

  const packages: PackageEntity[] = [
    { id: "PKG-101", name: "Geriatric Care Plus",  rawStatus: "active"  },
    { id: "PKG-102", name: "Post-Op Recovery 14d", rawStatus: "active"  },
    { id: "PKG-103", name: "Palliative Live-In",   rawStatus: "on_hold" },
    { id: "PKG-104", name: "Diabetes Monitoring",  rawStatus: "pending" },
  ];

  return { bookings, visits: bookings, patients: PATIENTS, consents, incidents, packages };
}

export function DomainProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(buildMockData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }

    let cancelled = false;

    async function load() {
      try {
        const mock = buildMockData();

        // Fetch all data in parallel
        const [bookingsRes, patientsRes, servicesRes, packagesRes] = await Promise.allSettled([
          apiFetch("/api/bookings/consumer"),
          apiFetch("/api/patients"),
          apiFetch("/api/services"),
          apiFetch("/api/care-packages"),
        ]);

        if (cancelled) return;

        // Build lookup maps for patient & service names
        const patientMap = new Map<string, string>();
        const serviceMap = new Map<string, string>();

        if (patientsRes.status === "fulfilled") {
          const list = Array.isArray(patientsRes.value)
            ? patientsRes.value
            : (patientsRes.value?.items ?? []);
          list.forEach((p: any) => patientMap.set(p.id, p.full_name ?? p.name ?? "—"));
        }

        if (servicesRes.status === "fulfilled") {
          const list = Array.isArray(servicesRes.value)
            ? servicesRes.value
            : (servicesRes.value?.items ?? []);
          list.forEach((s: any) => serviceMap.set(s.id, s.name ?? s.service_code ?? "Service"));
        }

        // Map bookings with resolved names
        const bookings: BookingEntity[] =
          bookingsRes.status === "fulfilled"
            ? (Array.isArray(bookingsRes.value)
                ? bookingsRes.value
                : (bookingsRes.value?.items ?? [])
              ).map((b: any) => mapBooking(b, patientMap, serviceMap))
            : mock.bookings;

        // Map patients
        const patients: Patient[] =
          patientsRes.status === "fulfilled"
            ? (Array.isArray(patientsRes.value)
                ? patientsRes.value
                : (patientsRes.value?.items ?? [])
              ).map(mapPatient)
            : mock.patients;

        // Map packages
        const packages: PackageEntity[] =
          packagesRes.status === "fulfilled"
            ? (Array.isArray(packagesRes.value)
                ? packagesRes.value
                : (packagesRes.value?.items ?? [])
              ).map((p: any) => ({
                id: p.id ?? "",
                name: p.name ?? p.package_name ?? "Package",
                rawStatus: p.is_active ? "active" : "inactive",
              }))
            : mock.packages;

        setData({
          bookings,
          visits: bookings,
          patients,
          consents: mock.consents,
          incidents: mock.incidents,
          packages,
        });
      } catch (e) {
        console.warn("Domain API load failed, using mock data:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<DomainState>(() => {
    const { bookings, visits, patients, consents, incidents, packages } = data;
    const idByName = new Map(patients.map(p => [p.name, p.id] as const));
    const idFor = (name: string) => idByName.get(name);

    return {
      bookings, visits, patients, consents, incidents, packages, loading,
      getBooking:  (id) => bookings.find(b => b.id === id),
      getPatient:  (k)  => patients.find(p => p.id === k || p.name === k),
      getVisitsForPatient:    (n) => visits.filter(v => v.patientName === n),
      getConsentsForPatient:  (n) => consents.filter(c => c.patientName === n),
      getIncidentsForPatient: (n) => incidents.filter(i => i.title.includes(n)),
      getVisitsForPatientId:   (id) => visits.filter(v => (v.patientId ?? idFor(v.patientName)) === id),
      getConsentsForPatientId: (id) => consents.filter(c => (c.patientId ?? idFor(c.patientName)) === id),
      getIncidentsForPatientId: (id) => {
        const patient = patients.find(p => p.id === id);
        return incidents.filter(i => {
          if (i.patientId) return i.patientId === id;
          return patient ? i.title.includes(patient.name) : false;
        });
      },
    };
  }, [data, loading]);

  return (
    <DomainCtx.Provider value={value}>
      <OrchestrationProvider>{children}</OrchestrationProvider>
    </DomainCtx.Provider>
  );
}

function useDomainCtx(): DomainState {
  const ctx = useContext(DomainCtx);
  if (!ctx) throw new Error("useDomain must be used within <DomainProvider>");
  return ctx;
}

// Public hooks ----------------------------------------------------------------
export const useBookings  = () => useDomainCtx().bookings;
export const useVisits    = () => useDomainCtx().visits;
export const usePatients  = () => useDomainCtx().patients;
export const useConsents  = () => useDomainCtx().consents;
export const useIncidents = () => useDomainCtx().incidents;
export const usePackages  = () => useDomainCtx().packages;
export const useDomainLoading = () => useDomainCtx().loading;

export const useConsumerPatients = (ownerId: string | null | undefined) => {
  const all = useDomainCtx().patients;
  return useMemo(
    () => (ownerId ? all.filter(p => (p as any).ownerId === ownerId) : all),
    [all, ownerId],
  );
};

export const useBooking          = (id: string)   => useDomainCtx().getBooking(id);
export const usePatient          = (k: string)    => useDomainCtx().getPatient(k);
export const usePatientVisits    = (name: string) => useDomainCtx().getVisitsForPatient(name);
export const usePatientConsents  = (name: string) => useDomainCtx().getConsentsForPatient(name);
export const usePatientIncidents = (name: string) => useDomainCtx().getIncidentsForPatient(name);

export const usePatientVisitsById = (id: string | null | undefined): VisitEntity[] => {
  const ctx = useDomainCtx();
  return id ? ctx.getVisitsForPatientId(id) : [];
};
export const usePatientConsentsById = (id: string | null | undefined): ConsentEntity[] => {
  const ctx = useDomainCtx();
  return id ? ctx.getConsentsForPatientId(id) : [];
};
export const usePatientIncidentsById = (id: string | null | undefined): IncidentEntity[] => {
  const ctx = useDomainCtx();
  return id ? ctx.getIncidentsForPatientId(id) : [];
};

export function useDomainSummary() {
  const d = useDomainCtx();
  return {
    activeBookings:  d.bookings.length,
    patients:        d.patients.length,
    pendingConsents: d.consents.filter(c => c.rawStatus === "blocked").length,
    openIncidents:   d.incidents.filter(i => i.rawStatus !== "resolved").length,
    activePackages:  d.packages.filter(p => p.rawStatus === "active").length,
  };
}

export const ADMIN_PAYOUTS    = PAYOUTS;
export const ADMIN_DISPUTES   = DISPUTES;
export const ADMIN_COMPLAINTS = COMPLAINTS;