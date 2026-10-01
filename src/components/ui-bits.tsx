import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "warn" | "danger" | "success";
const tones: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
  warn: "bg-warning/12 text-warning",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/12 text-success",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{sub}</p>
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "danger" | "warn" | undefined }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular", tone === "danger" && "text-destructive", tone === "warn" && "text-warning")}>{value}</div>
    </div>
  );
}
