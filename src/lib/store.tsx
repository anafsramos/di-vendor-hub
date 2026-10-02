import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Review = "Operations" | "Finance" | "Compliance" | "Legal";
export type Term = "monthly" | "annual" | "multi-year";

export interface RequestInput {
  vendor: string;
  purpose: string;
  requester: string;
  cost: number;
  term: Term;
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
  owner: Review;
  status: "In review" | "Blocked" | "Fast path" | "Approved";
  daysInStage: number;
  note?: string;
}

const KNOWN_VENDORS = ["openai", "anthropic", "snowflake", "datadog", "github", "notion", "pinecone", "weights & biases", "otter.ai", "linear"];
export const MATERIAL_SPEND = 25000;

export function route(input: RequestInput): Reason[] {
  const r: Reason[] = [];
  if (input.cost >= MATERIAL_SPEND) r.push({ review: "Finance", why: `Annual cost of ${fmt(input.cost)} exceeds the ${fmt(MATERIAL_SPEND)} material-spend threshold.` });
  if (input.term === "multi-year") r.push({ review: "Finance", why: "Multi-year commitment." });
  if (input.newData) r.push({ review: "Compliance", why: "Introduces a new third-party data source." });
  if (input.pii) r.push({ review: "Compliance", why: "Tool will handle PHI or PII." });
  if (input.externalAI) r.push({ review: "Compliance", why: "Data leaves Deerfield's environment or goes to an external AI model." });
  if (input.portco) {
    r.push({ review: "Compliance", why: "Deployed to or used by a portfolio company." });
    r.push({ review: "Legal", why: "Portfolio-company deployment requires contract review." });
  }
  const isNew = !KNOWN_VENDORS.includes(input.vendor.trim().toLowerCase());
  if (isNew && (input.term !== "monthly" || input.cost >= 5000)) r.push({ review: "Legal", why: "New vendor contract — terms need review." });
  if (r.length === 0) r.push({ review: "Operations", why: "Small, low-risk purchase within normal budget. Fast path." });
  return r;
}

export function uniqueReviews(reasons: Reason[]): Review[] {
  const order: Review[] = ["Operations", "Finance", "Compliance", "Legal"];
  return order.filter((o) => reasons.some((r) => r.review === o));
}

export const fmt = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const SEED: VendorRequest[] = [
  { id: "r1", vendor: "Hebbia", purpose: "Document search across 10-K and expert call transcripts", requester: "Priya Shah", cost: 85000, term: "annual", newData: true, pii: false, externalAI: true, portco: false, reviews: ["Finance", "Compliance", "Legal"], owner: "Compliance", status: "Blocked", daysInStage: 12, note: "Awaiting SOC 2 report from vendor" },
  { id: "r2", vendor: "Modal", purpose: "Serverless GPU for batch inference jobs", requester: "Marcus Lee", cost: 18000, term: "monthly", newData: false, pii: false, externalAI: false, portco: false, reviews: ["Legal"], owner: "Legal", status: "In review", daysInStage: 3 },
  { id: "r3", vendor: "Cursor", purpose: "AI code editor seats for the team", requester: "Dana Okafor", cost: 4800, term: "annual", newData: false, pii: false, externalAI: true, portco: false, reviews: ["Compliance"], owner: "Compliance", status: "In review", daysInStage: 2 },
  { id: "r4", vendor: "Abridge", purpose: "Clinical note summarization pilot at a portfolio company", requester: "Priya Shah", cost: 120000, term: "multi-year", newData: false, pii: true, externalAI: true, portco: true, reviews: ["Finance", "Compliance", "Legal"], owner: "Legal", status: "In review", daysInStage: 9, note: "Redlines with vendor counsel" },
  { id: "r5", vendor: "Excalidraw+", purpose: "Whiteboarding for architecture reviews", requester: "Tom Reyes", cost: 600, term: "monthly", newData: false, pii: false, externalAI: false, portco: false, reviews: ["Operations"], owner: "Operations", status: "Fast path", daysInStage: 1 },
  { id: "r6", vendor: "Crunchbase Pro", purpose: "Private company data for sourcing models", requester: "Marcus Lee", cost: 32000, term: "annual", newData: true, pii: false, externalAI: false, portco: false, reviews: ["Finance", "Compliance", "Legal"], owner: "Finance", status: "In review", daysInStage: 6 },
];

export function routing(input: RequestInput) {
  const reasons = route(input);
  const reviews = uniqueReviews(reasons);
  const fast = reviews.length === 1 && reviews[0] === "Operations";
  const owner: Review = reviews.find((r) => r !== "Operations") ?? "Operations";
  return { reasons, reviews, owner, fast };
}

export function createRequest(input: RequestInput): VendorRequest {
  const { reviews, owner, fast } = routing(input);
  return { ...input, id: crypto.randomUUID(), reviews, owner, status: fast ? "Fast path" : "In review", daysInStage: 0 };
}

type Store = { requests: VendorRequest[]; ready: boolean; add: (r: VendorRequest) => void; update: (id: string, input: RequestInput) => void };
const Ctx = createContext<Store | null>(null);
const KEY = "di-vendor-hub-requests-v2";

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
      const { reviews, owner, fast } = routing(input);
      const changed = owner !== r.owner || reviews.join() !== r.reviews.join();
      const status: VendorRequest["status"] = fast ? "Fast path" : r.status === "Blocked" || r.status === "Approved" ? r.status : "In review";
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
