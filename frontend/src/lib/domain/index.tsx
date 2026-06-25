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
import { OrchestrationProvider, useOrchestration } from "@/lib/orchestration";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function apiFetch(path: string, init?: RequestInit) {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail?.[0]?.msg ?? err?.detail ?? `API error ${res.status}`);
  }
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

export interface VisitEntity extends BookingEntity { }

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

export interface ServiceEntity {
  id: string;
  name: string;
  durationMinutes?: number;
  basePrice?: number;
}

// ---------------------------------------------------------------- Patient create payload
// Mirrors backend PatientCreate (app/schemas/schemas.py) exactly.
export interface PatientCreatePayload {
  full_name: string;
  date_of_birth?: string | null; // "YYYY-MM-DD"
  gender?: "male" | "female" | "other" | null;
  relationship_to_consumer?: string | null;
  blood_group?: string | null;
  medical_conditions?: string[] | null;
  allergies?: string[] | null;
  current_medications?: Record<string, any>[] | null;
  abha_id?: string | null;
  is_minor?: boolean;
  notes?: string | null;
}

// ---------------------------------------------------------------- Context
interface DomainState {
  bookings: BookingEntity[];
  visits: VisitEntity[];
  patients: Patient[];
  consents: ConsentEntity[];
  incidents: IncidentEntity[];
  packages: PackageEntity[];
  services: ServiceEntity[];
  loading: boolean;

  getBooking: (id: string) => BookingEntity | undefined;
  getPatient: (nameOrId: string) => Patient | undefined;
  getVisitsForPatient: (patientName: string) => VisitEntity[];
  getConsentsForPatient: (patientName: string) => ConsentEntity[];
  getIncidentsForPatient: (patientName: string) => IncidentEntity[];
  getVisitsForPatientId: (patientId: string) => VisitEntity[];
  getConsentsForPatientId: (patientId: string) => ConsentEntity[];
  getIncidentsForPatientId: (patientId: string) => IncidentEntity[];
  refetchBookings: () => Promise<void>;
  createPatient: (payload: PatientCreatePayload) => Promise<Patient>;
}

const DomainCtx = createContext<DomainState | null>(null);

// ── Map API booking → BookingEntity ─────────────────────────────────────
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

