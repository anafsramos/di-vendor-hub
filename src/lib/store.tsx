import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Review = "Finance" | "Compliance" | "Legal";
export type Term = "monthly" | "annual" | "multi-year";

export interface RequestInput {
  vendor: string;
  purpose: string;
  requester: string;
  cost: number;
  term: Term;
  inBudget: boolean;
  newData: boolean;
  pii: boolean;
  externalAI: boolean;
  portco: boolean;
}

export interface Reason {
  review: Review;
  why: string;
}

export interface VendorRequest extends RequestInput {
  id: string;
  reviews: Review[];
  owner: Review | null; // null = auto-approved, no current owner
  status: "In review" | "Blocked" | "Auto-approved" | "Approved";
  daysInStage: number;
  note?: string;
}

// Illustrative thresholds — production values to be agreed with Finance, Compliance and Legal.
export const AUTO_APPROVE_LIMIT = 5000;
export const MATERIAL_SPEND = 25000;
export const RULES_NOTE = "Thresholds and rules are illustrative. Actual production rules would be agreed with Finance, Compliance, and Legal. Operations owns and monitors the rules and exceptions, but does not manually approve routine auto-approved purchases.";

export const GUARDRAILS = [
  `Annual spend under ${"$"}${AUTO_APPROVE_LIMIT.toLocaleString("en-US")}`,
  "Within an already-approved DI budget",
  "Monthly or annual contract (not multi-year)",
  "No new third-party data source",
  "No PHI or PII",
  "No data sent to an external AI model",
  "Not deployed to or used by a portfolio company",
];

export function route(input: RequestInput): Reason[] {
  const r: Reason[] = [];
  if (input.cost >= MATERIAL_SPEND) r.push({ review: "Finance", why: `Annual cost of ${fmt(input.cost)} exceeds the ${fmt(MATERIAL_SPEND)} material-spend threshold.` });
  else if (input.cost >= AUTO_APPROVE_LIMIT) r.push({ review: "Finance", why: `Annual cost of ${fmt(input.cost)} is above the ${fmt(AUTO_APPROVE_LIMIT)} auto-approval limit.` });
  if (!input.inBudget) r.push({ review: "Finance", why: "Not within an already-approved DI budget." });
  if (input.term === "multi-year") {
    r.push({ review: "Finance", why: "Multi-year commitment." });
    r.push({ review: "Legal", why: "Multi-year commitment requires contract review." });
  }
  if (input.newData) r.push({ review: "Compliance", why: "Introduces a new third-party data source." });
  if (input.pii) r.push({ review: "Compliance", why: "Tool will handle PHI or PII." });
  if (input.externalAI) r.push({ review: "Compliance", why: "Data leaves Deerfield's environment or goes to an external AI model." });
  if (input.portco) {
    r.push({ review: "Compliance", why: "Deployed to or used by a portfolio company." });
    r.push({ review: "Legal", why: "Portfolio-company deployment requires contract review." });
  }
  return r;
}

export function uniqueReviews(reasons: Reason[]): Review[] {
  const order: Review[] = ["Finance", "Compliance", "Legal"];
  return order.filter((o) => reasons.some((r) => r.review === o));
}

export const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

function seed(id: string, input: Omit<RequestInput, "inBudget"> & { inBudget?: boolean }, extra: { owner?: Review; status?: VendorRequest["status"]; daysInStage: number; note?: string }): VendorRequest {
  const full: RequestInput = { inBudget: true, ...input };
  const { reviews, owner, auto } = routing(full);
  const { owner: o, status, ...rest } = extra;
  return { ...full, id, reviews, owner: auto ? null : o ?? owner, status: auto ? "Auto-approved" : status ?? "In review", ...rest };
}

