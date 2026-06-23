import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, HeartPulse, MapPin, Clock, IndianRupee,
  CheckCircle2, AlertCircle, XCircle, Ban,
  ClipboardList, ArrowRight,
} from "lucide-react";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SLAIndicator } from "@/components/shared/SLAIndicator";
import { EmptyState } from "@/components/shared/EmptyState";
import { RuntimeBoundary } from "@/components/shared/RuntimeBoundary";
import { useEntity, useEntityHistory } from "@/lib/orchestration";
import { bindStatus, parseEnteredAt } from "@/lib/workflow-bind";
import {
  bookingService, bookingPatientName, bookingArea,
  bookingStartedAt, bookingDuration, bookingNurseName,
} from "@/lib/orchestration/links";

export const Route = createFileRoute("/_app/bookings/$bookingId")({
  component: AdminBookingDetail,
  head: () => ({ meta: [{ title: "Booking — NurseConnect" }] }),
});
type PaymentStatus = "paid" | "pending" | "failed" | "refunded" | "processing";

function derivePaymentStatus(bookingState: string): PaymentStatus {
  switch (bookingState) {
    case "completed": return "paid";
    case "active": case "in_progress": return "processing";
    case "pending": case "claimed": return "pending";
    case "cancelled": return "refunded";
    case "escalated": return "failed";
    default: return "pending";
  }
}

function deriveAmount(service: string | undefined): number {
  const s = (service ?? "").toLowerCase();
  if (s.includes("live-in") || s.includes("live in")) return 8500;
  if (s.includes("post") || s.includes("surgery")) return 4200;
  if (s.includes("geriatric") || s.includes("elderly")) return 3600;
  if (s.includes("physio")) return 2800;
  if (s.includes("diabetes") || s.includes("diabetic")) return 2200;
  if (s.includes("wound")) return 1800;
  if (s.includes("blood") || s.includes("bp")) return 1400;
  return 2400;
}

function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const PAYMENT_CONFIG: Record<PaymentStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  classes: string;
  description: string;
}> = {
  paid: { label: "Paid", icon: CheckCircle2, classes: "text-emerald-700 bg-emerald-50 border-emerald-200", description: "Payment settled — visit completed successfully." },
  processing: { label: "Processing", icon: Clock, classes: "text-blue-700 bg-blue-50 border-blue-200", description: "Visit is in progress — payment will settle on completion." },
  pending: { label: "Pending", icon: Clock, classes: "text-amber-700 bg-amber-50 border-amber-200", description: "Booking confirmed — payment due on visit completion." },
  refunded: { label: "Refunded", icon: XCircle, classes: "text-muted-foreground bg-muted border-border", description: "Booking cancelled — refund credited within 5–7 working days." },
  failed: { label: "Action needed", icon: AlertCircle, classes: "text-rose-700 bg-rose-50 border-rose-200", description: "Payment issue detected — care team notified." },
};

const TIMELINE_LABELS: Record<string, string> = {
  "entity.created": "Booking created",
  "workflow.transitioned": "Status updated",
  "entity.claimed": "Nurse assigned",
  "entity.released": "Assignment released",
  "entity.escalated": "Escalated for review",
  "entity.note_added": "Note added",
  "entity.cancelled": "Booking cancelled",
  "entity.completed": "Visit completed",
};

function AdminBookingDetail() {
  const { bookingId } = Route.useParams();

  const record = useEntity("booking", bookingId);
  const history = useEntityHistory("booking", bookingId);

  if (!record) {
    return (
      <div className="space-y-4">
        <BackLink />
        <Card title="Booking not found">
          <EmptyState
            title={`#${bookingId} could not be found.`}
            description="It may have been removed or the link is incorrect."
          />
        </Card>
      </div>
    );
  }

  const state = bindStatus("booking", record.state);
  const service = bookingService(record) ?? "Service";
  const patientName = bookingPatientName(record) ?? "—";
  const area = bookingArea(record) ?? "—";
  const started = bookingStartedAt(record) ?? "—";
  const duration = bookingDuration(record) ?? "—";
  const nurse = bookingNurseName(record) ?? "Unassigned";

  const payStatus = derivePaymentStatus(record.state);
  const amount = deriveAmount(service);
  const payCfg = PAYMENT_CONFIG[payStatus];
  const PayIcon = payCfg.icon;

  return (
    <div className="space-y-5">
      <BackLink />

      <Card padded={false}>
        <div className="flex items-start justify-between gap-4 px-5 py-4 flex-wrap">
          <div>
            <div className="text-[15px] font-semibold">
              #{record.id} · {service}
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">
              {patientName} · {area}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge workflow="booking" state={state} />
            <SLAIndicator
              workflow="booking"
              state={state}
              enteredAt={parseEnteredAt(record.enteredAt)}
            />
          </div>
        </div>

        <div className="border-t border-border px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Detail icon={HeartPulse} label="Service" value={service} />
          <Detail icon={MapPin} label="Location" value={area} />
          <Detail icon={Clock} label="Time" value={started !== "—" ? `${started}${duration !== "—" ? ` · ${duration}` : ""}` : "—"} />
          <Detail icon={IndianRupee} label="Nurse" value={nurse} />
        </div>
      </Card>

      <RuntimeBoundary label="Payment">
        <Card title={<span className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-muted-foreground" /> Payment</span>}>
          <div className={`flex items-start gap-4 rounded-lg border px-4 py-3.5 ${payCfg.classes}`}>
            <PayIcon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[13px] font-semibold">{payCfg.label}</div>
                  <div className="text-[12px] opacity-80 mt-0.5">{payCfg.description}</div>
                </div>
                <div className="text-[22px] font-bold tabular-nums shrink-0">{formatINR(amount)}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-current/10 grid grid-cols-3 gap-2 text-[11.5px]">
                <PayLine label="Service fee" value={formatINR(Math.round(amount * 0.85))} />
                <PayLine label="Platform fee" value={formatINR(Math.round(amount * 0.12))} />
                <PayLine label="GST (3%)" value={formatINR(Math.round(amount * 0.03))} />
              </div>
            </div>
          </div>
        </Card>
      </RuntimeBoundary>

      <RuntimeBoundary label="Booking history">
        <Card title="Booking history" padded={false}>
          <div className="px-5 py-4 space-y-0">
            {history.length === 0 ? (
              <TimelineRow label="Entity created" note="Imported from operational seed" ts={record.enteredAt} isLast />
            ) : (
              history.map((entry, i) => (
                <TimelineRow
                  key={entry.id}
                  label={TIMELINE_LABELS[entry.kind ?? ""] ?? entry.kind ?? "State change"}
                  note={entry.notes}
                  ts={entry.ts}
                  isLast={i === history.length - 1}
                />
              ))
            )}
          </div>
        </Card>
      </RuntimeBoundary>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/consumer/bookings" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3.5 w-3.5" /> Back to bookings
    </Link>
  );
}

function Detail({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <div className="text-[10.5px] text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-[12.5px] font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function PayLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="opacity-60">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TimelineRow({ label, note, ts, isLast }: { label: string; note?: string; ts?: string; isLast: boolean }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <div className="flex flex-col items-center shrink-0">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 mt-1 shrink-0" />
        {!isLast && <span className="w-px flex-1 bg-border mt-1 mb-0" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-4"}`}>
        <div className="font-medium">{label}</div>
        {note && <div className="text-[11.5px] text-muted-foreground">{note}</div>}
        {ts && <div className="text-[11px] text-muted-foreground mt-0.5">{formatTs(ts)}</div>}
      </div>
    </div>
  );
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}