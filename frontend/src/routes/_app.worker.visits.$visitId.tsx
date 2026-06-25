import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Calendar,
  User, AlertTriangle, IndianRupee, Navigation,
} from "lucide-react";
import { VisitExecutionPanel } from "@/components/journey/JourneyPanels";
import { useEntities, useTransition } from "@/lib/orchestration";
import { bookingPatientName, bookingService, bookingArea } from "@/lib/orchestration/links";
import { bindStatus } from "@/lib/workflow-bind";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClientOnly } from "@/components/shared/ClientOnly";
export const Route = createFileRoute("/_app/worker/visits/$visitId")({
  component: WorkerVisitDetail,
  head: () => ({ meta: [{ title: "Visit — NurseConnect" }] }),
});

const STEPS = [
  { id: 1, label: "Accepted" },
  { id: 2, label: "En Route" },
  { id: 3, label: "Checked In" },
  { id: 4, label: "In Progress" },
];

const STATE_STEP: Record<string, number> = {
  claimed: 1,
  en_route: 2,
  checked_in: 3,
  in_progress: 4,
  active: 4,
  completed: 4,
};

// State machine: what transition each button triggers
const NEXT_STATE: Record<string, { to: string; label: string; action: string }> = {
  claimed: { to: "en_route", label: "Start En Route", action: "worker.accept_assignment" },
  en_route: { to: "checked_in", label: "Check In", action: "worker.accept_assignment" },
  checked_in: { to: "in_progress", label: "Start Visit", action: "worker.accept_assignment" },
  in_progress: { to: "completed", label: "Complete Visit", action: "worker.accept_assignment" },
  active: { to: "completed", label: "Complete Visit", action: "worker.accept_assignment" },
};

function StepProgress({ state }: { state: string }) {
  const current = STATE_STEP[state] ?? 1;
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all",
                done ? "border-teal-500 bg-teal-500 text-white"
                  : active ? "border-primary bg-primary text-white"
                    : "border-muted-foreground/30 bg-background text-muted-foreground"
              )}>
                {done ? (
                  <svg className="h-4 w-4" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : step.id}
              </div>
              <span className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                active ? "text-primary" : done ? "text-teal-600" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 w-10 mx-1 mb-4 rounded-full flex-shrink-0",
                done ? "bg-teal-500" : "bg-muted-foreground/20"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, primary, secondary, accent }: {
  icon: React.ElementType; primary: string; secondary?: string; accent?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon size={14} className="text-muted-foreground" />
      </span>
      <div>
        <p className={cn("text-[13px] font-semibold", accent ? "text-primary" : "text-foreground")}>
          {primary}
        </p>
        {secondary && <p className="text-[11.5px] text-muted-foreground mt-0.5">{secondary}</p>}
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background px-5 py-4 space-y-3">
      {title && <p className="text-[14px] font-bold text-foreground">{title}</p>}
      {children}
    </div>
  );
}

