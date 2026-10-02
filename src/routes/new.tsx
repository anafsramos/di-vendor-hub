import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createRequest, routing, useStore, fmt, type VendorRequest } from "@/lib/store";
import { PageHeader, Pill } from "@/components/ui-bits";
import { RequestForm } from "@/components/request-form";
import { ReasonsList } from "@/components/reasons-list";

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

function NewRequest() {
  const { add } = useStore();
  const [result, setResult] = useState<VendorRequest | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (result) return <Confirmation req={result} onReset={() => { setResult(null); setFormKey((k) => k + 1); }} />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New vendor request" sub="Tell us what you need once. We'll figure out who needs to review it and handle the rest." />
      <RequestForm key={formKey} submitLabel="Submit request" onSubmit={(input) => {
        const req = createRequest(input);
        add(req);
        setResult(req);
        window.scrollTo({ top: 0 });
      }} />
    </div>
  );
}

function Confirmation({ req, onReset }: { req: VendorRequest; onReset: () => void }) {
  const { reasons, reviews, fast } = routing(req);
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Pill tone={fast ? "success" : "accent"}>{fast ? "Fast path" : "Submitted"}</Pill>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{req.vendor} is on its way.</h1>
      <p className="mt-2 text-muted-foreground">
        {fast ? "Operations will handle this directly — no further reviews needed." : `Operations is coordinating ${reviews.length} review${reviews.length > 1 ? "s" : ""}. You don't need to do anything else.`}
      </p>
      <div className="mt-10"><ReasonsList reasons={reasons} /></div>
      <p className="mt-6 text-xs text-muted-foreground">Routing rules are illustrative (material spend ≥ {fmt(25000)}) and will be finalized with Finance, Compliance, and Legal.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">View active requests</Link>
        <Link to="/requests/$id/edit" params={{ id: req.id }} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">Edit request</Link>
        <button onClick={onReset} className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">Submit another</button>
      </div>
    </div>
  );
}
