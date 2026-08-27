import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getEvent, type EventStatus } from "@/lib/events";
import { EventForm, type EventFormValues } from "@/components/app/event-form";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";
import { StatusBadge } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/_org/org/events/$eventId")({ component: OfficerEventPage });

function inputDate(value: string) { return new Date(value).toISOString().slice(0, 16); }

function OfficerEventPage() {
  const { eventId } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useQuery({ queryKey: ["org-event", eventId], queryFn: () => getEvent(eventId) });
  const save = useMutation({
    mutationFn: async (values: EventFormValues) => {
      if (!session?.organizationId || event?.organization_id !== session.organizationId) throw new Error("This event does not belong to your organization");
      const startsAt = new Date(values.starts_at);
      const endsAt = new Date(values.ends_at);
      if (endsAt <= startsAt) throw new Error("End date must be after the start date");
      const { error } = await supabase.from("events").update({ title: values.title.trim(), description: values.description.trim() || null, venue: values.venue.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), capacity: values.capacity ? Number(values.capacity) : null }).eq("id", eventId).eq("organization_id", session.organizationId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event updated"); queryClient.invalidateQueries({ queryKey: ["org-event", eventId] }); queryClient.invalidateQueries({ queryKey: ["org-events"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const lifecycle = useMutation({
    mutationFn: async (status: EventStatus) => {
      if (!session?.organizationId) throw new Error("No organization is assigned to this account");
      const { error } = await supabase.from("events").update({ status }).eq("id", eventId).eq("organization_id", session.organizationId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Event status updated"); queryClient.invalidateQueries({ queryKey: ["org-event", eventId] }); queryClient.invalidateQueries({ queryKey: ["org-events"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  if (isLoading) return null;
  if (!event || event.organization_id !== session?.organizationId) return <EmptyState title="Event not found" description="This event is not available in your organization workspace." />;
  const values = { title: event.title, description: event.description ?? "", venue: event.venue, starts_at: inputDate(event.starts_at), ends_at: inputDate(event.ends_at), capacity: event.capacity?.toString() ?? "" };
  return <div><PageHeader title={event.title} description="Edit event details and manage its lifecycle." actions={<Button asChild variant="outline"><Link to="/org/dashboard">Back to events</Link></Button>} /><div className="mb-6 flex flex-wrap items-center gap-3"><StatusBadge status={event.status} />{event.status === "draft" || event.status === "rejected" ? <Button size="sm" onClick={() => lifecycle.mutate("pending_approval")} disabled={lifecycle.isPending}>Submit for approval</Button> : null}{event.status === "approved" ? <Button size="sm" onClick={() => lifecycle.mutate("published")} disabled={lifecycle.isPending}>Publish</Button> : null}{event.status === "published" ? <Button size="sm" onClick={() => lifecycle.mutate("completed")} disabled={lifecycle.isPending}>Mark completed</Button> : null}</div><EventForm key={event.id} initialValues={values} submitLabel="Save changes" onSubmit={(nextValues) => save.mutate(nextValues)} isPending={save.isPending} /></div>;
}