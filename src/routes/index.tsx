import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { fmt, useStore, type VendorRequest } from "@/lib/store";
import { Pill } from "@/components/ui-bits";
import { RulesNote } from "@/components/reasons-list";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Active Requests — DI Vendor Hub" },
      { name: "description", content: "Vendor requests moving through review at Deerfield Intelligence." },
      { property: "og:title", content: "Active Requests — DI Vendor Hub" },
      { property: "og:description", content: "Vendor requests moving through review at Deerfield Intelligence." },
    ],
  }),
  component: Requests,
});

const AGING = 7;

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "danger" | "warn" | undefined }) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-semibold tabular", tone === "danger" && "text-destructive", tone === "warn" && "text-warning")}>{value}</div>
    </div>
  );
}

function statusTone(r: VendorRequest) {
  if (r.status === "Blocked") return "danger" as const;
  if (r.status === "Auto-approved") return "success" as const;
  if (r.daysInStage >= AGING) return "warn" as const;
  return "neutral" as const;
}

function Requests() {
  const { requests } = useStore();
  const navigate = useNavigate();
  const sorted = [...requests].sort((a, b) => {
    const s = (r: VendorRequest) => (r.status === "Blocked" ? 2 : r.status !== "Auto-approved" && r.daysInStage >= AGING ? 1 : 0);
    return s(b) - s(a) || b.daysInStage - a.daysInStage;
  });
  const blocked = requests.filter((r) => r.status === "Blocked").length;
  const aging = requests.filter((r) => r.status !== "Blocked" && r.daysInStage >= AGING).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active requests</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Everything currently moving through review. Operations coordinates — you don't need to chase anyone.</p>
        </div>
        <Link to="/new" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">New request</Link>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="In flight" value={requests.filter((r) => r.status !== "Auto-approved").length} />
        <Stat label="Blocked" value={blocked} tone={blocked ? "danger" : undefined} />
        <Stat label={`Aging ${AGING}d+`} value={aging} tone={aging ? "warn" : undefined} />
        <Stat label="Tracked spend" value={fmt(requests.reduce((s, r) => s + r.cost, 0))} />
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-14 z-10 bg-card">
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              {["Vendor", "Cost", "Reviews", "Owner", "Status", "Days"].map((h) => (
                <th key={h} className={cn("px-4 py-3 font-medium", (h === "Cost" || h === "Days") && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const auto = r.status === "Auto-approved";
              const flagged = r.status === "Blocked" || (!auto && r.daysInStage >= AGING);
              return (
                <tr key={r.id} onClick={() => navigate({ to: "/requests/$id", params: { id: r.id } })} className={cn("cursor-pointer border-b transition last:border-0 hover:bg-secondary/60", r.status === "Blocked" && "bg-destructive/[0.03]")}>
                  <td className={cn("px-4 py-3.5 border-l-2", r.status === "Blocked" ? "border-l-destructive" : !auto && r.daysInStage >= AGING ? "border-l-warning" : "border-l-transparent")}>
                    <Link to="/requests/$id" params={{ id: r.id }} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">{r.vendor}</Link>
                    <div className="mt-0.5 max-w-[16rem] truncate text-xs text-muted-foreground">{r.requester} · {r.note ?? r.purpose}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular">{fmt(r.cost)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">{r.reviews.length ? r.reviews.map((v) => <Pill key={v}>{v}</Pill>) : <span className="text-xs text-muted-foreground">None needed</span>}</div>
                  </td>
                  <td className="px-4 py-3.5">{r.owner ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3.5"><Pill tone={statusTone(r)}>{r.status === "In review" && r.daysInStage >= AGING ? "Aging" : r.status}</Pill></td>
                  <td className={cn("px-4 py-3.5 text-right tabular font-mono", flagged && "font-semibold", r.status === "Blocked" ? "text-destructive" : !auto && r.daysInStage >= AGING && "text-warning")}>{auto ? "—" : `${r.daysInStage}d`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <RulesNote className="px-6 pb-6 pt-1 text-xs text-muted-foreground" />
      </div>
    </div>
  );
}