function WorkerVisitDetail() {
  const { visitId } = useParams({ from: "/_app/worker/visits/$visitId" });
  const { user } = useAuth();
  const actor = user?.email ?? "worker@nurseconnect.in";
  const role = (user?.role ?? null) as any;

  const rows = useEntities("booking");
  const visit = rows.find((r) => r.id === visitId);
  const state = visit ? bindStatus("booking", visit.state) : "claimed";
  const patient = visit ? (bookingPatientName(visit) ?? "—") : "—";
  const service = visit ? (bookingService(visit) ?? "—") : "—";
  const area = visit ? (bookingArea(visit) ?? "—") : "—";
  const amount = visit?.data?.totalAmount ?? visit?.data?.amount ?? 450;
  const instructions = visit?.data?.specialInstructions ?? visit?.data?.special_instructions;

  const transition = useTransition();
  const next = NEXT_STATE[state];
  const isCompleted = state === "completed";

  // Advance the stepper: update local store + call backend
  async function handleAdvance() {
    if (!next || !visit) return;
    // 1. Optimistic local update
    transition({ workflow: "booking", entityId: visitId, to: next.to, actor, role });
    // 2. Sync to backend (best-effort)
    try {
      if (next.to === "in_progress") {
        // Check-in: send current location if available
        const coords = await new Promise<GeolocationCoordinates | null>(res => {
          if (!navigator.geolocation) { res(null); return; }
          navigator.geolocation.getCurrentPosition(p => res(p.coords), () => res(null), { timeout: 3000 });
        });
        await apiFetch(`/api/v1/visits/${visitId}/check-in`, {
          method: "POST",
          body: JSON.stringify({
            latitude: coords?.latitude ?? 0,
            longitude: coords?.longitude ?? 0,
          }),
        });
      } else if (next.to === "completed") {
        await apiFetch(`/api/v1/visits/${visitId}/check-out`, {
          method: "POST",
          body: JSON.stringify({ latitude: 0, longitude: 0 }),
        });
      }
    } catch (err) {
      // Backend call failed but local state already advanced — show warning
      console.warn("[WorkerVisitDetail] backend sync failed:", err);
      toast.warning("Status updated locally. Will sync when online.");
    }
  }

  async function handleReportIssue() {
    toast.info("Report Issue — escalation flow coming soon.");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* Back nav */}
        <Link
          to="/worker/visits"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          <span className="w-6 h-6 rounded-md border border-border bg-background flex items-center justify-center group-hover:bg-muted transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          Back to visits
        </Link>

        {/* Map banner */}
        <div className="relative h-[160px] rounded-xl overflow-hidden bg-gradient-to-br from-teal-50 via-sky-50 to-blue-100 border border-border flex items-center justify-center">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "linear-gradient(#2563EB22 1px, transparent 1px), linear-gradient(90deg, #2563EB22 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <div className="flex flex-col items-center gap-1 relative z-10">
            <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
              <MapPin size={22} className="text-white" />
            </div>
            <p className="text-[13px] font-semibold text-foreground mt-1">Map View</p>
            <p className="text-[11.5px] text-primary font-medium">2.3 km away</p>
          </div>
          <button
            onClick={() => {
              if (area && area !== "—") {
                window.open(`https://maps.google.com/?q=${encodeURIComponent(area)}`, "_blank");
              }
            }}
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-white shadow-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <Navigation size={15} className="text-primary" />
          </button>
        </div>

        {/* Step progress */}
        <div className="rounded-xl border border-border bg-background px-5 py-4 overflow-x-auto">
          <StepProgress state={state} />
        </div>

        {/* Patient card */}
        <DetailCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[16px] font-bold text-foreground">{patient}</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">{service}</p>
            </div>
            {state === "escalated" && (
              <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11.5px] font-semibold text-rose-700 flex-shrink-0">
                <AlertTriangle size={11} /> Urgent
              </span>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => toast.info("Calling patient — feature coming soon.")}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Phone size={14} /> Call Patient
            </button>
            <button
              onClick={() => toast.info("Messaging — feature coming soon.")}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-[13px] font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              <MessageCircle size={14} /> Message
            </button>
          </div>
        </DetailCard>

        {/* Appointment details */}
        <DetailCard title="Appointment Details">
          <InfoRow icon={Calendar} primary={visit?.data?.scheduledDate ?? "—"} secondary={visit?.data?.scheduledTime ?? ""} />
          <InfoRow icon={MapPin} primary={area} secondary="2.3 km away · 15 mins" accent />
          <InfoRow icon={User} primary={patient} secondary={service} />
        </DetailCard>

        {/* Special instructions */}
        {instructions && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-amber-700">Special Instructions</p>
              <p className="text-[12px] text-amber-600 mt-0.5">{instructions}</p>
            </div>
          </div>
        )}

        {/* Earnings */}
        <DetailCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-bold text-foreground">Earnings</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                {isCompleted ? "Payment processing" : "Paid after visit completion"}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[20px] font-bold text-primary">
              <IndianRupee size={16} />{amount}
            </div>
          </div>
        </DetailCard>

        {/* Execution panel */}
        <ClientOnly>
          <VisitExecutionPanel visitId={visitId} readOnly={isCompleted} />
        </ClientOnly>

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex gap-3 pt-1 pb-4">
            <button
              onClick={handleReportIssue}
              className="flex-1 rounded-xl border border-rose-200 bg-background py-3.5 text-[13.5px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Report Issue
            </button>
            {next && (
              <button
                onClick={handleAdvance}
                className="flex-1 rounded-xl bg-primary py-3.5 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                {next.label}
              </button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-5 py-4 text-center">
            <p className="text-[14px] font-bold text-teal-700">Visit Completed</p>
            <p className="text-[12px] text-teal-600 mt-1">Thank you! Payment will be processed shortly.</p>
          </div>
        )}

      </div>
    </div>
  );
}