import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listEvents, type EventStatus } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState, formatDateTime } from "@/components/app/ui-bits";
import { StatusBadge } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/_org/org/dashboard")({ component: OfficerDashboardPage });

function OfficerDashboardPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = session?.organizationId;
  const { data: events, isLoading } = useQuery({ queryKey: ["org-events", organizationId], enabled: !!organizationId, queryFn: () => listEvents({ organizationId: organizationId! }) });
  const lifecycle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventStatus }) => {
      const { error } = await supabase.from("events").update({ status }).eq("id", id).eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event status updated"); queryClient.invalidateQueries({ queryKey: ["org-events", organizationId] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  if (!organizationId) return <EmptyState title="No organization assigned" description="Ask an administrator to assign your officer account to an organization." />;
  return <div><PageHeader title="Organization events" description="Create and manage events for your assigned organization." actions={<Button asChild><Link to="/org/events/new"><Plus className="mr-2 h-4 w-4" />Create event</Link></Button>} />
    {isLoading ? null : !events?.length ? <EmptyState title="No events yet" description="Create your first event as a draft, then submit it for approval." /> : <div className="grid gap-4 lg:grid-cols-2">{events.map((event) => <Card key={event.id}><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{event.title}</h2><p className="text-sm text-muted-foreground">{formatDateTime(event.starts_at)} · {event.venue}</p></div><StatusBadge status={event.status} /></div><p className="line-clamp-2 text-sm text-muted-foreground">{event.description ?? "No description provided."}</p><div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link to="/org/events/$eventId" params={{ eventId: event.id }}>Open</Link></Button>{event.status === "draft" || event.status === "rejected" ? <Button size="sm" onClick={() => lifecycle.mutate({ id: event.id, status: "pending_approval" })}>Submit for approval</Button> : null}{event.status === "approved" ? <Button size="sm" onClick={() => lifecycle.mutate({ id: event.id, status: "published" })}>Publish</Button> : null}{event.status === "published" ? <Button size="sm" onClick={() => lifecycle.mutate({ id: event.id, status: "completed" })}>Mark completed</Button> : null}</div></CardContent></Card>)}</div>}
  </div>;
}