// ── Map API patient → Patient ───────────────────────────────────────────
function mapPatient(p: any): Patient {
  return {
    id: p.id ?? "",
    name: p.full_name ?? p.name ?? "—",
    age: p.age ?? (p.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : 0),
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

// ── Map API service → ServiceEntity ─────────────────────────────────────
function mapService(s: any): ServiceEntity {
  return {
    id: s.id ?? "",
    name: s.name ?? s.service_code ?? "Service",
    durationMinutes: s.duration_minutes ?? undefined,
    basePrice: s.base_price ?? undefined,
  };
}

// ── Build mock fallback data ────────────────────────────────────────────
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
    { id: "PKG-101", name: "Geriatric Care Plus", rawStatus: "active" },
    { id: "PKG-102", name: "Post-Op Recovery 14d", rawStatus: "active" },
    { id: "PKG-103", name: "Palliative Live-In", rawStatus: "on_hold" },
    { id: "PKG-104", name: "Diabetes Monitoring", rawStatus: "pending" },
  ];

  const services: ServiceEntity[] = [
    { id: "SVC-101", name: "Geriatric Care" },
    { id: "SVC-102", name: "Wound Dressing" },
    { id: "SVC-103", name: "Post-Op" },
    { id: "SVC-104", name: "Diabetes Check" },
    { id: "SVC-105", name: "IV Therapy" },
  ];

  return { bookings, visits: bookings, patients: PATIENTS, consents, incidents, packages, services };
}
function BookingSyncer({ bookings, userId }: { bookings: BookingEntity[]; userId: string | null }) {
  const store = useOrchestration();
  useEffect(() => {
    if (!userId || bookings.length === 0) return;
    bookings.forEach(b => {
      store.repos.booking.upsert({
        id: b.id,
        workflow: "booking",
        state: b.rawStatus,
        enteredAt: b.startedAt ?? new Date().toISOString(),
        data: {
          ...b,
          ownerId: userId,
          patientName: b.patientName,
          service: b.service,
          area: b.area,
          status: b.rawStatus,
        },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, userId]);
  return null;
}
export function DomainProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(buildMockData);
  const [loading, setLoading] = useState(true);

  async function load() {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    console.log("Token:", token ? "present" : "MISSING");
    if (!token) { setLoading(false); return; }

    try {
      const mock = buildMockData();

      // Fetch all data in parallel
      const [bookingsRes, patientsRes, servicesRes, packagesRes] = await Promise.allSettled([
        apiFetch("/api/bookings/consumer"),
        apiFetch("/api/patients"),
        apiFetch("/api/services"),
        apiFetch("/api/care-packages"),
      ]);
      console.log("patients:", patientsRes);
      console.log("services:", servicesRes);

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

      // Map services
      const services: ServiceEntity[] =
        servicesRes.status === "fulfilled"
          ? (Array.isArray(servicesRes.value)
            ? servicesRes.value
            : (servicesRes.value?.items ?? [])
          ).map(mapService)
          : mock.services;

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
        services,
      });
    } catch (e) {
      console.warn("Domain API load failed, using mock data:", e);
    } finally {
      setLoading(false);
    }
  }

  // Creates a patient via POST /api/patients, then refreshes the patient
  // list from the server so the new record (with its real ID) is reflected
  // everywhere immediately (Patients page, booking form dropdown, etc).
  async function createPatient(payload: PatientCreatePayload): Promise<Patient> {
    const created = await apiFetch("/api/patients", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const mapped = mapPatient(created);

    setData(prev => ({ ...prev, patients: [mapped, ...prev.patients] }));

    return mapped;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<DomainState>(() => {
    const { bookings, visits, patients, consents, incidents, packages, services } = data;
    const idByName = new Map(patients.map(p => [p.name, p.id] as const));
    const idFor = (name: string) => idByName.get(name);

    return {
      bookings, visits, patients, consents, incidents, packages, services, loading,
      getBooking: (id) => bookings.find(b => b.id === id),
      getPatient: (k) => patients.find(p => p.id === k || p.name === k),
      getVisitsForPatient: (n) => visits.filter(v => v.patientName === n),
      getConsentsForPatient: (n) => consents.filter(c => c.patientName === n),
      getIncidentsForPatient: (n) => incidents.filter(i => i.title.includes(n)),
      getVisitsForPatientId: (id) => visits.filter(v => (v.patientId ?? idFor(v.patientName)) === id),
      getConsentsForPatientId: (id) => consents.filter(c => (c.patientId ?? idFor(c.patientName)) === id),
      getIncidentsForPatientId: (id) => {
        const patient = patients.find(p => p.id === id);
        return incidents.filter(i => {
          if (i.patientId) return i.patientId === id;
          return patient ? i.title.includes(patient.name) : false;
        });
      },
      refetchBookings: load,
      createPatient,
    };
  }, [data, loading]);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nc.session.v1");
      setUserId(raw ? JSON.parse(raw)?.id ?? null : null);
    } catch { setUserId(null); }
  }, []);
  return (
    <DomainCtx.Provider value={value}>
      <OrchestrationProvider>
        <BookingSyncer bookings={data.bookings} userId={userId} />
        {children}
      </OrchestrationProvider>
    </DomainCtx.Provider>
  );
}

function useDomainCtx(): DomainState {
  const ctx = useContext(DomainCtx);
  if (!ctx) throw new Error("useDomain must be used within <DomainProvider>");
  return ctx;
}

// Public hooks ----------------------------------------------------------------
export const useBookings = () => useDomainCtx().bookings;
export const useVisits = () => useDomainCtx().visits;
export const usePatients = () => useDomainCtx().patients;
export const useConsents = () => useDomainCtx().consents;
export const useIncidents = () => useDomainCtx().incidents;
export const usePackages = () => useDomainCtx().packages;
export const useServices = () => useDomainCtx().services;
export const useDomainLoading = () => useDomainCtx().loading;
export const useRefetchBookings = () => useDomainCtx().refetchBookings;

export const useConsumerPatients = (ownerId: string | null | undefined) => {
  const all = useDomainCtx().patients;
  return useMemo(() => {
    if (!ownerId) return all;
    const filtered = all.filter(p => (p as any).ownerId === ownerId);
    return filtered.length > 0 ? filtered : all; // ← add this fallback
  }, [all, ownerId]);
};
export const useBooking = (id: string) => useDomainCtx().getBooking(id);
export const usePatient = (k: string) => useDomainCtx().getPatient(k);
export const usePatientVisits = (name: string) => useDomainCtx().getVisitsForPatient(name);
export const usePatientConsents = (name: string) => useDomainCtx().getConsentsForPatient(name);
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

// New hook: exposes the create-patient mutation to components.
export const useCreatePatient = () => useDomainCtx().createPatient;

export function useDomainSummary() {
  const d = useDomainCtx();
  return {
    activeBookings: d.bookings.length,
    patients: d.patients.length,
    pendingConsents: d.consents.filter(c => c.rawStatus === "blocked").length,
    openIncidents: d.incidents.filter(i => i.rawStatus !== "resolved").length,
    activePackages: d.packages.filter(p => p.rawStatus === "active").length,
  };
}

export const ADMIN_PAYOUTS = PAYOUTS;
export const ADMIN_DISPUTES = DISPUTES;
export const ADMIN_COMPLAINTS = COMPLAINTS;