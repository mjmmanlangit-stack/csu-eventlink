import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listEvents, STATUS_LABEL, EVENT_STATUSES, type EventStatus } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState, formatDateTime } from "@/components/app/ui-bits";
import { StatusBadge } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({
    meta: [
      { title: "Events · CSU EventTrack" },
      {
        name: "description",
        content: "Browse and manage Catanduanes State University student organization events.",
      },
      { property: "og:title", content: "Events · CSU EventTrack" },
      { property: "og:description", content: "Organization events, approvals and registrations." },
    ],
  }),
  component: EventsPage,
});

const eventSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(150),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(60).optional(),
  venue: z.string().trim().min(2, "Venue is required").max(150),
  starts_at: z.string().min(1, "Start date and time is required"),
  ends_at: z.string().min(1, "End date and time is required"),
  capacity: z.number().int().positive().max(100000).nullable(),
  registration_deadline: z.string().nullable(),
  requires_evaluation: z.boolean(),
});

function EventsPage() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EventStatus>("all");

  const role = session?.role ?? "student";

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", role, session?.organizationId],
    enabled: !!session,
    queryFn: () =>
      role === "student"
        ? listEvents({ statuses: ["published", "completed"] })
        : role === "officer"
          ? listEvents({ organizationId: session?.organizationId ?? "" })
          : listEvents(),
  });

  const filtered = (events ?? []).filter((event) => {
    const matchesSearch = `${event.title} ${event.venue} ${event.organizations?.acronym ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Events"
        description={
          role === "student"
            ? "Published events from CSU student organizations."
            : role === "officer"
              ? "Create, submit and manage your organization's events."
              : "Review event requests and monitor all organization events."
        }
        actions={role === "officer" && session?.organizationId ? <CreateEventDialog orgId={session.organizationId} /> : undefined}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            className="pl-9"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {role !== "student" ? (
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {EVENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? null : filtered.length === 0 ? (
        <EmptyState
          title="No events found"
          description={
            role === "officer" ? "Create your first event to get started." : "Check back soon."
          }
        />
      ) : role === "student" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((event) => (
            <Card key={event.id} className="border-border/70">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      {event.organizations?.acronym}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">{event.title}</h2>
                  </div>
                  <StatusBadge status={event.status} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {event.description ?? "No description provided."}
                </p>
                <dl className="mt-4 space-y-1 text-sm">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">When:</dt>
                    <dd>{formatDateTime(event.starts_at)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Where:</dt>
                    <dd>{event.venue}</dd>
                  </div>
                </dl>
                <Button asChild size="sm" className="mt-4">
                  <Link to="/events/$eventId" params={{ eventId: event.id }}>
                    View event
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.venue}</p>
                  </TableCell>
                  <TableCell className="text-sm">{event.organizations?.acronym}</TableCell>
                  <TableCell className="text-sm">{formatDateTime(event.starts_at)}</TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/events/$eventId" params={{ eventId: event.id }}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function CreateEventDialog({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session } = useAuth();

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const capacityRaw = String(form.get("capacity") ?? "").trim();
      const deadlineRaw = String(form.get("registration_deadline") ?? "").trim();
      const parsed = eventSchema.safeParse({
        title: form.get("title"),
        description: String(form.get("description") ?? "") || undefined,
        category: String(form.get("category") ?? "") || undefined,
        venue: form.get("venue"),
        starts_at: form.get("starts_at"),
        ends_at: form.get("ends_at"),
        capacity: capacityRaw ? Number(capacityRaw) : null,
        registration_deadline: deadlineRaw || null,
        requires_evaluation: form.get("requires_evaluation") === "on",
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const values = parsed.data;
      if (new Date(values.ends_at) <= new Date(values.starts_at)) {
        throw new Error("End date must be after the start date");
      }
      const submit = form.get("intent") === "submit";
      const { data, error } = await supabase
        .from("events")
        .insert({
          organization_id: orgId,
          created_by: session!.user.id,
          title: values.title,
          description: values.description ?? null,
          category: values.category ?? null,
          venue: values.venue,
          starts_at: new Date(values.starts_at).toISOString(),
          ends_at: new Date(values.ends_at).toISOString(),
          capacity: values.capacity,
          registration_deadline: values.registration_deadline
            ? new Date(values.registration_deadline).toISOString()
            : null,
          requires_evaluation: values.requires_evaluation,
          status: submit ? "pending_approval" : "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Event saved");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate({ to: "/events/$eventId", params: { eventId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Create event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create event</DialogTitle>
          <DialogDescription>
            Save as draft, or submit the request for administrator approval.
          </DialogDescription>
        </DialogHeader>
        <form
          id="create-event-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            form.set("intent", submitter?.value ?? "draft");
            mutation.mutate(form);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Event title</Label>
            <Input id="title" name="title" required maxLength={150} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} maxLength={2000} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" maxLength={60} placeholder="Seminar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" name="venue" required maxLength={150} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input id="ends_at" name="ends_at" type="datetime-local" required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input id="capacity" name="capacity" type="number" min={1} max={100000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_deadline">Registration deadline</Label>
              <Input id="registration_deadline" name="registration_deadline" type="datetime-local" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="requires_evaluation" name="requires_evaluation" defaultChecked />
            <Label htmlFor="requires_evaluation" className="font-normal">
              Require evaluation before a certificate is issued
            </Label>
          </div>
          <DialogFooter className="gap-2">
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={mutation.isPending}>
              Save as draft
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={mutation.isPending}>
              Submit for approval
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
