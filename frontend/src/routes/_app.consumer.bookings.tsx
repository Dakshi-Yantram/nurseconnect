import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SLAIndicator } from "@/components/shared/SLAIndicator";
import { Modal } from "@/components/shared/Modal";
import { RuntimeBoundary } from "@/components/shared/RuntimeBoundary";
import { WorkflowActionButton } from "@/components/shared/WorkflowActionButton";
import { SchemaForm } from "@/lib/forms/SchemaForm";
import { BOOKING_REQUEST_SCHEMA } from "@/lib/forms/templates";
import { useOrchestration } from "@/lib/orchestration";
import { bookingPatientName, bookingService, normalizeBookingDraft } from "@/lib/orchestration/links";
import { useAuth } from "@/lib/auth-context";
import { useBookings } from "@/lib/domain";
import { bindStatus, parseEnteredAt } from "@/lib/workflow-bind";
import {
  CalendarCheck, Plus, ChevronRight, Clock, HeartPulse,
  History as HistoryIcon, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_app/consumer/bookings")({
  component: BookingsLayout,
  head: () => ({ meta: [{ title: "Bookings — NurseConnect" }] }),
});

function BookingsLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  if (pathname === "/consumer/bookings") return <ConsumerBookings />;
  return <Outlet />;
}

function ConsumerBookings() {
  const { user } = useAuth();
  const store = useOrchestration();
  const [open, setOpen] = useState(false);

  // ── Use API bookings from DomainContext instead of orchestration store ──
  const bookings = useBookings();
  const care = {
    all:       bookings,
    upcoming:  bookings.filter(b =>
      b.rawStatus === "pending_payment" ||
      b.rawStatus === "pending" ||
      b.rawStatus === "claimed"
    ),
    inCare:    bookings.filter(b =>
      b.rawStatus === "active" ||
      b.rawStatus === "in_progress"
    ),
    completed: bookings.filter(b => b.rawStatus === "completed"),
    escalated: bookings.filter(b => b.rawStatus === "escalated"),
  };

  const onCreate = (values: Record<string, unknown>) => {
    const rec = store.createEntity(
      "booking",
      normalizeBookingDraft({
        values,
        owner: {
          id:   user?.id ?? null,
          role: user?.role ?? null,
          name: user?.name ?? user?.email ?? null,
        },
      }),
      user?.email ?? "consumer@nurseconnect.in",
      user?.role ?? null,
      { notes: "Booking requested" },
    );
    toast.success(`Booking ${rec.id} requested`);
    setOpen(false);
  };

  const isEmpty = care.all.length === 0;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-[16px] font-semibold">Booking journey</div>
            <div className="text-[12.5px] text-muted-foreground">
              Visits grouped by care stage — alerts, what's happening now, what's coming next, and what has recently completed.
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
        <SchemaForm schema={BOOKING_REQUEST_SCHEMA} submitLabel="Request booking" onSubmit={onCreate} />
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
                      {b.patientName} · {b.service}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      #{b.id} · {b.area ?? "—"}{b.startedAt ? ` · ${b.startedAt}` : ""}
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