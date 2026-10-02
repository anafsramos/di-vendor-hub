import { createFileRoute, Link } from "@tanstack/react-router";
import { fmt, routing, useStore, type VendorRequest } from "@/lib/store";
import { Pill } from "@/components/ui-bits";
import { ReasonsList } from "@/components/reasons-list";
import { QUESTIONS } from "@/components/request-form";

export const Route = createFileRoute("/requests/$id/")({
  head: () => ({
    meta: [
      { title: "Request Details — DI Vendor Hub" },
      { name: "description", content: "Request details, required reviews, owner and status." },
      { property: "og:title", content: "Request Details — DI Vendor Hub" },
      { property: "og:description", content: "Request details, required reviews, owner and status." },
    ],
  }),
  component: Detail,
});

const TERMS = { monthly: "Monthly", annual: "Annual", "multi-year": "Multi-year" };

function tone(r: VendorRequest) {
  if (r.status === "Blocked") return "danger" as const;
  if (r.status === "Fast path" || r.status === "Approved") return "success" as const;
  if (r.daysInStage >= 7) return "warn" as const;
  return "neutral" as const;
}

function Detail() {
  const { id } = Route.useParams();
  const { requests, ready } = useStore();
  const r = requests.find((x) => x.id === id);
  if (!r) return ready ? <p className="text-muted-foreground">Request not found. <Link to="/" className="underline">Back to requests</Link></p> : null;
  const { reasons } = routing(r);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Active requests</Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{r.vendor}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{r.purpose}</p>
        </div>
        <Link to="/requests/$id/edit" params={{ id: r.id }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Edit request</Link>
      </div>

      <div className="mb-10 grid grid-cols-3 gap-4">
        <Box label="Status"><Pill tone={tone(r)}>{r.status}</Pill>{r.note && <div className="mt-1.5 text-xs text-muted-foreground">{r.note}</div>}</Box>
        <Box label="Current owner">{r.owner}</Box>
        <Box label="Days in stage"><span className="font-mono tabular">{r.daysInStage}d</span></Box>
      </div>

      <h2 className="mb-3 text-sm font-medium">Reviews required</h2>
      <ReasonsList reasons={reasons} />

      <h2 className="mt-10 mb-3 text-sm font-medium">Original request</h2>
      <dl className="divide-y rounded-xl border bg-card text-sm">
        <Row k="Requester" v={r.requester} />
        <Row k="Estimated annual cost" v={<span className="tabular">{fmt(r.cost)}</span>} />
        <Row k="Contract term" v={TERMS[r.term]} />
        {QUESTIONS.map(([k, label]) => <Row key={k} k={label} v={r[k] ? "Yes" : "No"} />)}
      </dl>
    </div>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 px-5 py-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="shrink-0 font-medium">{v}</dd>
    </div>
  );
}
