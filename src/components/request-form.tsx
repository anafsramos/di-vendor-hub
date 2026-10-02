import { useState, type ReactNode } from "react";
import { z } from "zod";
import type { RequestInput, Term } from "@/lib/store";
import { cn } from "@/lib/utils";

const schema = z.object({
  vendor: z.string().trim().min(1, "Required").max(100),
  purpose: z.string().trim().min(1, "Required").max(500),
  requester: z.string().trim().min(1, "Required").max(100),
  cost: z.number({ message: "Enter a number" }).min(0).max(100_000_000),
});

type YN = boolean | null;
type QKey = "inBudget" | "newData" | "pii" | "externalAI" | "portco";

export const QUESTIONS: [QKey, string][] = [
  ["inBudget", "Is it within an already-approved DI budget?"],
  ["newData", "Does it involve a new third-party data source?"],
  ["pii", "Will it handle PHI or PII?"],
  ["externalAI", "Will data leave Deerfield's environment or be sent to an external AI model?"],
  ["portco", "Will the tool be deployed to or used by a portfolio company?"],
];

export function RequestForm({ initial, submitLabel, onSubmit, footer }: { initial?: RequestInput; submitLabel: string; onSubmit: (input: RequestInput) => void; footer?: ReactNode }) {
  const [f, setF] = useState({
    vendor: initial?.vendor ?? "",
    purpose: initial?.purpose ?? "",
    requester: initial?.requester ?? "",
    cost: initial ? initial.cost.toLocaleString("en-US") : "",
  });
  const [term, setTerm] = useState<Term>(initial?.term ?? "annual");
  const [q, setQ] = useState<Record<QKey, YN>>({
    inBudget: initial?.inBudget ?? null,
    newData: initial?.newData ?? null,
    pii: initial?.pii ?? null,
    externalAI: initial?.externalAI ?? null,
    portco: initial?.portco ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...f, cost: f.cost === "" ? NaN : Number(f.cost.replace(/[$,]/g, "")) });
    const errs: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
    Object.entries(q).forEach(([k, v]) => v === null && (errs[k] = "Choose one"));
    setErrors(errs);
    if (!parsed.success || Object.keys(errs).length) return;
    onSubmit({ ...parsed.data, term, inBudget: !!q.inBudget, newData: !!q.newData, pii: !!q.pii, externalAI: !!q.externalAI, portco: !!q.portco });
  };

  const field = "w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15";

  return (
    <form onSubmit={submit} className="space-y-10">
      <section className="space-y-5">
        <Field label="Vendor / tool name" error={errors["vendor"]}>
          <input className={field} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} placeholder="e.g. Hebbia" maxLength={100} />
        </Field>
        <Field label="What do you want to use it for?" error={errors["purpose"]}>
          <textarea className={cn(field, "min-h-24 resize-y")} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} placeholder="A sentence or two is plenty." maxLength={500} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Requester" error={errors["requester"]}>
            <input className={field} value={f.requester} onChange={(e) => setF({ ...f, requester: e.target.value })} placeholder="Your name" maxLength={100} />
          </Field>
          <Field label="Estimated annual cost" error={errors["cost"]}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input className={cn(field, "pl-7 tabular")} inputMode="numeric" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} placeholder="12,000" />
            </div>
          </Field>
        </div>
        <Field label="Contract term">
          <Segmented value={term} onChange={(v) => setTerm(v as Term)} options={[["monthly", "Monthly"], ["annual", "Annual"], ["multi-year", "Multi-year"]]} />
        </Field>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium">A few quick checks</h2>
        <p className="mb-4 text-sm text-muted-foreground">These determine routing. Best guess is fine.</p>
        <div className="divide-y rounded-xl border bg-card">
          {QUESTIONS.map(([k, label]) => (
            <div key={k} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {label}
                {errors[k] && <div className="mt-1 text-xs text-destructive">{errors[k]}</div>}
              </div>
              <Segmented value={q[k] === null ? "" : q[k] ? "y" : "n"} onChange={(v) => setQ({ ...q, [k]: v === "y" })} options={[["n", "No"], ["y", "Yes"]]} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 border-t pt-6">
        <p className="text-xs text-muted-foreground">{footer ?? "No need to pick approvers — routing is automatic."}</p>
        <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">{submitLabel}</button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border bg-secondary p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={cn("rounded-md px-3.5 py-1.5 text-sm transition", value === v ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {l}
        </button>
      ))}
    </div>
  );
}
