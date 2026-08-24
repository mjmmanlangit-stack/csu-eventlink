import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState, formatDateTime } from "@/components/app/ui-bits";
import { StatusBadge, Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/my-events")({
  head: () => ({
    meta: [
      { title: "My Events · CSU EventTrack" },
      {
        name: "description",
        content: "Your event registrations, QR codes and attendance history at Catanduanes State University.",
      },
      { property: "og:title", content: "My Events · CSU EventTrack" },
      { property: "og:description", content: "Track your registrations and attendance." },
    ],
  }),
  component: MyEventsPage,
});

function MyEventsPage() {
  const { session } = useAuth();

  const { data } = useQuery({
    queryKey: ["my-events", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select(
          "id, status, registered_at, event_id, attendance(scanned_at), events(id, title, venue, starts_at, status, requires_evaluation, organizations(acronym))",
        )
        .eq("student_id", session!.user.id)
        .order("registered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <PageHeader
        title="My Events"
        description="Events you registered for, with attendance status and QR access."
      />
      {!data?.length ? (
        <EmptyState
          title="No registrations yet"
          description="Browse published events and register to see them here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((row) => {
            const event = row.events as {
              id: string;
              title: string;
              venue: string;
              starts_at: string;
              status: string;
              organizations: { acronym: string } | null;
            } | null;
            if (!event) return null;
            return (
              <Card key={row.id} className="border-border/70">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        {event.organizations?.acronym}
                      </p>
                      <h2 className="mt-1 text-base font-semibold">{event.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(event.starts_at)} · {event.venue}
                      </p>
                    </div>
                    <StatusBadge status={event.status as never} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.status === "registered" ? (
                      <Pill tone="success">Registered</Pill>
                    ) : (
                      <Pill tone="danger">Cancelled</Pill>
                    )}
                    {row.attendance.length ? (
                      <Pill tone="success">Attended</Pill>
                    ) : (
                      <Pill>Awaiting scan</Pill>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/events/$eventId" params={{ eventId: event.id }}>
                      Open event & QR code
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
