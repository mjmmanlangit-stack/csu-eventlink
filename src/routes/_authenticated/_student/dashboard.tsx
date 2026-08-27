import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  Award,
  Users,
  Building2,
  Clock,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listEvents, type EventRow } from "@/lib/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard, PageHeader, EmptyState, formatDateTime } from "@/components/app/ui-bits";
import { StatusBadge } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/_student/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · CSU EventTrack" },
      { name: "description", content: "Overview of your CSU organization events and attendance." },
      { property: "og:title", content: "Dashboard · CSU EventTrack" },
      { property: "og:description", content: "Your events, attendance and certificates at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useAuth();
  if (!session || !session.role) return null;
  if (session.role === "admin") return <AdminDashboard />;
  if (session.role === "officer") return <OfficerDashboard orgId={session.organizationId} />;
  return <StudentDashboard userId={session.user.id} name={session.profile?.full_name ?? ""} />;
}

function UpcomingList({ events, emptyText }: { events: EventRow[]; emptyText: string }) {
  if (!events.length) return <EmptyState title={emptyText} />;
  return (
    <div className="divide-y divide-border">
      {events.map((event) => (
        <Link
          key={event.id}
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="flex items-center justify-between gap-4 py-3 hover:bg-muted/40"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(event.starts_at)} · {event.venue}
            </p>
          </div>
          <StatusBadge status={event.status} />
        </Link>
      ))}
    </div>
  );
}

function StudentDashboard({ userId, name }: { userId: string; name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard", userId],
    queryFn: async () => {
      const [published, registrations, attendance, certificates, evaluations] = await Promise.all([
        listEvents({ statuses: ["published"] }),
        supabase.from("event_registrations").select("id, event_id").eq("student_id", userId).eq("status", "registered"),
        supabase.from("attendance").select("id, event_id").eq("student_id", userId),
        supabase.from("certificates").select("id").eq("student_id", userId),
        supabase.from("evaluations").select("event_id").eq("student_id", userId),
      ]);
      const registeredIds = new Set((registrations.data ?? []).map((r) => r.event_id));
      const evaluatedIds = new Set((evaluations.data ?? []).map((e) => e.event_id));
      const attendedIds = (attendance.data ?? []).map((a) => a.event_id);
      return {
        upcoming: published.filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 5),
        myUpcoming: published.filter((e) => registeredIds.has(e.id)).slice(0, 5),
        registered: registeredIds.size,
        attended: attendance.data?.length ?? 0,
        certificates: certificates.data?.length ?? 0,
        pendingEvaluations: attendedIds.filter((id) => !evaluatedIds.has(id)).length,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title={`Welcome, ${name.split(" ")[0] || "student"}`}
        description="Your event registrations, attendance and certificates."
        actions={
          <Button asChild size="sm">
            <Link to="/events">Browse events</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered events" value={data?.registered ?? 0} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard label="Attended" value={data?.attended ?? 0} icon={<QrCode className="h-4 w-4" />} />
        <StatCard
          label="Pending evaluations"
          value={data?.pendingEvaluations ?? 0}
          icon={<ClipboardCheck className="h-4 w-4" />}
        />
        <StatCard label="Certificates" value={data?.certificates ?? 0} icon={<Award className="h-4 w-4" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? null : (
              <UpcomingList events={data?.upcoming ?? []} emptyText="No published events yet" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My registered events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? null : (
              <UpcomingList events={data?.myUpcoming ?? []} emptyText="You have no registrations yet" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OfficerDashboard({ orgId }: { orgId: string | null }) {
  const { data } = useQuery({
    queryKey: ["officer-dashboard", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const events = await listEvents({ organizationId: orgId! });
      const ids = events.map((e) => e.id);
      const [regs, att] = await Promise.all([
        ids.length
          ? supabase.from("event_registrations").select("id").in("event_id", ids).eq("status", "registered")
          : Promise.resolve({ data: [] as { id: string }[] }),
        ids.length
          ? supabase.from("attendance").select("id").in("event_id", ids)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ]);
      return {
        events,
        total: events.length,
        pending: events.filter((e) => e.status === "pending_approval").length,
        upcoming: events.filter(
          (e) => e.status === "published" && new Date(e.starts_at) >= new Date(),
        ),
        registrations: regs.data?.length ?? 0,
        attendance: att.data?.length ?? 0,
      };
    },
  });

  if (!orgId) {
    return (
      <div>
        <PageHeader title="Officer dashboard" />
        <EmptyState
          title="No organization assigned"
          description="Ask the administrator to assign your account to a student organization."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Organization dashboard"
        description="Monitor your organization's events, registrations and attendance."
        actions={
          <Button asChild size="sm">
            <Link to="/events">Manage events</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total events" value={data?.total ?? 0} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Pending approval" value={data?.pending ?? 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Upcoming" value={data?.upcoming.length ?? 0} icon={<CalendarCheck className="h-4 w-4" />} />
        <StatCard label="Registrations" value={data?.registrations ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Attendance records" value={data?.attendance ?? 0} icon={<QrCode className="h-4 w-4" />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Upcoming published events</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingList events={data?.upcoming ?? []} emptyText="No upcoming published events" />
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [events, users, orgs] = await Promise.all([
        listEvents(),
        supabase.from("profiles").select("id, status"),
        supabase.from("organizations").select("id, status"),
      ]);
      return {
        events,
        pending: events.filter((e) => e.status === "pending_approval"),
        published: events.filter((e) => e.status === "published").length,
        completed: events.filter((e) => e.status === "completed").length,
        users: users.data?.length ?? 0,
        orgs: orgs.data?.length ?? 0,
      };
    },
  });

  return (
    <div>
      <PageHeader
        title="Administrator dashboard"
        description="System-wide summary of users, organizations and events."
        actions={
          <Button asChild size="sm">
            <Link to="/events">Review events</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total users" value={data?.users ?? 0} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Organizations" value={data?.orgs ?? 0} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Pending requests" value={data?.pending.length ?? 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Published events" value={data?.published ?? 0} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="Completed events" value={data?.completed ?? 0} icon={<CalendarCheck className="h-4 w-4" />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Event requests awaiting review</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingList events={data?.pending ?? []} emptyText="No pending event requests" />
        </CardContent>
      </Card>
    </div>
  );
}
