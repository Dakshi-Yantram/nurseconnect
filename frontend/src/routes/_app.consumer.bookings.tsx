import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SLAIndicator } from "@/components/shared/SLAIndicator";
import { Modal } from "@/components/shared/Modal";
import { RuntimeBoundary } from "@/components/shared/RuntimeBoundary";
import { WorkflowActionButton } from "@/components/shared/WorkflowActionButton";
import { SchemaForm } from "@/lib/forms/SchemaForm";
import { BOOKING_REQUEST_SCHEMA } from "@/lib/forms/templates";
import type { FormSchema } from "@/lib/forms/schema";
import { useAuth } from "@/lib/auth-context";
import {
  useBookings, useConsumerPatients, useServices, useRefetchBookings,
} from "@/lib/domain";
import { bindStatus, parseEnteredAt } from "@/lib/workflow-bind";
import {
  CalendarCheck, Plus, ChevronRight, Clock, HeartPulse,
  History as HistoryIcon, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/consumer/bookings")({
  component: BookingsLayout,
  head: () => ({ meta: [{ title: "Bookings â€” NurseConnect" }] }),
});

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function apiPost(path: string, body: unknown) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.detail?.[0]?.msg ?? err?.detail ?? `Request failed (${res.status})`
    );
  }
  return res.json();
}

function BookingsLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  if (pathname === "/consumer/bookings") return <ConsumerBookings />;
  return <Outlet />;
}

