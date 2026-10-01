import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import { route, uniqueReviews, useStore, fmt, type Reason, type Term, type VendorRequest } from "@/lib/store";
import { PageHeader, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "New Vendor Request — DI Vendor Hub" },
      { name: "description", content: "Tell Operations what you need once. Routing happens automatically." },
      { property: "og:title", content: "New Vendor Request — DI Vendor Hub" },
      { property: "og:description", content: "Tell Operations what you need once. Routing happens automatically." },
    ],
  }),
  component: NewRequest,
});

const schema = z.object({
  vendor: z.string().trim().min(1, "Required").max(100),
  purpose: z.string().trim().min(1, "Required").max(500),
  requester: z.string().trim().min(1, "Required").max(100),
  cost: z.number({ message: "Enter a number" }).min(0).max(100_000_000),
});

type YN = boolean | null;

function NewRequest() {
  const { add } = useStore();
  const [f, setF] = useState({ vendor: "", purpose: "", requester: "", cost: "" });
  const [term, setTerm] = useState<Term>("annual");
  const [q, setQ] = useState<Record<string, YN>>({ newData: null, pii: null, externalAI: null, portco: null });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ vendor: string; reasons: Reason[] } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ ...f, cost: f.cost === "" ? NaN : Number(f.cost.replace(/[$,]/g, "")) });
    const errs: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
    Object.entries(q).forEach(([k, v]) => v === null && (errs[k] = "Choose one"));
    setErrors(errs);
    if (!parsed.success || Object.keys(errs).length) return;
    const input = { ...parsed.data, term, newData: !!q.newData, pii: !!q.pii, externalAI: !!q.externalAI, portco: !!q.portco };
    const reasons = route(input);
    const reviews = uniqueReviews(reasons);
    const fast = reviews.length === 1 && reviews[0] === "Operations";
    const req: VendorRequest = { ...input, id: crypto.randomUUID(), reviews, owner: reviews[fast ? 0 : reviews.length > 1 && reviews[0] === "Operations" ? 1 : 0], status: fast ? "Fast path" : "In review", daysInStage: 0 };
    add(req);
    setResult({ vendor: input.vendor, reasons });
    window.scrollTo({ top: 0 });
  };

  if (result) return <Confirmation {...result} onReset={() => { setResult(null); setF({ vendor: "", purpose: "", requester: "", cost: "" }); setQ({ newData: null, pii: null, externalAI: null, portco: null }); }} />;

  const field = "w-full rounded-lg border bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New vendor request" sub="Tell us what you need once. We'll figure out who needs to review it and handle the rest." />
      <form onSubmit={submit} className="space-y-10">
        <section className="space-y-5">
          <Field label="Vendor / tool name" error={errors.vendor}>
            <input className={field} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} placeholder="e.g. Hebbia" maxLength={100} />
          </Field>
          <Field label="What do you want to use it for?" error={errors.purpose}>
            <textarea className={cn(field, "min-h-24 resize-y")} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} placeholder="A sentence or two is plenty." maxLength={500} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Requester" error={errors.requester}>
              <input className={field} value={f.requester} onChange={(e) => setF({ ...f, requester: e.target.value })} placeholder="Your name" maxLength={100} />
            </Field>
            <Field label="Estimated annual cost" error={errors.cost}>
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
            {[
              ["newData", "Does it involve a new third-party data source?"],
              ["pii", "Will it handle PHI or PII?"],
              ["externalAI", "Will data leave Deerfield's environment or be sent to an external AI model?"],
              ["portco", "Will the tool be deployed to or used by a portfolio company?"],
            ].map(([k, label]) => (
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
          <p className="text-xs text-muted-foreground">No need to pick approvers — routing is automatic.</p>
          <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Submit request</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
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

function Confirmation({ vendor, reasons, onReset }: { vendor: string; reasons: Reason[]; onReset: () => void }) {
  const reviews = uniqueReviews(reasons);
  const fast = reviews.length === 1 && reviews[0] === "Operations";
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Pill tone={fast ? "success" : "accent"}>{fast ? "Fast path" : "Submitted"}</Pill>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{vendor} is on its way.</h1>
      <p className="mt-2 text-muted-foreground">
        {fast ? "Operations will handle this directly — no further reviews needed." : `Operations is coordinating ${reviews.length} review${reviews.length > 1 ? "s" : ""}. You don't need to do anything else.`}
      </p>
      <div className="mt-10 space-y-3">
        {reviews.map((rv) => (
          <div key={rv} className="rounded-xl border bg-card p-5">
            <div className="font-medium">{rv}</div>
            <ul className="mt-2 space-y-1">
              {reasons.filter((r) => r.review === rv).map((r) => (
                <li key={r.why} className="text-sm text-muted-foreground">— {r.why}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Routing rules are illustrative (material spend ≥ {fmt(25000)}) and will be finalized with Finance, Compliance, and Legal.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">View active requests</Link>
        <button onClick={onReset} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">Submit another</button>
      </div>
    </div>
  );
}
