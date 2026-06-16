import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useConsumerPatients, usePatientVisitsById, usePatientConsentsById,
} from "@/lib/domain";
import { useAuth } from "@/lib/auth-context";
import { bindStatus } from "@/lib/workflow-bind";
import { HeartHandshake, CalendarCheck, FileSignature, Activity } from "lucide-react";

/**
 * Phase 6B+C — Consumer patient continuity surface.
 *
 * Specialized for care continuity: per-patient operational summary with
 * counts of bookings/consents and last activity. Reads from the domain
 * context — no new state, no new schemas.
 */
export const Route = createFileRoute("/_app/consumer/patients")({
  component: PatientsLayout,
  head: () => ({ meta: [{ title: "Patients — NurseConnect" }] }),
});

function PatientsLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  if (pathname === "/consumer/patients") return <ConsumerPatients />;
  return <Outlet />;
}

function ConsumerPatients() {
  const { user } = useAuth();
  const patients = useConsumerPatients(user?.id ?? null);

  if (patients.length === 0) {
    return (
      <Card title="My patients">
        <EmptyState icon={HeartHandshake} title="No patients added"
          description="Add a patient to start tracking care continuity." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[13px] text-muted-foreground">
        Care continuity across the people you manage. Each row aggregates ongoing
        services, consents and the most recent visit.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patients.map(p => <PatientContinuityCard key={p.id} patient={p} />)}
      </div>
    </div>
  );
}

function PatientContinuityCard({ patient }: { patient: ReturnType<typeof useConsumerPatients>[number] }) {
  const visits = usePatientVisitsById(patient.id);
  const consents = usePatientConsentsById(patient.id);
  const active = visits.filter(v => v.rawStatus !== "completed" && v.rawStatus !== "cancelled");
  const recent = visits.slice(0, 4);

  return (
    <Link to="/consumer/patients/$patientId" params={{ patientId: patient.id }} className="block">
      <Card title={
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
            <HeartHandshake className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">{patient.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {patient.id} · {patient.age}{patient.gender} · {patient.plan} · {patient.city}
            </div>
          </div>
        </div>
      }>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <Stat icon={Activity} label="In care" value={active.length} tone="primary" />
          <Stat icon={CalendarCheck} label="Visits" value={visits.length} tone="info" />
          <Stat icon={FileSignature} label="Consents" value={consents.length} tone="success" />
        </div>
        <div className="mt-3 text-[12px] text-muted-foreground">
          Last visit: <span className="text-foreground">{patient.lastVisit ?? "—"}</span>
        </div>

        {recent.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Care journey</div>
            <ol className="relative pl-4 space-y-2">
              <span className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
              {recent.map(v => (
                <li key={v.id} className="relative">
                  <span className="absolute -left-[11px] top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] truncate flex-1">
                      <span className="font-medium">{v.service}</span>
                      <span className="text-muted-foreground"> · {v.area}</span>
                    </div>
                    <StatusBadge workflow="booking" state={bindStatus("booking", v.rawStatus)} />
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">{v.startedAt}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </Link>
  );
}

function Stat({ icon: Icon, label, value, tone }: {
  icon: typeof Activity; label: string; value: number;
  tone: "primary" | "info" | "success";
}) {
  const toneCls = tone === "primary" ? "bg-primary/5 text-primary"
    : tone === "info" ? "bg-sky-50 text-sky-700"
    : "bg-emerald-50 text-emerald-700";
  return (
    <div className={`rounded-md px-2 py-2 ${toneCls}`}>
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wide opacity-80">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-[16px] font-semibold mt-0.5">{value}</div>
    </div>
  );
}