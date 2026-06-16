import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/shared/Card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useIncidents, useBookings } from "@/lib/domain";
import { bindStatus } from "@/lib/workflow-bind";
import { Bell, ChevronRight, AlertTriangle, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/_app/consumer/notifications")({
  component: ConsumerNotifications,
  head: () => ({ meta: [{ title: "Notifications — NurseConnect" }] }),
});

function ConsumerNotifications() {
  const incidents = useIncidents().slice(0, 4);
  const bookings = useBookings();

  return (
    <div className="space-y-6">

      {/* Care alerts */}
      <Card
        title={<span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" /> Care alerts</span>}
        padded={false}
      >
        {incidents.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Bell} title="No active alerts" description="Clinical alerts for your patients will appear here." />
          </div>
        ) : (
          incidents.map(i => (
            <Link
              key={i.id}
              to="/consumer/bookings"
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium truncate">{i.title}</div>
                <div className="text-[11.5px] text-muted-foreground truncate">
                  {i.id} · reporter {i.reporter}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SeverityBadge severity={i.severity} />
                <StatusBadge workflow="incident" state={bindStatus("incident", i.rawStatus)} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </Card>

      {/* Booking updates */}
      <Card
        title={<span className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> Booking updates</span>}
        padded={false}
      >
        {bookings.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={CalendarCheck} title="No booking updates" description="Updates for your bookings will appear here." />
          </div>
        ) : (
          bookings.map(b => (
            <Link
              key={b.id}
              to="/consumer/bookings/$bookingId"
              params={{ bookingId: b.id }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium truncate">
                  #{b.id} — {b.service}
                </div>
                <div className="text-[11.5px] text-muted-foreground truncate">
                  {b.patientName} · {b.area}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge workflow="booking" state={bindStatus("booking", b.rawStatus)} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))
        )}
      </Card>

    </div>
  );
}