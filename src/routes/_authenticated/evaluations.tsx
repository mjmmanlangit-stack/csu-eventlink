import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listEvaluations, listEvents } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState, formatDateTime } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/evaluations")({
  head: () => ({
    meta: [
      { title: "Evaluations · CSU EventTrack" },
      {
        name: "description",
        content: "Submit and review post-event evaluations for CSU student organization activities.",
      },
      { property: "og:title", content: "Evaluations · CSU EventTrack" },
      { property: "og:description", content: "Event feedback and rating summaries." },
    ],
  }),
  component: EvaluationsPage,
});

function EvaluationsPage() {
  const { session } = useAuth();
  if (!session) return null;
  return session.role === "student" ? <StudentEvaluations userId={session.user.id} /> : <OfficerEvaluations orgId={session.organizationId} />;
}

function StudentEvaluations({ userId }: { userId: string }) {
  const { data: pending } = useQuery({
    queryKey: ["pending-evaluations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, event_id, scanned_at, events(id, title, starts_at, requires_evaluation)")
        .eq("student_id", userId);
      if (error) throw error;
      return data;
    },
  });

  const { data: submitted } = useQuery({
    queryKey: ["student-evaluations", userId],
    queryFn: () => listEvaluations({ studentId: userId }),
  });

  const submittedIds = new Set((submitted ?? []).map((e) => e.event_id));
  const todo = (pending ?? []).filter((a) => !submittedIds.has(a.event_id));

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description="Rate the events you attended. Evaluations unlock your certificates."
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Awaiting your evaluation ({todo.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {todo.length === 0 ? (
              <p className="text-sm text-muted-foreground">You are all caught up.</p>
            ) : (
              <div className="divide-y divide-border">
                {todo.map((row) => {
                  const event = row.events as { id: string; title: string; starts_at: string } | null;
                  if (!event) return null;
                  return (
                    <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Attended {formatDateTime(row.scanned_at)}
                        </p>
                      </div>
                      <Button asChild size="sm">
                        <Link to="/events/$eventId" params={{ eventId: event.id }}>
                          Evaluate
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted evaluations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!submitted?.length ? (
              <div className="p-6">
                <EmptyState title="No evaluations submitted yet" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submitted.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.events?.title}</TableCell>
                      <TableCell>
                        <Pill tone="success">{row.rating_overall} / 5</Pill>
                      </TableCell>
                      <TableCell>{formatDateTime(row.submitted_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OfficerEvaluations({ orgId }: { orgId: string | null }) {
  const { data: events } = useQuery({
    queryKey: ["org-events-completed", orgId],
    enabled: !!orgId,
    queryFn: () => listEvents({ organizationId: orgId! }),
  });

  const { data: evaluations } = useQuery({
    queryKey: ["org-evaluations", orgId],
    enabled: !!events,
    queryFn: async () => {
      const results = await Promise.all(
        (events ?? []).map(async (event) => ({
          event,
          rows: await listEvaluations({ eventId: event.id }),
        })),
      );
      return results.filter((r) => r.rows.length > 0);
    },
  });

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description="Feedback summaries from participants of your organization's events."
      />
      {!evaluations?.length ? (
        <EmptyState title="No evaluations yet" description="Feedback appears after attendees evaluate an event." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map(({ event, rows }) => {
                const avg = (key: "rating_content" | "rating_organization" | "rating_venue" | "rating_overall") =>
                  (rows.reduce((sum, r) => sum + r[key], 0) / rows.length).toFixed(2);
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{rows.length}</TableCell>
                    <TableCell>{avg("rating_content")}</TableCell>
                    <TableCell>{avg("rating_organization")}</TableCell>
                    <TableCell>{avg("rating_venue")}</TableCell>
                    <TableCell>{avg("rating_overall")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/events/$eventId" params={{ eventId: event.id }}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
