import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EventForm, type EventFormValues } from "@/components/app/event-form";
import { PageHeader } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/_org/org/events/new")({ component: NewEventPage });

function NewEventPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      if (!session?.organizationId) throw new Error("No organization is assigned to this account");
      const startsAt = new Date(values.starts_at);
      const endsAt = new Date(values.ends_at);
      if (endsAt <= startsAt) throw new Error("End date must be after the start date");
      const { data, error } = await supabase.from("events").insert({
        organization_id: session.organizationId,
        created_by: session.user.id,
        title: values.title.trim(),
        description: values.description.trim() || null,
        venue: values.venue.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        capacity: values.capacity ? Number(values.capacity) : null,
        status: "draft",
      }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => { toast.success("Event saved as draft"); queryClient.invalidateQueries({ queryKey: ["org-events"] }); navigate({ to: "/org/events/$eventId", params: { eventId: id } }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <div><PageHeader title="Create event" description="Create an event for your assigned organization. New events start as drafts." /><EventForm submitLabel="Save draft" onSubmit={(values) => mutation.mutate(values)} isPending={mutation.isPending} /></div>;
}