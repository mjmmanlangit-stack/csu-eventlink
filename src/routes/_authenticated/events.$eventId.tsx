import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, QrCode, Send, Upload, Award, FileDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getEvent,
  listParticipants,
  listEvaluations,
  listCertificates,
  myRegistration,
  eventReport,
} from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge, Pill } from "@/components/app/status-badge";
import { QrCodeView } from "@/components/app/qr-code-view";
import { QrScanner } from "@/components/app/qr-scanner";
import { EmptyState, Field, formatDate, formatDateTime } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  head: () => ({
    meta: [
      { title: "Event details · CSU EventTrack" },
      {
        name: "description",
        content:
          "Event information, registration, QR attendance, evaluation and certificate status in one place.",
      },
      { property: "og:title", content: "Event details · CSU EventTrack" },
      {
        property: "og:description",
        content: "Manage registration, QR attendance, evaluations and certificates for this event.",
      },
    ],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = useParams({ from: "/_authenticated/events/$eventId" });
  const { session } = useAuth();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEvent(eventId),
  });

  if (isLoading) return null;
  if (!event) return <EmptyState title="Event not found" description="It may have been removed." />;
  if (!session) return null;

  const manages = session.role === "admin" || session.organizationId === event.organization_id;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/events">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to events
        </Link>
      </Button>

      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {event.organizations?.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(event.starts_at)} — {formatDateTime(event.ends_at)} · {event.venue}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          {manages ? <ManageActions event={event} role={session.role} /> : null}
        </div>
      </div>

      <div className="mt-6">
        {manages ? (
          <ManageTabs eventId={eventId} event={event} />
        ) : (
          <StudentTabs eventId={eventId} event={event} userId={session.user.id} />
        )}
      </div>
    </div>
  );
}

type EventData = NonNullable<Awaited<ReturnType<typeof getEvent>>>;

