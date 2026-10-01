import { createFileRoute } from "@tanstack/react-router";
import { fmt, VENDORS, type Vendor } from "@/lib/store";
import { PageHeader, Pill, Stat } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vendors")({
  head: () => ({
    meta: [
      { title: "Vendor Inventory — DI Vendor Hub" },
      { name: "description", content: "Every tool Deerfield Intelligence pays for, with renewals, usage, and duplicates flagged." },
      { property: "og:title", content: "Vendor Inventory — DI Vendor Hub" },
      { property: "og:description", content: "Every tool Deerfield Intelligence pays for, with renewals, usage, and duplicates flagged." },
    ],
  }),
  component: Vendors,
});

const TODAY = new Date("2026-10-01");
const daysUntil = (iso: string) => Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86400000);

function flags(v: Vendor) {
  const f: { label: string; tone: "danger" | "warn" | "accent" }[] = [];
  const d = daysUntil(v.renewal);
  if (d <= 60) f.push({ label: v.autoRenew ? `Auto-renews in ${d}d` : `Renews in ${d}d`, tone: d <= 30 ? "danger" : "warn" });
  if (v.usage === "Unused") f.push({ label: "Unused", tone: "danger" });
  if (v.usage === "Low usage") f.push({ label: "Low usage", tone: "warn" });
  if (VENDORS.some((o) => o !== v && o.category === v.category)) f.push({ label: "Possible duplicate", tone: "accent" });
  return f;
}

function Vendors() {
  const rows = [...VENDORS].sort((a, b) => flags(b).length - flags(a).length || daysUntil(a.renewal) - daysUntil(b.renewal));
  const total = VENDORS.reduce((s, v) => s + v.cost, 0);
  const upcoming = VENDORS.filter((v) => daysUntil(v.renewal) <= 60);
  const atRisk = VENDORS.filter((v) => v.usage === "Unused").reduce((s, v) => s + v.cost, 0);
  const urgent = VENDORS.find((v) => v.autoRenew && daysUntil(v.renewal) <= 30);

  return (
    <>
      <PageHeader title="Vendors" sub="Everything we pay for. Operations watches renewals and usage so nothing auto-renews by accident." />
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Annual spend" value={fmt(total)} />
        <Stat label="Active vendors" value={VENDORS.length} />
        <Stat label="Renewing ≤ 60d" value={upcoming.length} tone={upcoming.length ? "warn" : undefined} />
        <Stat label="Unused spend" value={fmt(atRisk)} tone={atRisk ? "danger" : undefined} />
      </div>

      {urgent && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] px-5 py-4">
          <div className="text-sm">
            <span className="font-medium">{urgent.name}</span> auto-renews in <span className="font-semibold text-destructive">{daysUntil(urgent.renewal)} days</span> for {fmt(urgent.cost)}.
            <span className="text-muted-foreground"> Owner {urgent.owner} has been asked to confirm.</span>
          </div>
          <Pill tone="danger">Action needed</Pill>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              {["Vendor", "Internal owner", "Annual cost", "Renewal", "Usage", "Days to renewal", "Flags"].map((h) => (
                <th key={h} className="px-5 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const d = daysUntil(v.renewal);
              return (
                <tr key={v.name} className="border-b last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium">{v.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{v.category}</div>
                  </td>
                  <td className="px-5 py-4">{v.owner}</td>
                  <td className="px-5 py-4 tabular">{fmt(v.cost)}</td>
                  <td className="px-5 py-4 tabular text-muted-foreground">
                    {new Date(v.renewal).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    {v.autoRenew && <div className="text-xs">auto-renew</div>}
                  </td>
                  <td className="px-5 py-4">
                    <div className={cn(v.usage === "Unused" && "text-destructive", v.usage === "Low usage" && "text-warning")}>{v.usage}</div>
                    <div className="text-xs text-muted-foreground">{v.seats ?? `Last used ${v.lastUsed.toLowerCase()}`}</div>
                  </td>
                  <td className={cn("px-5 py-4 font-mono tabular", d <= 30 ? "font-semibold text-destructive" : d <= 60 && "text-warning")}>{d}d</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">{flags(v).map((f) => <Pill key={f.label} tone={f.tone}>{f.label}</Pill>)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