const SEED: VendorRequest[] = [
  seed("r1", { vendor: "Hebbia", purpose: "Document search across 10-K and expert call transcripts", requester: "Priya Shah", cost: 85000, term: "annual", newData: true, pii: false, externalAI: true, portco: false }, { owner: "Compliance", status: "Blocked", daysInStage: 12, note: "Awaiting SOC 2 report from vendor" }),
  seed("r2", { vendor: "Modal", purpose: "Serverless GPU for batch inference jobs", requester: "Marcus Lee", cost: 18000, term: "monthly", newData: false, pii: false, externalAI: false, portco: false }, { daysInStage: 3 }),
  seed("r3", { vendor: "Cursor", purpose: "AI code editor seats for the team", requester: "Dana Okafor", cost: 4800, term: "annual", newData: false, pii: false, externalAI: true, portco: false }, { daysInStage: 2 }),
  seed("r4", { vendor: "Abridge", purpose: "Clinical note summarization pilot at a portfolio company", requester: "Priya Shah", cost: 120000, term: "multi-year", newData: false, pii: true, externalAI: true, portco: true }, { owner: "Legal", daysInStage: 9, note: "Redlines with vendor counsel" }),
  seed("r5", { vendor: "Excalidraw+", purpose: "Whiteboarding for architecture reviews", requester: "Tom Reyes", cost: 600, term: "monthly", newData: false, pii: false, externalAI: false, portco: false }, { daysInStage: 0 }),
  seed("r6", { vendor: "Crunchbase Pro", purpose: "Private company data for sourcing models", requester: "Marcus Lee", cost: 32000, term: "annual", newData: true, pii: false, externalAI: false, portco: false }, { daysInStage: 6 }),
];

export function routing(input: RequestInput) {
  const reasons = route(input);
  const reviews = uniqueReviews(reasons);
  const auto = reviews.length === 0;
  const owner: Review | null = reviews[0] ?? null;
  return { reasons, reviews, owner, auto };
}

export function createRequest(input: RequestInput): VendorRequest {
  const { reviews, owner, auto } = routing(input);
  return { ...input, id: crypto.randomUUID(), reviews, owner, status: auto ? "Auto-approved" : "In review", daysInStage: 0 };
}

type Store = { requests: VendorRequest[]; ready: boolean; add: (r: VendorRequest) => void; update: (id: string, input: RequestInput) => void };
const Ctx = createContext<Store | null>(null);
const KEY = "di-vendor-hub-requests-v3";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<VendorRequest[]>(SEED);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const s = localStorage.getItem(KEY);
    if (s) try { setRequests(JSON.parse(s)); } catch { /* ignore */ }
    setReady(true);
  }, []);
  const save = (next: VendorRequest[]) => { localStorage.setItem(KEY, JSON.stringify(next)); return next; };
  const add = (r: VendorRequest) => setRequests((prev) => save([r, ...prev]));
  const update = (id: string, input: RequestInput) =>
    setRequests((prev) => save(prev.map((r) => {
      if (r.id !== id) return r;
      const { reviews, owner, auto } = routing(input);
      const changed = owner !== r.owner || reviews.join() !== r.reviews.join();
      const status: VendorRequest["status"] = auto ? "Auto-approved" : r.status === "Blocked" || r.status === "Approved" ? r.status : "In review";
      return { ...r, ...input, reviews, owner, status, daysInStage: changed ? 0 : r.daysInStage };
    })));
  return <Ctx.Provider value={{ requests, ready, add, update }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export interface Vendor {
  name: string;
  category: string;
  owner: string;
  cost: number;
  renewal: string; // ISO
  autoRenew: boolean;
  usage: "Active" | "Low usage" | "Unused";
  lastUsed: string;
  seats?: string;
}

export const VENDORS: Vendor[] = [
  { name: "Weights & Biases", category: "Experiment tracking", owner: "Marcus Lee", cost: 41500, renewal: "2026-10-24", autoRenew: true, usage: "Active", lastUsed: "Today", seats: "14 / 15 seats" },
  { name: "Otter.ai", category: "Meeting transcription", owner: "Tom Reyes", cost: 7200, renewal: "2027-01-15", autoRenew: true, usage: "Unused", lastUsed: "97 days ago", seats: "0 / 12 seats" },
  { name: "Fireflies.ai", category: "Meeting transcription", owner: "Dana Okafor", cost: 5400, renewal: "2027-03-02", autoRenew: true, usage: "Active", lastUsed: "Yesterday", seats: "9 / 10 seats" },
  { name: "Snowflake", category: "Data warehouse", owner: "Priya Shah", cost: 96000, renewal: "2027-06-30", autoRenew: false, usage: "Active", lastUsed: "Today" },
  { name: "Anthropic", category: "LLM API", owner: "Marcus Lee", cost: 60000, renewal: "2027-02-01", autoRenew: false, usage: "Active", lastUsed: "Today" },
  { name: "Pinecone", category: "Vector database", owner: "Dana Okafor", cost: 14400, renewal: "2026-11-18", autoRenew: true, usage: "Low usage", lastUsed: "21 days ago" },
  { name: "GitHub Enterprise", category: "Source control", owner: "Tom Reyes", cost: 12600, renewal: "2027-04-12", autoRenew: true, usage: "Active", lastUsed: "Today", seats: "15 / 15 seats" },
];