function ManageActions({ event, role }: { event: EventData; role: string }) {
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["event", event.id] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const rpc = useMutation({
    mutationFn: async ({ fn, args }: { fn: string; args?: Record<string, unknown> }) => {
      const { error } = await supabase.rpc(
        fn as "publish_event",
        (args ?? {}) as { _event_id: string },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submitForApproval = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("events")
        .update({ status: "pending_approval", rejection_reason: null })
        .eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event submitted for approval");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isOfficer = role === "officer";
  const isAdmin = role === "admin";

  return (
    <div className="flex flex-wrap gap-2">
      {isOfficer && (event.status === "draft" || event.status === "rejected") ? (
        <Button size="sm" onClick={() => submitForApproval.mutate()} disabled={submitForApproval.isPending}>
          <Send className="mr-2 h-4 w-4" /> Submit for approval
        </Button>
      ) : null}

      {isAdmin && event.status === "pending_approval" ? (
        <>
          <Button
            size="sm"
            onClick={() => rpc.mutate({ fn: "review_event", args: { _event_id: event.id, _approve: true } })}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject event request</DialogTitle>
                <DialogDescription>
                  The organization officer will be notified with your reason.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get("reason") ?? "").trim();
                  if (reason.length < 5) {
                    toast.error("Please provide a reason (at least 5 characters)");
                    return;
                  }
                  rpc.mutate({
                    fn: "review_event",
                    args: { _event_id: event.id, _approve: false, _reason: reason },
                  });
                  setRejectOpen(false);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea id="reason" name="reason" rows={3} maxLength={500} required />
                </div>
                <DialogFooter>
                  <Button type="submit" variant="destructive">
                    Reject event
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      {event.status === "approved" ? (
        <Button size="sm" onClick={() => rpc.mutate({ fn: "publish_event", args: { _event_id: event.id } })}>
          <Upload className="mr-2 h-4 w-4" /> Publish event
        </Button>
      ) : null}

      {event.status === "published" ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => rpc.mutate({ fn: "complete_event", args: { _event_id: event.id } })}
        >
          Mark as completed
        </Button>
      ) : null}
    </div>
  );
}

function EventInformation({ event }: { event: EventData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-foreground">{event.description ?? "No description provided."}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Organization" value={event.organizations?.name ?? "—"} />
          <Field label="Category" value={event.category ?? "—"} />
          <Field label="Venue" value={event.venue} />
          <Field label="Starts" value={formatDateTime(event.starts_at)} />
          <Field label="Ends" value={formatDateTime(event.ends_at)} />
          <Field label="Capacity" value={event.capacity ?? "Unlimited"} />
          <Field label="Registration deadline" value={formatDateTime(event.registration_deadline)} />
          <Field
            label="Evaluation required"
            value={event.requires_evaluation ? "Yes — required for certificate" : "No"}
          />
          <Field label="Published" value={formatDateTime(event.published_at)} />
        </div>
        {event.rejection_reason ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Rejection reason: {event.rejection_reason}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- STUDENT VIEW ------------------------------ */

function StudentTabs({
  eventId,
  event,
  userId,
}: {
  eventId: string;
  event: EventData;
  userId: string;
}) {
  const queryClient = useQueryClient();

  const { data: registration } = useQuery({
    queryKey: ["my-registration", eventId, userId],
    queryFn: () => myRegistration(eventId, userId),
  });
  const { data: evaluation } = useQuery({
    queryKey: ["my-evaluation", eventId, userId],
    queryFn: async () => (await listEvaluations({ eventId, studentId: userId }))[0] ?? null,
  });
  const { data: certificate } = useQuery({
    queryKey: ["my-certificate", eventId, userId],
    queryFn: async () => (await listCertificates({ eventId, studentId: userId }))[0] ?? null,
  });

  const register = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("register_for_event", { _event_id: eventId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registration confirmed. Your QR code is ready.");
      queryClient.invalidateQueries({ queryKey: ["my-registration", eventId, userId] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const attended = (registration?.attendance ?? []).length > 0;
  const token = registration?.qr_codes?.[0]?.token ?? null;

  return (
    <Tabs defaultValue="information">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="information">Information</TabsTrigger>
        <TabsTrigger value="registration">Registration & QR</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
        <TabsTrigger value="certificate">Certificate</TabsTrigger>
      </TabsList>

      <TabsContent value="information" className="mt-4">
        <EventInformation event={event} />
      </TabsContent>

      <TabsContent value="registration" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {registration && registration.status === "registered" ? (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Pill tone="success">Registered</Pill>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(registration.registered_at)}
                  </span>
                </div>
                {token ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Present this QR code to an organization officer at the event entrance.
                    </p>
                    <QrCodeView token={token} />
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {event.status === "published"
                    ? "You are not yet registered for this event."
                    : "Registration is only available for published events."}
                </p>
                <Button
                  onClick={() => register.mutate()}
                  disabled={event.status !== "published" || register.isPending}
                >
                  {register.isPending ? "Registering…" : "Register for this event"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance status</CardTitle>
          </CardHeader>
          <CardContent>
            {attended ? (
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone="success">Attendance recorded</Pill>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(registration?.attendance?.[0]?.scanned_at)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No attendance recorded yet. Your QR code will be scanned during the event.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="evaluation" className="mt-4">
        <EvaluationForm
          eventId={eventId}
          canEvaluate={attended}
          existing={evaluation ?? null}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["my-evaluation", eventId, userId] });
            queryClient.invalidateQueries({ queryKey: ["student-evaluations"] });
          }}
        />
      </TabsContent>

      <TabsContent value="certificate" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {certificate ? (
              <>
                <Pill tone="success">Issued</Pill>
                <Field label="Certificate number" value={certificate.certificate_no} />
                <Field label="Issue date" value={formatDate(certificate.issued_at)} />
                <Button asChild size="sm" variant="outline">
                  <Link to="/certificates">View in Certificates</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not yet available. A certificate is issued once your attendance is recorded
                {event.requires_evaluation ? " and your evaluation is submitted" : ""}, and the
                organization issues certificates for this event.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

const evaluationSchema = z.object({
  content: z.number().int().min(1).max(5),
  organization: z.number().int().min(1).max(5),
  venue: z.number().int().min(1).max(5),
  overall: z.number().int().min(1).max(5),
  comments: z.string().trim().max(1000).optional(),
});

const RATING_FIELDS = [
  { name: "content", label: "Program content and relevance" },
  { name: "organization", label: "Organization and management" },
  { name: "venue", label: "Venue and facilities" },
  { name: "overall", label: "Overall experience" },
] as const;

export function EvaluationForm({
  eventId,
  canEvaluate,
  existing,
  onSubmitted,
}: {
  eventId: string;
  canEvaluate: boolean;
  existing: {
    rating_content: number;
    rating_organization: number;
    rating_venue: number;
    rating_overall: number;
    comments: string | null;
    submitted_at: string;
  } | null;
  onSubmitted: () => void;
}) {
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = evaluationSchema.safeParse({
        content: Number(form.get("content")),
        organization: Number(form.get("organization")),
        venue: Number(form.get("venue")),
        overall: Number(form.get("overall")),
        comments: String(form.get("comments") ?? "") || undefined,
      });
      if (!parsed.success) throw new Error("Please rate every item from 1 to 5");
      const { error } = await supabase.rpc("submit_evaluation", {
        _event_id: eventId,
        _content: parsed.data.content,
        _organization: parsed.data.organization,
        _venue: parsed.data.venue,
        _overall: parsed.data.overall,
        _comments: parsed.data.comments ?? "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evaluation submitted");
      onSubmitted();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Pill tone="success">Submitted {formatDateTime(existing.submitted_at)}</Pill>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Content" value={`${existing.rating_content} / 5`} />
            <Field label="Organization" value={`${existing.rating_organization} / 5`} />
            <Field label="Venue" value={`${existing.rating_venue} / 5`} />
            <Field label="Overall" value={`${existing.rating_overall} / 5`} />
          </div>
          {existing.comments ? <Field label="Comments" value={existing.comments} /> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Event evaluation</CardTitle>
      </CardHeader>
      <CardContent>
        {!canEvaluate ? (
          <p className="text-sm text-muted-foreground">
            Only participants with recorded attendance can submit an evaluation.
          </p>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(new FormData(e.currentTarget));
            }}
          >
            {RATING_FIELDS.map((field) => (
              <fieldset key={field.name} className="space-y-2">
                <legend className="text-sm font-medium text-foreground">{field.label}</legend>
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name={field.name} value={value} required className="accent-primary" />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea id="comments" name="comments" rows={3} maxLength={1000} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Submitting…" : "Submit evaluation"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------- OFFICER / ADMIN VIEW --------------------------- */

function ManageTabs({ eventId, event }: { eventId: string; event: EventData }) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="participants">Participants</TabsTrigger>
        <TabsTrigger value="qr">QR Attendance</TabsTrigger>
        <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        <TabsTrigger value="certificates">Certificates</TabsTrigger>
        <TabsTrigger value="report">Report</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <EventInformation event={event} />
      </TabsContent>
      <TabsContent value="participants" className="mt-4">
        <ParticipantsPanel eventId={eventId} />
      </TabsContent>
      <TabsContent value="qr" className="mt-4">
        <AttendancePanel eventId={eventId} event={event} />
      </TabsContent>
      <TabsContent value="evaluations" className="mt-4">
        <EvaluationsPanel eventId={eventId} />
      </TabsContent>
      <TabsContent value="certificates" className="mt-4">
        <CertificatesPanel eventId={eventId} event={event} />
      </TabsContent>
      <TabsContent value="report" className="mt-4">
        <ReportPanel eventId={eventId} event={event} />
      </TabsContent>
    </Tabs>
  );
}

function ParticipantsPanel({ eventId }: { eventId: string }) {
  const { data } = useQuery({
    queryKey: ["participants", eventId],
    queryFn: () => listParticipants(eventId),
  });

  if (!data?.length) return <EmptyState title="No registrations yet" />;

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Student no.</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead>Attendance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.profiles?.full_name}</TableCell>
              <TableCell>{p.profiles?.student_no ?? "—"}</TableCell>
              <TableCell>{p.profiles?.course ?? "—"}</TableCell>
              <TableCell>{formatDateTime(p.registered_at)}</TableCell>
              <TableCell>
                {p.attendance.length ? (
                  <Pill tone="success">Present</Pill>
                ) : (
                  <Pill>Not scanned</Pill>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function AttendancePanel({ eventId, event }: { eventId: string; event: EventData }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["participants", eventId],
    queryFn: () => listParticipants(eventId),
  });

  const scan = useMutation({
    mutationFn: async (token: string) => {
      const trimmed = token.trim();
      if (trimmed.length < 8) throw new Error("Invalid QR code");
      const { data, error } = await supabase.rpc("record_attendance", { _token: trimmed });
      if (error) throw error;
      return data as { student_name?: string } | null;
    },
    onSuccess: (result) => {
      toast.success(`Attendance recorded: ${result?.student_name ?? "student"}`);
      queryClient.invalidateQueries({ queryKey: ["participants", eventId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const present = (data ?? []).filter((p) => p.attendance.length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan participant QR code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {event.status !== "published" && event.status !== "completed" ? (
            <p className="text-sm text-muted-foreground">
              Attendance scanning becomes useful once the event is published.
            </p>
          ) : null}
          <QrScanner onScan={(token) => scan.mutate(token)} />
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              scan.mutate(String(form.get("token") ?? ""));
              e.currentTarget.reset();
            }}
          >
            <Label htmlFor="token">Manual code entry</Label>
            <div className="flex gap-2">
              <Input id="token" name="token" placeholder="CSU-…" maxLength={80} required />
              <Button type="submit" disabled={scan.isPending}>
                <QrCode className="mr-2 h-4 w-4" /> Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendance records ({present.length}/{data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {present.length === 0 ? (
            <EmptyState title="No attendance recorded yet" />
          ) : (
            <div className="divide-y divide-border">
              {present.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{p.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.profiles?.student_no ?? "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(p.attendance[0]?.scanned_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EvaluationsPanel({ eventId }: { eventId: string }) {
  const { data } = useQuery({
    queryKey: ["event-evaluations", eventId],
    queryFn: () => listEvaluations({ eventId }),
  });

  if (!data?.length) return <EmptyState title="No evaluations submitted yet" />;

  const avg = (key: "rating_content" | "rating_organization" | "rating_venue" | "rating_overall") =>
    (data.reduce((sum, e) => sum + e[key], 0) / data.length).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <Field label="Content" value={`${avg("rating_content")} / 5`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Field label="Organization" value={`${avg("rating_organization")} / 5`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Field label="Venue" value={`${avg("rating_venue")} / 5`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Field label="Overall" value={`${avg("rating_overall")} / 5`} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.profiles?.full_name}</TableCell>
                <TableCell>{row.rating_content}</TableCell>
                <TableCell>{row.rating_organization}</TableCell>
                <TableCell>{row.rating_venue}</TableCell>
                <TableCell>{row.rating_overall}</TableCell>
                <TableCell className="max-w-64 text-sm text-muted-foreground">
                  {row.comments ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function CertificatesPanel({ eventId, event }: { eventId: string; event: EventData }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["event-certificates", eventId],
    queryFn: () => listCertificates({ eventId }),
  });
  const { data: report } = useQuery({
    queryKey: ["event-report", eventId],
    queryFn: () => eventReport(eventId),
  });

  const issue = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("issue_certificates", { _event_id: eventId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast.success(count ? `${count} certificate(s) issued` : "No new eligible participants");
      queryClient.invalidateQueries({ queryKey: ["event-certificates", eventId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const eligible =
    report?.participants.filter(
      (p) =>
        p.attendance.length > 0 &&
        (!event.requires_evaluation ||
          report.evaluations.some((e) => e.student_id === p.student_id)),
    ).length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificate eligibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Eligibility requires a valid registration and recorded attendance
            {event.requires_evaluation ? ", plus a submitted evaluation" : ""}.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Field label="Eligible participants" value={eligible} />
            <Field label="Certificates issued" value={data?.length ?? 0} />
          </div>
          <Button onClick={() => issue.mutate()} disabled={issue.isPending}>
            <Award className="mr-2 h-4 w-4" /> Generate certificates
          </Button>
        </CardContent>
      </Card>

      {data?.length ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Certificate no.</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell className="font-medium">{cert.profiles?.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{cert.certificate_no}</TableCell>
                  <TableCell>{formatDate(cert.issued_at)}</TableCell>
                  <TableCell className="capitalize">{cert.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="No certificates issued yet" />
      )}
    </div>
  );
}

export function ReportPanel({ eventId, event }: { eventId: string; event: EventData }) {
  const { data } = useQuery({
    queryKey: ["event-report", eventId],
    queryFn: () => eventReport(eventId),
  });

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Event report</CardTitle>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <FileDown className="mr-2 h-4 w-4" /> Print / Save PDF
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Event" value={event.title} />
          <Field label="Organization" value={event.organizations?.name ?? "—"} />
          <Field label="Schedule" value={`${formatDateTime(event.starts_at)}`} />
          <Field label="Venue" value={event.venue} />
          <Field label="Registered participants" value={data.registered} />
          <Field label="Attended" value={`${data.attended} (${data.attendanceRate}%)`} />
          <Field label="Evaluations submitted" value={data.evaluations.length} />
          <Field label="Certificates issued" value={data.certificates.length} />
          <Field label="Average overall rating" value={`${data.averages.overall.toFixed(2)} / 5`} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Evaluation averages</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Content" value={data.averages.content.toFixed(2)} />
            <Field label="Organization" value={data.averages.organization.toFixed(2)} />
            <Field label="Venue" value={data.averages.venue.toFixed(2)} />
            <Field label="Overall" value={data.averages.overall.toFixed(2)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
