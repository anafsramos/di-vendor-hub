import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui-bits";
import { RequestForm } from "@/components/request-form";

export const Route = createFileRoute("/requests/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit Request — DI Vendor Hub" },
      { name: "description", content: "Update your vendor request. Reviews update automatically." },
      { property: "og:title", content: "Edit Request — DI Vendor Hub" },
      { property: "og:description", content: "Update your vendor request. Reviews update automatically." },
    ],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const { requests, ready, update } = useStore();
  const navigate = useNavigate();
  const r = requests.find((x) => x.id === id);
  if (!ready) return null;
  if (!r) return <p className="text-muted-foreground">Request not found. <Link to="/" className="underline">Back to requests</Link></p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/requests/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">← Back to request</Link>
      <div className="mt-4" />
      <PageHeader title={`Edit ${r.vendor}`} sub="Change anything that's different. Required reviews update automatically." />
      <RequestForm initial={r} submitLabel="Save changes" footer="Reviews will be re-checked when you save." onSubmit={(input) => {
        update(id, input);
        navigate({ to: "/requests/$id", params: { id } });
      }} />
    </div>
  );
}