function ConsumerBookings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const bookings = useBookings();
  const patients = useConsumerPatients(user?.id);
  const services = useServices();
  const refetchBookings = useRefetchBookings();

  // Build the schema fresh with real patient/service options each time the
  // modal is opened â€” keeps templates.ts as the static base schema while
  // letting these two fields reflect live data.
  const liveSchema: FormSchema = useMemo(() => {
    const patientField = BOOKING_REQUEST_SCHEMA.sections[0].fields[0];
    const serviceField = BOOKING_REQUEST_SCHEMA.sections[0].fields[1];

    return {
      ...BOOKING_REQUEST_SCHEMA,
      sections: BOOKING_REQUEST_SCHEMA.sections.map((section, i) => {
        if (i !== 0) return section;
        return {
          ...section,
          fields: section.fields.map(f => {
            if (f.key === patientField.key) {
              return {
                ...f,
                kind: "select" as const,
                options: patients.map(p => ({ label: p.name, value: p.id })),
              };
            }
            if (f.key === serviceField.key) {
              return {
                ...f,
                options: services.map(s => ({ label: s.name, value: s.id })),
              };
            }
            return f;
          }),
        };
      }),
    };
  }, [patients, services]);

  const care = {
    all: bookings,
    upcoming: bookings.filter(b =>
      b.rawStatus === "pending_payment" ||
      b.rawStatus === "pending" ||
      b.rawStatus === "claimed"
    ),
    inCare: bookings.filter(b =>
      b.rawStatus === "active" ||
      b.rawStatus === "in_progress"
    ),
    completed: bookings.filter(b => b.rawStatus === "completed"),
    escalated: bookings.filter(b => b.rawStatus === "escalated"),
  };

  const onCreate = async (values: Record<string, unknown>) => {
    const patient = patients.find(p => p.id === values.patient_name);
    if (!patient) {
      toast.error("Select a patient");
      return;
    }
    const service = services.find(s => s.id === values.service);
    if (!service) {
      toast.error("Select a service");
      return;
    }

    setSubmitting(true);
    try {
      const created = await apiPost("/api/bookings/", {
        patient_id: patient.id,
        service_id: service.id,
        booking_type: "one_time",
        scheduled_date: values.preferred_date,
        scheduled_start_time: (() => {
          const t = (values.preferred_time as string) || "10:00 AM";
          const [time, period] = t.split(" ");
          const [h, m] = time.split(":").map(Number);
          const hours24 = period === "PM" && h !== 12 ? h + 12 : (period === "AM" && h === 12 ? 0 : h);
          return `${String(hours24).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
        })(),
        is_urgent: false,
        address: {
          line1: values.area || "â€”",
          city: patient.city ?? "â€”",
          state: "Karnataka",
          pincode: "560001",
        },
        latitude: 12.9716,
        longitude: 77.5946,
        special_instructions: values.notes || undefined,
      });

      toast.success(`Booking ${created.booking_ref ?? created.id} requested`);
      setOpen(false);
      await refetchBookings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const isEmpty = care.all.length === 0;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Booking journey</div>
            <div className="text-[12.5px] text-muted-foreground">
              Visits grouped by care stage â€” alerts, what's happening now, what's coming next, and what has recently completed.
            </div>
          </div>
          <WorkflowActionButton action="consumer.create_booking" icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setOpen(true)}>
            New booking
          </WorkflowActionButton>
        </div>

        {isEmpty ? (
          <Card><EmptyState icon={CalendarCheck} title="No bookings yet" description="Create your first booking to begin the care journey." /></Card>
        ) : (
          <>
            {care.escalated.length > 0 && (
              <RuntimeBoundary label="Care alerts">
                <JourneySection
                  title={<span className="flex items-center gap-2 text-rose-700"><AlertTriangle className="h-4 w-4" /> Needs review</span>}
                  rows={care.escalated} tone="rose"
                />
              </RuntimeBoundary>
            )}
            <RuntimeBoundary label="In care now">
              <JourneySection
                title={<span className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-emerald-600" /> In care now</span>}
                rows={care.inCare} tone="emerald"
                emptyHint="No visits are currently underway."
              />
            </RuntimeBoundary>
            <RuntimeBoundary label="Upcoming">
              <JourneySection
                title={<span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Upcoming</span>}
                rows={care.upcoming} tone="primary"
                emptyHint="No upcoming visits scheduled."
              />
            </RuntimeBoundary>
            <RuntimeBoundary label="Recently completed">
              <JourneySection
                title={<span className="flex items-center gap-2"><HistoryIcon className="h-4 w-4 text-muted-foreground" /> Recently completed</span>}
                rows={care.completed.slice(0, 8)} tone="muted"
                emptyHint="Completed visits will appear here."
              />
            </RuntimeBoundary>
          </>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Request a new booking" size="xl">
        <SchemaForm
          schema={liveSchema}
          submitLabel={submitting ? "Requestingâ€¦" : "Request booking"}
          onSubmit={onCreate}
        />
      </Modal>
    </>
  );
}

function JourneySection({
  title, rows, tone, emptyHint,
}: {
  title: ReactNode;
  rows: ReturnType<typeof useBookings>;
  tone: "primary" | "emerald" | "muted" | "rose";
  emptyHint?: string;
}) {
  const rail =
    tone === "emerald" ? "bg-emerald-500"
      : tone === "primary" ? "bg-primary"
        : tone === "rose" ? "bg-rose-500"
          : "bg-muted-foreground/40";

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-[11px] text-muted-foreground">{rows.length}</span>
        </div>
      }
      padded={false}
    >
      {rows.length === 0
        ? <div className="p-5"><EmptyState icon={CalendarCheck} title="Nothing here yet" description={emptyHint} /></div>
        : rows.map(b => {
          const state = bindStatus("booking", b.rawStatus);
          return (
            <Link
              key={b.id}
              to="/consumer/bookings/$bookingId"
              params={{ bookingId: b.id }}
              className="flex items-stretch border-b border-border last:border-0 hover:bg-muted/30"
            >
              <span className={`w-1 ${rail}`} aria-hidden />
              <div className="flex items-center gap-3 flex-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">
                    {b.patientName} Â· {b.service}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate">
                    #{b.id} Â· {b.area ?? "â€”"}{b.startedAt ? ` Â· ${b.startedAt}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge workflow="booking" state={state} />
                  <SLAIndicator workflow="booking" state={state} enteredAt={parseEnteredAt(b.startedAt)} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          );
        })}
    </Card>
  );
}
