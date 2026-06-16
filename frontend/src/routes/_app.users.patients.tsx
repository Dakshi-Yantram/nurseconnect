import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusChip, statusToneFor } from "@/components/shared/StatusChip";
import { Modal } from "@/components/shared/Modal";
import { PATIENTS, type Patient } from "@/lib/mock-data";
import { Eye, Ban, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users/patients")({ component: PatientsPage });

function PatientsPage() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rows = PATIENTS.filter(p => `${p.name} ${p.id} ${p.city}`.toLowerCase().includes(q.toLowerCase()));

  const cols: Column<Patient>[] = [
    { key: "id", header: "Patient ID", cell: r => <span className="font-mono text-[12px]">{r.id}</span> },
    { key: "name", header: "Name", cell: r => (
      <div>
        <div className="font-medium">{r.name}</div>
        <div className="text-[11px] text-muted-foreground">{r.age} yrs · {r.gender === "M" ? "Male" : "Female"}</div>
      </div>
    )},
    { key: "phone", header: "Contact", cell: r => <span className="text-[12px]">{r.phone}</span> },
    { key: "city", header: "City", cell: r => r.city },
    { key: "plan", header: "Care Plan", cell: r => <StatusChip tone="info" label={r.plan} /> },
    { key: "bpl", header: "Subsidy", cell: r => r.bpl ? <StatusChip tone="purple" label="BPL" dot /> : <span className="text-muted-foreground text-[12px]">—</span> },
    { key: "spent", header: "Spent", cell: r => <span className="font-medium">{r.spent}</span> },
    { key: "lastVisit", header: "Last Visit", cell: r => <span className="text-[12px] text-muted-foreground">{r.lastVisit}</span> },
    { key: "status", header: "Status", cell: r => <StatusChip tone={statusToneFor(r.status)} label={r.status} dot /> },
    { key: "actions", header: "", cell: r => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); nav({ to: "/patients/$patientId", params: { patientId: r.id } }); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Eye className="h-4 w-4 text-muted-foreground" /></button>
        <button onClick={(e) => { e.stopPropagation(); toast.warning(`${r.name} suspended`); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Ban className="h-4 w-4 text-muted-foreground" /></button>
        <button onClick={(e) => e.stopPropagation()} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={cols} rows={rows} onSearch={setQ}
        onAdd={() => setOpen(true)} addLabel="Add Patient"
        onRowClick={(r) => nav({ to: "/patients/$patientId", params: { patientId: r.id } })}
      />

      <Modal
        open={open} onClose={() => setOpen(false)}
        title="Add New Patient" description="Register a patient and assign a care plan"
        size="lg"
        footer={<>
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] rounded-md border border-border">Cancel</button>
          <button onClick={() => { setOpen(false); toast.success("Patient registered"); }} className="px-4 py-2 text-[13px] rounded-md bg-primary text-white">Add Patient</button>
        </>}
      >
        <FormSection title="Personal Details">
          <Field label="Full Name" placeholder="e.g. Anjali Verma" />
          <Field label="Age" placeholder="65" />
          <Field label="Gender" select options={["Female","Male","Other"]} />
          <Field label="Mobile" placeholder="+91 XXXXX XXXXX" />
        </FormSection>
        <FormSection title="Address">
          <Field label="Address Line" placeholder="House / Street" full />
          <Field label="City" placeholder="Bangalore" />
          <Field label="Pincode" placeholder="560001" />
        </FormSection>
        <FormSection title="Emergency Contact">
          <Field label="Contact Name" placeholder="Family member" />
          <Field label="Relationship" placeholder="Son / Daughter" />
          <Field label="Phone" placeholder="+91 XXXXX XXXXX" />
        </FormSection>
        <FormSection title="Medical History">
          <Field label="Chronic Conditions" placeholder="Diabetes, Hypertension…" full />
          <Field label="Allergies" placeholder="None" full />
        </FormSection>
        <FormSection title="BPL / Subsidy">
          <Field label="BPL Card Number" placeholder="Enter BPL card number if applicable" full />
        </FormSection>
      </Modal>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-[13px] font-semibold text-foreground mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}
function Field({ label, placeholder, select, options, full }: { label: string; placeholder?: string; select?: boolean; options?: string[]; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[12px] font-medium text-foreground">{label}</label>
      {select ? (
        <select className="mt-1.5 w-full px-3 py-2 text-[13px] rounded-md border border-border bg-card">
          {options?.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 text-[13px] rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40" />
      )}
    </div>
  );
}
