import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { StatusChip, statusToneFor } from "@/components/shared/StatusChip";
import { Modal } from "@/components/shared/Modal";
import { WorkflowModal, FormField, inputCls, textareaCls } from "@/components/shared/WorkflowModals";
import { NURSES, type Nurse } from "@/lib/mock-data";
import { Star, Eye, ShieldOff, MoreHorizontal, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users/nurses")({ component: NursesPage });

const STEPS = ["Personal", "Registration", "Specialty & Experience", "Documents", "Preferences", "Review"];

function NursesPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [step, setStep] = useState(0);
  const [suspendNurse, setSuspendNurse] = useState<Nurse | null>(null);
  const [uploadDoc, setUploadDoc] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [suspendNotes, setSuspendNotes] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const rows = NURSES.filter(n => `${n.name} ${n.specialty} ${n.city}`.toLowerCase().includes(q.toLowerCase()));

  const cols: Column<Nurse>[] = [
    { key: "id", header: "Nurse ID", cell: r => <span className="font-mono text-[12px]">{r.id}</span> },
    { key: "name", header: "Name", cell: r => (
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple grid place-items-center text-white text-[11px] font-semibold">{r.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-[11px] text-muted-foreground">{r.specialty}</div>
        </div>
      </div>
    )},
    { key: "exp", header: "Exp.", cell: r => `${r.experience} yrs` },
    { key: "rating", header: "Rating", cell: r => (
      <span className="inline-flex items-center gap-1 font-medium"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />{r.rating}</span>
    )},
    { key: "visits", header: "Visits", cell: r => r.visits },
    { key: "earnings", header: "Earnings", cell: r => <span className="font-medium">{r.earnings}</span> },
    { key: "city", header: "City", cell: r => r.city },
    { key: "verified", header: "Verified", cell: r => r.verified ? <StatusChip tone="success" label="Verified" /> : <StatusChip tone="warning" label="Pending" /> },
    { key: "status", header: "Status", cell: r => <StatusChip tone={statusToneFor(r.status)} label={r.status} dot /> },
    { key: "actions", header: "", cell: (r) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); nav({ to: "/nurses/$nurseId", params: { nurseId: r.id } }); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Eye className="h-4 w-4 text-muted-foreground" /></button>
        <button onClick={(e) => { e.stopPropagation(); setSuspendNurse(r); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><ShieldOff className="h-4 w-4 text-muted-foreground" /></button>
        <button onClick={(e) => e.stopPropagation()} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={cols} rows={rows} onSearch={setQ}
        onAdd={() => { setAdd(true); setStep(0); }} addLabel="Add Nurse"
        onRowClick={(r) => nav({ to: "/nurses/$nurseId", params: { nurseId: r.id } })}
      />

      <Modal open={add} onClose={() => setAdd(false)} title="Add New Nurse" description={`Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`} size="xl"
        footer={<>
          <button onClick={() => setDraftNotes("Reviewing nurse onboarding draft before saving.")} className="px-3 py-2 text-[13px] rounded-md border border-border mr-auto">Save Draft</button>
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="px-3 py-2 text-[13px] rounded-md border border-border disabled:opacity-50 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 text-[13px] rounded-md bg-primary text-white inline-flex items-center gap-1">Next <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button onClick={() => setSubmitOpen(true)} className="px-4 py-2 text-[13px] rounded-md bg-emerald-600 text-white inline-flex items-center gap-1"><Check className="h-4 w-4" /> Submit for Approval</button>
          )}
        </>}>
        <Stepper step={step} />
        <div className="mt-5">
          {step === 0 && <Grid>
            <F label="Full Name" placeholder="e.g. Priya Sharma" />
            <F label="Date of Birth" type="date" />
            <F label="Gender" select options={["Female","Male","Other"]} />
            <F label="Mobile" placeholder="+91 XXXXX XXXXX" />
            <F label="Email" placeholder="name@email.com" />
            <F label="Aadhaar / PAN" placeholder="ID number" />
            <F label="Address" placeholder="Street, area" full />
            <F label="City" /><F label="Pincode" />
          </Grid>}
          {step === 1 && <Grid>
            <F label="Nursing Council" select options={["KAR","TN","MH","DL","TG","KL"]} />
            <F label="Registration Number" placeholder="Council Reg No." />
            <F label="Registration Issue Date" type="date" />
            <F label="Validity Until" type="date" />
            <F label="Highest Qualification" select options={["BSc Nursing","GNM","MSc Nursing","ANM"]} />
            <F label="Institute" />
            <F label="Year of Passing" />
            <F label="Languages Known" placeholder="English, Hindi, Kannada…" full />
          </Grid>}
          {step === 2 && <Grid>
            <F label="Primary Specialty" select options={["Geriatric","Pediatric","Post-Op","ICU","Wound Care","Palliative","Maternal"]} />
            <F label="Secondary Specialty" select options={["—","Geriatric","Pediatric","Post-Op","ICU","Wound Care"]} />
            <F label="Years of Experience" placeholder="e.g. 6" />
            <F label="Last Employer" />
            <F label="Last Designation" />
            <F label="Reason for Leaving" full />
            <F label="Notable Procedures" placeholder="Tracheostomy care, IV cannulation…" full />
          </Grid>}
          {step === 3 && <div className="space-y-2">
            {["Resume / CV","Nursing License","Degree Certificate","Aadhaar","Police Clearance","Reference Letter"].map(d => (
              <div key={d} className="p-3 rounded border border-border flex items-center justify-between">
                <div className="text-[13px] font-medium">{d}</div>
                <button onClick={() => setUploadDoc(d)} className="text-[12px] px-3 py-1.5 rounded border border-border hover:bg-secondary">Upload</button>
              </div>
            ))}
            <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800">Background verification will start automatically once all documents are uploaded.</div>
          </div>}
          {step === 4 && <Grid>
            <F label="Preferred Cities" placeholder="Bangalore, Mumbai…" full />
            <F label="Preferred Areas" placeholder="Indiranagar, HSR…" full />
            <F label="Shift Preference" select options={["Day","Evening","Night","Any"]} />
            <F label="Hours / Week" placeholder="40" />
            <F label="Emergency Contact Name" /><F label="Relationship" />
            <F label="Emergency Contact Phone" full />
            <F label="Bank Account Holder" /><F label="Account Number" />
            <F label="IFSC" /><F label="Insurance Consent" select options={["Yes","No"]} />
          </Grid>}
          {step === 5 && <div className="space-y-3 text-[13px]">
            <div className="p-4 rounded-md border border-border bg-muted/30">
              <div className="font-semibold">Ready to submit</div>
              <p className="text-[12px] text-muted-foreground mt-1">Application will move to <b>Documents</b> stage of onboarding and trigger automated background checks.</p>
            </div>
            <ul className="text-[12.5px] space-y-1.5">
              <li>• Welcome email will be sent</li>
              <li>• Verifier auto-assigned by region</li>
              <li>• SLA timer starts (48h for documents stage)</li>
            </ul>
          </div>}
        </div>
      </Modal>


      <WorkflowModal open={!!draftNotes} onClose={() => setDraftNotes("")} title="Save Nurse Draft" submitLabel="Save Draft" onSubmit={() => { setDraftNotes(""); toast.success("Draft saved with reviewer notes"); }} disabled={draftNotes.trim().length < 5}>
        <FormField label="Draft Notes"><textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} className={textareaCls} /></FormField>
      </WorkflowModal>
      <WorkflowModal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit Nurse for Approval" submitLabel="Submit for Approval" submitTone="success" onSubmit={() => { setSubmitOpen(false); setAdd(false); setSubmitNotes(""); toast.success("Nurse submitted for approval workflow"); }} disabled={submitNotes.trim().length < 8}>
        <div className="space-y-3"><FormField label="Reviewer Queue"><select className={inputCls}><option>Ops Approval Queue</option><option>Clinical Approval Queue</option></select></FormField><FormField label="Submission Notes"><textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} className={textareaCls} /></FormField></div>
      </WorkflowModal>
      <WorkflowModal open={!!uploadDoc} onClose={() => setUploadDoc(null)} title={`Upload ${uploadDoc ?? "Document"}`} submitLabel="Attach Document" onSubmit={() => { setUploadDoc(null); setUploadNotes(""); toast.success("Document attached and queued for verification"); }} disabled={uploadNotes.trim().length < 4}>
        <div className="space-y-3"><FormField label="File"><input type="file" className={inputCls} /></FormField><FormField label="Upload Notes"><textarea value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} className={textareaCls} /></FormField></div>
      </WorkflowModal>
      <WorkflowModal open={!!suspendNurse} onClose={() => setSuspendNurse(null)} title={`Suspend ${suspendNurse?.name ?? "Nurse"}`} submitLabel="Confirm Suspension" submitTone="warning" onSubmit={() => { const name = suspendNurse?.name; setSuspendNurse(null); setSuspendNotes(""); toast.warning(`${name} suspension workflow completed`); }} disabled={suspendNotes.trim().length < 10}>
        <div className="space-y-3"><FormField label="Suspension Category"><select className={inputCls}><option>Compliance review</option><option>Patient safety</option><option>Document expiry</option></select></FormField><FormField label="Operational Notes"><textarea value={suspendNotes} onChange={e => setSuspendNotes(e.target.value)} className={textareaCls} /></FormField></div>
      </WorkflowModal>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-6 gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="text-center">
          <div className={`mx-auto h-8 w-8 rounded-full grid place-items-center text-[12px] font-semibold ${i <= step ? "bg-primary text-white" : "bg-secondary text-muted-foreground"} ${i === step ? "ring-2 ring-primary/30" : ""}`}>{i + 1}</div>
          <div className="text-[10.5px] mt-1">{s}</div>
        </li>
      ))}
    </ol>
  );
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-3">{children}</div>; }
function F({ label, placeholder, type, select, options, full }: any) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[12px] font-medium">{label}</label>
      {select ? (
        <select className="mt-1.5 w-full px-3 py-2 text-[13px] rounded-md border border-border bg-card">{options?.map((o: string) => <option key={o}>{o}</option>)}</select>
      ) : (
        <input type={type ?? "text"} placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 text-[13px] rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40" />
      )}
    </div>
  );
}
