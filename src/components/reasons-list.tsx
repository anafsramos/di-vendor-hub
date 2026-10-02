import { uniqueReviews, type Reason } from "@/lib/store";

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
