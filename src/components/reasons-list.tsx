import { GUARDRAILS, RULES_NOTE, uniqueReviews, type Reason } from "@/lib/store";

export function ReasonsList({ reasons }: { reasons: Reason[] }) {
  return (
    <div className="space-y-3">
      {uniqueReviews(reasons).map((rv) => (
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
  );
}

export function AutoApprovedPanel() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="font-medium">Auto-approved</div>
      <p className="mt-1 text-sm text-muted-foreground">Meets every guardrail, so no review or sign-off is needed:</p>
      <ul className="mt-2 space-y-1">
        {GUARDRAILS.map((g) => <li key={g} className="text-sm text-muted-foreground">— {g}</li>)}
      </ul>
    </div>
  );
}

export function RulesNote({ className }: { className?: string }) {
  return <p className={className ?? "mt-6 text-xs text-muted-foreground"}>{RULES_NOTE}</p>;
}
