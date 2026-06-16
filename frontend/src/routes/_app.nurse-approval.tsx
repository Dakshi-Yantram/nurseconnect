import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/shared/Card";
import { StatusChip, statusToneFor } from "@/components/shared/StatusChip";
import { WorkflowModal, FormField, inputCls, textareaCls } from "@/components/shared/WorkflowModals";
import { Modal } from "@/components/shared/Modal";
import { Timeline } from "@/components/shared/Timeline";
import { type Application } from "@/lib/mock-data";
import { ONBOARDING_STAGES, makeActivity, seedApplications, stageProgress, stageStatus, type WorkflowApplication } from "@/lib/workflow-state";
import { CheckCircle2, XCircle, FileText, Download, Briefcase, GraduationCap, ShieldCheck, Phone, AlertTriangle, MessageSquarePlus, FilePlus2, ArrowUpRight, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/nurse-approval")({ component: NurseApprovalPage });

type Doc = { key: string; label: string; icon: typeof FileText; status: string; reviewer?: string; timestamp?: string; notes?: string };
const BASE_DOCS: Doc[] = [
  { key: "resume", label: "Resume / CV", icon: FileText, status: "verified", reviewer: "ops@nurseconnect.in", timestamp: "07 May, 09:30" },
  { key: "license", label: "Nursing License", icon: ShieldCheck, status: "verified", reviewer: "compliance@nurseconnect.in", timestamp: "07 May, 10:10" },
  { key: "degree", label: "Degree Certificate", icon: GraduationCap, status: "verified", reviewer: "ops@nurseconnect.in", timestamp: "07 May, 10:35" },
  { key: "background", label: "Background Check", icon: AlertTriangle, status: "in_progress", reviewer: "bg-ops@nurseconnect.in", timestamp: "Pending" },
  { key: "references", label: "Reference Verification", icon: Phone, status: "pending", reviewer: "Unassigned", timestamp: "Pending" },
];

type ModalType = "note" | "docs" | "escalate" | "reject" | "approve" | "doc-review" | null;

function NurseApprovalPage() {
  const [apps, setApps] = useState<WorkflowApplication[]>(() => seedApplications());
  const [selectedId, setSelectedId] = useState(apps[0].id);
  const selected = apps.find(a => a.id === selectedId) ?? apps[0];
  const [modal, setModal] = useState<ModalType>(null);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [note, setNote] = useState("");
  const [docInstructions, setDocInstructions] = useState("");
  const [escalationNotes, setEscalationNotes] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [escalationSeverity, setEscalationSeverity] = useState("");
  const [escalationReviewer, setEscalationReviewer] = useState("");
  const [escalationCompliance, setEscalationCompliance] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [docReviewNotes, setDocReviewNotes] = useState("");
  const [approvalTier, setApprovalTier] = useState("Tier 3");
  const [activationCity, setActivationCity] = useState(selected.city);
  const [docs, setDocs] = useState<Record<string, Doc[]>>(() => Object.fromEntries(apps.map(a => [a.id, BASE_DOCS])));
  const [areaNotes, setAreaNotes] = useState<Record<string, { ts: string; text: string }[]>>({});
  const selectedDocs = docs[selected.id] ?? BASE_DOCS;
  const selectedAreaNotes = areaNotes[selected.id] ?? [];
  const verifiedCount = selectedDocs.filter(d => d.status === "verified").length;

  const updateSelected = (patch: Partial<WorkflowApplication>, activity: ReturnType<typeof makeActivity>) => {
    setApps(prev => prev.map(a => a.id === selected.id ? { ...a, ...patch, history: [activity, ...a.history] } : a));
  };
  const close = () => setModal(null);

  const openDoc = (doc: Doc) => { setActiveDoc(doc); setDocReviewNotes(doc.notes ?? ""); setModal("doc-review"); };

  const handleNote = () => {
    const text = note.trim();
    if (!text) return;
    const ts = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    setAreaNotes(prev => ({ ...prev, [selected.id]: [{ ts, text }, ...(prev[selected.id] ?? [])] }));
    updateSelected({}, makeActivity("note_added", "Internal note added", text, "reviewer@nurseconnect.in", "primary"));
    setNote("");
    close();
    toast.success("Internal note saved");
  };
  const [docChecklist, setDocChecklist] = useState<Record<string, boolean>>({});
  const handleDocumentRequest = () => {
    const text = docInstructions.trim();
    if (!text) return;
    const stage = "Documents Pending";
    const checked = Object.entries(docChecklist).filter(([, v]) => v).map(([k]) => selectedDocs.find(d => d.key === k)?.label).filter(Boolean).join(", ");
    const summary = checked ? `Requested: ${checked}. ${text}` : text;
    updateSelected({ stage, progress: stageProgress(stage), status: stageStatus(stage), awaitingDocuments: true }, makeActivity("document_requested", "Additional documents requested", summary, "ops@nurseconnect.in", "warning"));
    setDocInstructions("");
    setDocChecklist({});
    close();
    toast.success("Document request sent and onboarding state updated");
  };
  const handleEscalation = () => {
    const notes = escalationNotes.trim();
    if (!escalationReason || !escalationSeverity || !escalationReviewer || notes.length < 8) return;
    const summary = `${escalationReason} · ${escalationSeverity} · Assigned to ${escalationReviewer}${escalationCompliance ? " · Compliance concern flagged" : ""}`;
    updateSelected(
      { stage: "Escalated", progress: 92, status: "In Review", escalated: true },
      makeActivity("escalation_triggered", `Escalated: ${escalationReason}`, `${summary}\n\n${notes}`, "ops@nurseconnect.in", "danger"),
    );
    setEscalationNotes("");
    setEscalationReason("");
    setEscalationSeverity("");
    setEscalationReviewer("");
    setEscalationCompliance(false);
    close();
    toast.warning("Escalation submitted and onboarding state updated");
  };
  const handleReject = () => {
    updateSelected({ stage: "Rejected", progress: 100, status: "Rejected" }, makeActivity("rejection_completed", "Application rejected", rejectNotes, "ops@nurseconnect.in", "danger"));
    setRejectNotes(""); close(); toast.error(`${selected.name} rejected with audit trail`);
  };
  const handleApprove = () => {
    updateSelected({ stage: "Activated", progress: 100, status: "Ready", awaitingDocuments: false, escalated: false }, makeActivity("approval_completed", `Approved and activated · ${approvalTier} · ${activationCity}`, "Insurance eligibility and onboarding checklist confirmed.", "ops@nurseconnect.in", "success"));
    close(); toast.success(`${selected.name} approved and availability enabled`);
  };
  const handleDocDecision = (decision: "verified" | "rejected" | "reupload") => {
    if (!activeDoc) return;
    const label = decision === "verified" ? "Document approved" : decision === "rejected" ? "Document rejected" : "Document reupload requested";
    setDocs(prev => ({
      ...prev,
      [selected.id]: selectedDocs.map(d => d.key === activeDoc.key ? { ...d, status: decision === "reupload" ? "pending" : decision, notes: docReviewNotes, reviewer: "reviewer@nurseconnect.in", timestamp: "Now" } : d),
    }));
    updateSelected({}, makeActivity("verification_completed", `${label}: ${activeDoc.label}`, docReviewNotes, "reviewer@nurseconnect.in", decision === "verified" ? "success" : "warning"));
    setDocReviewNotes(""); setActiveDoc(null); close(); toast.success(label);
  };

  const canApprove = useMemo(() => verifiedCount >= 3 && !selected.escalated && selected.stage !== "Rejected", [verifiedCount, selected.escalated, selected.stage]);

  return (
    <div className="grid grid-cols-12 gap-6">
      <Card title={`Applications (${apps.length})`} className="col-span-12 lg:col-span-4" padded={false}>
        <ul className="divide-y divide-border max-h-[640px] overflow-y-auto nc-scroll">
          {apps.map(a => (
            <li key={a.id} onClick={() => setSelectedId(a.id)} className={`p-4 cursor-pointer hover:bg-muted/40 ${selected.id === a.id ? "bg-blue-50/60 border-l-2 border-l-primary" : ""}`}>
              <div className="flex items-center justify-between"><div className="font-medium text-[13px]">{a.name}</div><StatusChip tone={a.escalated ? "danger" : statusToneFor(a.status)} label={a.escalated ? "Escalated" : a.status} /></div>
              <div className="text-[11px] text-muted-foreground mt-0.5">ID: {a.id} · {a.specialty} · {a.experience} yrs</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${a.progress}%` }} /></div>
              <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground"><span>{a.stage}</span><span>{a.progress}%</span></div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="col-span-12 lg:col-span-8 space-y-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple grid place-items-center text-white font-semibold">{selected.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
              <div><div className="text-[16px] font-semibold">{selected.name}</div><div className="text-[12px] text-muted-foreground">{selected.specialty} · {selected.experience} yrs · {selected.city} · Reviewer {selected.reviewer}</div></div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={() => setModal("note")} className="px-3 py-2 text-[12.5px] rounded-md border border-border hover:bg-secondary inline-flex items-center gap-1.5"><MessageSquarePlus className="h-4 w-4" /> Add Note</button>
              <button onClick={() => setModal("docs")} className="px-3 py-2 text-[12.5px] rounded-md border border-border hover:bg-secondary inline-flex items-center gap-1.5"><FilePlus2 className="h-4 w-4" /> Request Docs</button>
              <button onClick={() => setModal("escalate")} className="px-3 py-2 text-[12.5px] rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1.5"><ArrowUpRight className="h-4 w-4" /> Escalate</button>
              <button onClick={() => setModal("reject")} className="px-3.5 py-2 text-[12.5px] rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5"><XCircle className="h-4 w-4" /> Reject</button>
              <button onClick={() => setModal("approve")} className="px-3.5 py-2 text-[12.5px] rounded-md bg-emerald-600 text-white hover:opacity-95 inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Approve & Activate</button>
            </div>
          </div>
        </Card>

        <Card title="Document Verification" action={<span className="text-muted-foreground">{verifiedCount} / {selectedDocs.length} Complete</span>}>
          <ul className="divide-y divide-border -my-3">
            {selectedDocs.map(v => (
              <li key={v.key} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-md bg-secondary grid place-items-center"><v.icon className="h-4 w-4 text-muted-foreground" /></div><div><div className="text-[13px] font-medium">{v.label}</div><div className="text-[11px] text-muted-foreground">Reviewer: {v.reviewer} · {v.timestamp}</div></div></div>
                <div className="flex items-center gap-3"><StatusChip tone={statusToneFor(v.status)} label={v.status.replace("_", " ")} dot /><button onClick={() => openDoc(v)} className="text-[12px] text-primary inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Review</button><button onClick={() => openDoc(v)} className="text-[12px] text-primary inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Preview</button></div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Work History"><ul className="space-y-3"><Work place="Rainbow Children's Hospital" role="Pediatric RN · 2020 – Present" /><Work place="Manipal Hospital" role="RN – Critical Care · 2018 – 2020" /></ul></Card>
          <Card title="Preferred Service Areas"><div className="flex flex-wrap gap-2">{["Indiranagar", "HSR Layout", "Koramangala", "Whitefield", "Marathahalli"].map(a => <StatusChip key={a} tone="info" label={a} />)}</div>{selectedAreaNotes.length > 0 && (<div className="mt-4 space-y-2">{selectedAreaNotes.map((n, i) => (<div key={i} className="p-2.5 rounded-md border border-border bg-muted/30"><div className="text-[10.5px] text-muted-foreground">{n.ts} · reviewer@nurseconnect.in</div><div className="text-[12.5px] mt-0.5 whitespace-pre-wrap">{n.text}</div></div>))}</div>)}<div className="mt-4 text-[12px] text-muted-foreground">Current state: {selected.stage}. Actions update timeline, audit history, and application status.</div></Card>
        </div>
        <Card title="Reviewer History"><Timeline items={selected.history} /></Card>
      </div>

      <Modal open={modal === "note"} onClose={close} title="Add Note" description={`${selected.name} · ${selected.id}`}
        footer={<>
          <button onClick={close} className="px-4 py-2 text-[13px] rounded-md border border-border">Cancel</button>
          <button onClick={handleNote} disabled={note.trim().length === 0} className="px-4 py-2 text-[13px] rounded-md bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
        </>}
      >
        <textarea value={note} onChange={e => setNote(e.target.value)} className={textareaCls} placeholder="Write a note…" autoFocus />
      </Modal>

      <Modal open={modal === "docs"} onClose={close} title="Request Missing Documents" description="Collect missing evidence before notifying applicant"
        footer={<>
          <button onClick={close} className="px-4 py-2 text-[13px] rounded-md border border-border">Cancel</button>
          <button onClick={handleDocumentRequest} disabled={docInstructions.trim().length === 0} className="px-4 py-2 text-[13px] rounded-md bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">Send Request</button>
        </>}
      >
        <div className="space-y-3">
          <FormField label="Missing Document Checklist">
            <div className="space-y-1.5 text-[13px]">
              {selectedDocs.filter(d => d.status !== "verified").map(d => (
                <label key={d.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!docChecklist[d.key]} onChange={e => setDocChecklist(prev => ({ ...prev, [d.key]: e.target.checked }))} /> {d.label}
                </label>
              ))}
            </div>
          </FormField>
          <FormField label="Instructions">
            <textarea value={docInstructions} onChange={e => setDocInstructions(e.target.value)} className={textareaCls} placeholder="Explain what must be uploaded and accepted file types…" autoFocus />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={modal === "escalate"}
        onClose={close}
        title="Escalate Application"
        description="Escalation creates a clinical/compliance queue item"
        footer={
          <>
            <button onClick={close} className="px-3 py-2 text-[12.5px] rounded-md border border-border hover:bg-secondary">Cancel</button>
            <button
              onClick={handleEscalation}
              disabled={!escalationReason || !escalationSeverity || !escalationReviewer || escalationNotes.trim().length < 8}
              className="px-3 py-2 text-[12.5px] rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Submit Escalation
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Escalation Reason">
            <select value={escalationReason} onChange={e => setEscalationReason(e.target.value)} className={inputCls}>
              <option value="">Select reason…</option>
              <option>Clinical credential ambiguity</option>
              <option>Compliance concern</option>
              <option>Background verification discrepancy</option>
              <option>Insurance eligibility concern</option>
            </select>
          </FormField>
          <FormField label="Severity">
            <select value={escalationSeverity} onChange={e => setEscalationSeverity(e.target.value)} className={inputCls}>
              <option value="">Select severity…</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </FormField>
          <FormField label="Assign Reviewer">
            <select value={escalationReviewer} onChange={e => setEscalationReviewer(e.target.value)} className={inputCls}>
              <option value="">Select reviewer…</option>
              <option>Dr. Rahul Khanna</option>
              <option>Dr. Sneha Iyer</option>
              <option>Compliance Head</option>
            </select>
          </FormField>
          <FormField label="Escalation Notes">
            <textarea value={escalationNotes} onChange={e => setEscalationNotes(e.target.value)} className={textareaCls} placeholder="Document the concern and required decision…" autoFocus />
          </FormField>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={escalationCompliance} onChange={e => setEscalationCompliance(e.target.checked)} />
            Flag as compliance concern
          </label>
        </div>
      </Modal>

      <WorkflowModal open={modal === "reject"} onClose={close} title="Reject Nurse Application" submitLabel="Confirm Rejection" submitTone="danger" onSubmit={handleReject} disabled={rejectNotes.trim().length < 10}>
        <div className="space-y-3"><FormField label="Rejection Category"><select className={inputCls}><option>Credential mismatch</option><option>Background check failed</option><option>Insufficient experience</option><option>Policy non-compliance</option></select></FormField><FormField label="Reapply Eligibility"><select className={inputCls}><option>Eligible after 6 months</option><option>Eligible after document correction</option><option>Not eligible</option></select></FormField><FormField label="Reviewer Notes"><textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className={textareaCls} placeholder="Detailed reason for rejection…" /></FormField><div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-[12px] text-rose-800">Notification preview will include category, notes summary, and reapply eligibility.</div></div>
      </WorkflowModal>

      <WorkflowModal open={modal === "approve"} onClose={close} title="Approve & Activate Nurse" description="Final activation requires confirmation of operational readiness" submitLabel="Confirm Activation" submitTone="success" onSubmit={handleApprove} disabled={!canApprove}>
        <div className="space-y-3 text-[13px]"><div className="p-3 rounded-md border border-border bg-muted/30"><div className="font-semibold">Review Summary</div><div className="text-[12px] text-muted-foreground mt-1">{verifiedCount}/{selectedDocs.length} documents complete · Insurance eligibility checked · Background status reviewed</div></div>{!canApprove && <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-[12px] text-amber-800">Resolve escalation or complete minimum verification checks before activation.</div>}<FormField label="Assigned Tier"><select value={approvalTier} onChange={e => setApprovalTier(e.target.value)} className={inputCls}><option>Tier 1</option><option>Tier 2</option><option>Tier 3</option><option>Tier 4</option></select></FormField><FormField label="Activation City"><input value={activationCity} onChange={e => setActivationCity(e.target.value)} className={inputCls} /></FormField><div className="space-y-1.5 text-[12.5px]"><label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Onboarding completion verified</label><label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Nurse availability can be enabled</label><label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Insurance eligibility recorded</label></div></div>
      </WorkflowModal>

      <WorkflowModal open={modal === "doc-review"} onClose={close} title={`Document Review${activeDoc ? ` · ${activeDoc.label}` : ""}`} description="Preview evidence, record notes, then approve or request reupload" submitLabel="Approve Document" submitTone="success" onSubmit={() => handleDocDecision("verified")} disabled={docReviewNotes.trim().length < 4} size="lg">
        <div className="space-y-4"><div className="h-56 rounded-md border border-border bg-muted/30 grid place-items-center text-[13px] text-muted-foreground">Evidence preview · {activeDoc?.label}</div><div className="grid grid-cols-3 gap-3 text-[12.5px]"><Info l="Status" v={activeDoc?.status?.replace("_", " ")} /><Info l="Reviewer" v={activeDoc?.reviewer} /><Info l="Timestamp" v={activeDoc?.timestamp} /></div><FormField label="Verification Notes"><textarea value={docReviewNotes} onChange={e => setDocReviewNotes(e.target.value)} className={textareaCls} placeholder="Record evidence reviewed, issues, or reupload instructions…" /></FormField><div className="flex gap-2"><button onClick={() => handleDocDecision("rejected")} disabled={docReviewNotes.trim().length < 4} className="px-3 py-2 text-[12px] rounded-md border border-rose-200 text-rose-700 disabled:opacity-50">Reject</button><button onClick={() => handleDocDecision("reupload")} disabled={docReviewNotes.trim().length < 4} className="px-3 py-2 text-[12px] rounded-md border border-amber-200 text-amber-700 disabled:opacity-50">Request Reupload</button></div></div>
      </WorkflowModal>
    </div>
  );
}

function Work({ place, role }: { place: string; role: string }) { return <li className="flex items-start gap-3"><Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" /><div><div className="text-[13px] font-medium">{place}</div><div className="text-[11px] text-muted-foreground">{role}</div></div></li>; }
function Info({ l, v }: { l: string; v: unknown }) { return <div><div className="text-[11px] text-muted-foreground">{l}</div><div className="font-medium mt-0.5 capitalize">{String(v ?? "—")}</div></div>; }
