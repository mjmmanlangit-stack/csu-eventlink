import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listEvents, eventReport } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, EmptyState, Field, formatDateTime } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports · CSU EventTrack" },
      {
        name: "description",
        content: "Attendance, evaluation and certificate reports for CSU student organization events.",
      },
      { property: "og:title", content: "Reports · CSU EventTrack" },
      { property: "og:description", content: "Printable attendance and evaluation summaries." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { session } = useAuth();
  const [eventId, setEventId] = useState<string>("");

  const { data: events } = useQuery({
    queryKey: ["report-events", session?.role, session?.organizationId],
    enabled: !!session,
    queryFn: () =>
      session!.role === "officer"
        ? listEvents({ organizationId: session!.organizationId ?? "" })
        : listEvents(),
  });

  const { data: report } = useQuery({
    queryKey: ["report", eventId],
    enabled: !!eventId,
    queryFn: () => eventReport(eventId),
  });

  const selected = (events ?? []).find((e) => e.id === eventId);

  const totals = (events ?? []).reduce(
    (acc, event) => {
      acc.total += 1;
      if (event.status === "published") acc.published += 1;
      if (event.status === "completed") acc.completed += 1;
      if (event.status === "pending_approval") acc.pending += 1;
      return acc;
    },
    { total: 0, published: 0, completed: 0, pending: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate attendance and evaluation reports per event, ready for printing or PDF export."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total events" value={totals.total} />
        <StatCard label="Published" value={totals.published} />
        <StatCard label="Completed" value={totals.completed} />
        <StatCard label="Pending approval" value={totals.pending} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="sm:w-96">
            <SelectValue placeholder="Select an event to generate a report" />
          </SelectTrigger>
          <SelectContent>
            {(events ?? []).map((event) => (
              <SelectItem key={event.id} value={event.id}>
                {event.organizations?.acronym} — {event.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {report ? (
          <Button variant="outline" onClick={() => window.print()}>
            <FileDown className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        ) : null}
      </div>

      {!eventId ? (
        <EmptyState title="No event selected" description="Choose an event above to view its report." />
      ) : !report ? null : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selected?.title}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Organization" value={selected?.organizations?.name ?? "—"} />
              <Field label="Venue" value={selected?.venue ?? "—"} />
              <Field label="Schedule" value={formatDateTime(selected?.starts_at)} />
              <Field label="Status" value={selected?.status ?? "—"} />
              <Field label="Registered" value={report.registered} />
              <Field label="Attended" value={`${report.attended} (${report.attendanceRate}%)`} />
              <Field label="Evaluations" value={report.evaluations.length} />
              <Field label="Certificates" value={report.certificates.length} />
              <Field label="Avg. content" value={report.averages.content.toFixed(2)} />
              <Field label="Avg. organization" value={report.averages.organization.toFixed(2)} />
              <Field label="Avg. venue" value={report.averages.venue.toFixed(2)} />
              <Field label="Avg. overall" value={report.averages.overall.toFixed(2)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participant list</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student no.</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Evaluation</TableHead>
                    <TableHead>Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.participants.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.profiles?.full_name}</TableCell>
                      <TableCell>{p.profiles?.student_no ?? "—"}</TableCell>
                      <TableCell>{p.profiles?.course ?? "—"}</TableCell>
                      <TableCell>
                        {p.attendance.length ? <Pill tone="success">Present</Pill> : <Pill>Absent</Pill>}
                      </TableCell>
                      <TableCell>
                        {report.evaluations.some((e) => e.student_id === p.student_id) ? (
                          <Pill tone="success">Submitted</Pill>
                        ) : (
                          <Pill>Pending</Pill>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.certificates.some((c) => c.student_id === p.student_id) ? (
                          <Pill tone="success">Issued</Pill>
                        ) : (
                          <Pill>—</Pill>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
