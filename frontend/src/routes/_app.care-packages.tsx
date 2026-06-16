import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/shared/Card";
import { StatusChip } from "@/components/shared/StatusChip";
import { Modal } from "@/components/shared/Modal";
import { CARE_PACKAGES } from "@/lib/mock-data";
import { Copy, History, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/care-packages")({ component: CarePackagesPage });

function CarePackagesPage() {
  const [editor, setEditor] = useState<typeof CARE_PACKAGES[number] | null>(null);
  const [history, setHistory] = useState(false);
  const [create, setCreate] = useState(false);

  return (
    <div className="space-y-6">
      <Card title="Care Packages" action={<button onClick={() => setCreate(true)} className="px-3 py-1.5 text-[12px] rounded-md bg-primary text-white inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> New Package</button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CARE_PACKAGES.map(p => (
            <div key={p.id} className="p-4 rounded-lg border border-border hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{p.code} · v{p.version}</div>
                </div>
                <StatusChip tone={p.active ? "success" : "muted"} label={p.active ? "Active" : "Inactive"} dot />
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">{p.target}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
                <Stat l="Visits" v={p.visits} />
                <Stat l="Days" v={p.days} />
                <Stat l="Tier" v={p.tier} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-[15px] font-semibold">{p.price}</div>
                <div className="flex gap-1">
                  <button onClick={() => setEditor(p)} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Edit2 className="h-4 w-4 text-muted-foreground" /></button>
                  <button className="h-8 w-8 grid place-items-center rounded hover:bg-secondary" title="Clone"><Copy className="h-4 w-4 text-muted-foreground" /></button>
                  <button onClick={() => setHistory(true)} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><History className="h-4 w-4 text-muted-foreground" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={!!editor} onClose={() => setEditor(null)} title={`Edit ${editor?.name ?? ""}`} size="xl"
        footer={<><button onClick={() => setEditor(null)} className="px-4 py-2 text-[13px] rounded-md border border-border">Cancel</button><button onClick={() => setEditor(null)} className="px-4 py-2 text-[13px] rounded-md bg-primary text-white">Save Package</button></>}>
        {editor && (
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <Field label="Package Name" defaultValue={editor.name} />
            <Field label="Package Code" defaultValue={editor.code} />
            <Field label="Tier" select options={["tier1","tier2","tier3","tier4","tier5"]} defaultValue={editor.tier} />
            <Field label="Visits" defaultValue={String(editor.visits)} />
            <Field label="Cycle Duration (days)" defaultValue={String(editor.days)} />
            <Field label="Price" defaultValue={editor.price} />
            <Field label="Target Condition" full defaultValue={editor.target} />
            <Field label="Linked Services" full placeholder="IV_INFUSION, WOUND_DRESSING…" />
            <Field label="Clinical Rule Set" select options={["Default Vitals","Cardiac Escalation","Red Flag Symptoms"]} />
            <Field label="Workflow Template" select options={["Daily check-in","Weekly review","Custom"]} />
          </div>
        )}
      </Modal>

      <Modal open={history} onClose={() => setHistory(false)} title="Version History" size="md"
        footer={<button onClick={() => setHistory(false)} className="px-4 py-2 text-[13px] rounded-md border border-border">Close</button>}>
        <ul className="space-y-2">
          {[4,3,2,1].map(v => (
            <li key={v} className="p-3 rounded border border-border flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium">v{v}.0</div>
                <div className="text-[11px] text-muted-foreground">Published 2026-04-{10+v} by admin@nurseconnect.in</div>
              </div>
              <button onClick={() => { setHistory(false); toast.success(`Restored v${v}.0`); }} className="text-[12px] text-primary">Restore</button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal open={create} onClose={() => setCreate(false)} title="Create New Care Package" size="xl"
        footer={<><button onClick={() => setCreate(false)} className="px-4 py-2 text-[13px] rounded-md border border-border">Cancel</button><button onClick={() => { setCreate(false); toast.success("Care package created"); }} className="px-4 py-2 text-[13px] rounded-md bg-primary text-white">Create</button></>}>
        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <Field label="Package Name" placeholder="e.g. Cardiac Recovery" />
          <Field label="Package Code" placeholder="CARDIAC_RECOVERY" />
          <Field label="Tier" select options={["tier1","tier2","tier3","tier4","tier5"]} />
          <Field label="Visits" placeholder="14" />
          <Field label="Cycle Duration (days)" placeholder="30" />
          <Field label="Price" placeholder="₹18,500" />
          <Field label="Target Condition" full placeholder="Post cardiac procedure" />
          <Field label="City Eligibility" full placeholder="Bangalore, Mumbai, Delhi NCR" />
          <Field label="Linked Services" full placeholder="IV_INFUSION, WOUND_DRESSING…" />
          <Field label="Clinical Rule Set" select options={["Default Vitals","Cardiac Escalation","Red Flag Symptoms"]} />
        </div>
      </Modal>
    </div>
  );
}

function Stat({ l, v }: { l: string; v: any }) {
  return <div className="px-2 py-1.5 rounded bg-secondary"><div className="font-semibold">{v}</div><div className="text-[10px] text-muted-foreground">{l}</div></div>;
}
function Field({ label, full, select, options, defaultValue, placeholder }: any) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[12px] font-medium">{label}</label>
      {select
        ? <select defaultValue={defaultValue} className="mt-1.5 w-full px-3 py-2 rounded-md border border-border">{options.map((o: string) => <option key={o}>{o}</option>)}</select>
        : <input defaultValue={defaultValue} placeholder={placeholder} className="mt-1.5 w-full px-3 py-2 rounded-md border border-border" />
      }
    </div>
  );
}
