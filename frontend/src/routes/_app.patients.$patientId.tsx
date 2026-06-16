import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Card } from "@/components/shared/Card";
import { StatusChip, statusToneFor } from "@/components/shared/StatusChip";
import { Timeline } from "@/components/shared/Timeline";
import { PATIENTS, CONSENTS, CLINICAL_CASES } from "@/lib/mock-data";
import { ArrowLeft, Phone, MapPin, Heart, FileText, Wallet, Users, AlertOctagon, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/patients/$patientId")({ component: PatientProfile });

function PatientProfile() {
  const { patientId } = useParams({ from: "/_app/patients/$patientId" });
  const p = PATIENTS.find(x => x.id === patientId) ?? PATIENTS[0];
  const consents = CONSENTS.filter(c => c.patient === p.name);
  const escalations = CLINICAL_CASES.filter(c => c.patient === p.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/users/patients" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Patients
        </Link>
        <div className="flex gap-2">
          <button onClick={() => toast.success("Care plan updated")} className="px-3 py-1.5 text-[12.5px] rounded-md border border-border hover:bg-secondary">Edit Plan</button>
          <button onClick={() => toast.message("Booking flow opened")} className="px-3 py-1.5 text-[12.5px] rounded-md bg-primary text-white">New Booking</button>
        </div>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-purple grid place-items-center text-white text-[18px] font-semibold">
            {p.name.split(" ").map(w => w[0]).slice(0,2).join("")}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[18px] font-semibold">{p.name}</div>
              <StatusChip tone={statusToneFor(p.status)} label={p.status} dot />
              {p.bpl && <StatusChip tone="purple" label="BPL" dot />}
            </div>
            <div className="text-[12.5px] text-muted-foreground mt-0.5">{p.id} · {p.age} yrs · {p.gender === "M" ? "Male" : "Female"}</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{p.phone}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{p.city}</span>
              <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />{p.plan}</span>
              <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Spent {p.spent}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Vitals (last 7 days)" className="lg:col-span-2">
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-muted-foreground text-left"><th className="py-2">Date</th><th>BP</th><th>HR</th><th>SpO₂</th><th>Temp</th><th>Glucose</th></tr></thead>
            <tbody>
              {[
                ["2026-05-07","132/82","78","97%","98.6","118"],
                ["2026-05-06","138/86","82","96%","98.8","124"],
                ["2026-05-05","128/80","76","98%","98.4","112"],
                ["2026-05-04","142/90","88","94%","99.1","138"],
                ["2026-05-03","134/84","80","97%","98.7","116"],
              ].map(r => <tr key={r[0]} className="border-t border-border"><td className="py-2">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td></tr>)}
            </tbody>
          </table>
        </Card>

        <Card title="Assigned Nurses">
          <ul className="space-y-3">
            {[
              { name: "Priya Sharma", role: "Primary RN", since: "2026-04-12" },
              { name: "Asha Nair", role: "Backup", since: "2026-04-22" },
            ].map(n => (
              <li key={n.name} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary grid place-items-center text-[11px] font-semibold">{n.name.split(" ").map(w=>w[0]).join("")}</div>
                <div className="text-[12.5px]"><div className="font-medium">{n.name}</div><div className="text-[11px] text-muted-foreground">{n.role} · since {n.since}</div></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Booking History">
          <ul className="divide-y divide-border -my-2 text-[12.5px]">
            {[
              { id: "B0042", svc: "Geriatric Care", date: p.lastVisit, amount: "₹2,400" },
              { id: "B0028", svc: "IV Therapy", date: "2026-04-30", amount: "₹1,800" },
              { id: "B0014", svc: "Wound Dressing", date: "2026-04-22", amount: "₹1,200" },
            ].map(b => (
              <li key={b.id} className="py-2.5 flex items-center justify-between">
                <div><div className="font-mono text-[11.5px] text-muted-foreground">{b.id}</div><div className="font-medium">{b.svc}</div></div>
                <div className="text-right"><div className="font-medium">{b.amount}</div><div className="text-[11px] text-muted-foreground">{b.date}</div></div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Medications">
          <ul className="space-y-2 text-[12.5px]">
            {[
              { d: "Metformin 500mg", f: "Twice daily" },
              { d: "Amlodipine 5mg", f: "Once daily — morning" },
              { d: "Atorvastatin 10mg", f: "Once daily — night" },
            ].map(m => (
              <li key={m.d} className="flex items-center justify-between p-2.5 rounded border border-border">
                <span className="font-medium">{m.d}</span>
                <span className="text-muted-foreground">{m.f}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Escalation History">
          {escalations.length ? (
            <ul className="space-y-2">
              {escalations.map(e => (
                <li key={e.id} className="p-3 rounded border border-border">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[13px]">{e.issue}</div>
                    <StatusChip tone={e.severity === "critical" ? "danger" : "warning"} label={e.severity} dot />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Raised {e.raised} · by {e.nurse}</div>
                </li>
              ))}
            </ul>
          ) : <div className="text-[12.5px] text-muted-foreground inline-flex items-center gap-2"><AlertOctagon className="h-4 w-4" /> No escalations on record.</div>}
        </Card>

        <Card title="Consent Records">
          <ul className="divide-y divide-border -my-2">
            {consents.length ? consents.map(c => (
              <li key={c.id} className="py-2.5 flex items-center justify-between text-[12.5px]">
                <div><div className="font-medium">{c.type}</div><div className="text-[11px] text-muted-foreground">{c.version} · signed {c.signedAt}</div></div>
                <StatusChip tone={statusToneFor(c.status)} label={c.status} dot />
              </li>
            )) : <li className="text-[12.5px] text-muted-foreground py-3">No consents linked.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Family Contacts">
          <ul className="space-y-2 text-[12.5px]">
            {[
              { n: "Rohit Verma", r: "Son", p: "+91 98212 33145" },
              { n: "Sneha Verma", r: "Daughter", p: "+91 90011 78222" },
            ].map(f => (
              <li key={f.n} className="flex items-center justify-between p-2.5 rounded border border-border">
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{f.n}</span><span className="text-muted-foreground">({f.r})</span></div>
                <span className="text-muted-foreground">{f.p}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Documents">
          <ul className="space-y-2 text-[12.5px]">
            {["Aadhaar", "Insurance Card", "Discharge Summary", "Consent Form v3.1"].map(d => (
              <li key={d} className="flex items-center justify-between p-2.5 rounded border border-border">
                <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d}</span>
                <button onClick={() => toast.success(`${d} downloaded`)} className="text-primary">Download</button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Notes Timeline" action={<button onClick={() => toast.success("Note saved")} className="text-primary inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Add Note</button>}>
        <Timeline items={[
          { ts: "2026-05-07 09:12", title: "Vitals stable, reduced PRN dose.", meta: "Priya Sharma — Primary RN", tone: "success" },
          { ts: "2026-05-05 14:40", title: "Family briefed on weekly plan.", meta: "Ops Team", tone: "primary" },
          { ts: "2026-05-02 11:00", title: "BPL subsidy approved.", meta: "Finance", tone: "primary" },
          { ts: "2026-04-28 16:25", title: "Onboarded under Geriatric package.", meta: "Admin", tone: "muted" },
        ]} />
      </Card>
    </div>
  );
}
