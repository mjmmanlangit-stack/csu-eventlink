import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, EVENT_STATUSES } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard, Field } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/system")({
  head: () => ({
    meta: [
      { title: "System Management · CSU EventTrack" },
      {
        name: "description",
        content: "System overview, access control summary and data health for the CSU event management system.",
      },
      { property: "og:title", content: "System Management · CSU EventTrack" },
      { property: "og:description", content: "Administrator system overview and access control." },
    ],
  }),
  component: SystemPage,
});

function SystemPage() {
  const { data } = useQuery({
    queryKey: ["system-overview"],
    queryFn: async () => {
      const [profiles, roles, orgs, events, registrations, attendance, certificates] = await Promise.all([
        supabase.from("profiles").select("id, status"),
        supabase.from("user_roles").select("role"),
        supabase.from("organizations").select("id, status"),
        supabase.from("events").select("id, status"),
        supabase.from("event_registrations").select("id"),
        supabase.from("attendance").select("id"),
        supabase.from("certificates").select("id"),
      ]);
      const roleList = roles.data ?? [];
      return {
        users: profiles.data?.length ?? 0,
        activeUsers: (profiles.data ?? []).filter((p) => p.status === "active").length,
        admins: roleList.filter((r) => r.role === "admin").length,
        officers: roleList.filter((r) => r.role === "officer").length,
        students: roleList.filter((r) => r.role === "student").length,
        orgs: orgs.data?.length ?? 0,
        activeOrgs: (orgs.data ?? []).filter((o) => o.status === "active").length,
        events: events.data ?? [],
        registrations: registrations.data?.length ?? 0,
        attendance: attendance.data?.length ?? 0,
        certificates: certificates.data?.length ?? 0,
      };
    },
  });

  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="System Management"
        description="Administrator overview of accounts, organizations, event pipeline and records."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="User accounts" value={data.users} icon={Users} />
        <StatCard label="Organizations" value={data.orgs} icon={Building2} />
        <StatCard label="Events" value={data.events.length} icon={CalendarDays} />
        <StatCard label="Certificates issued" value={data.certificates} icon={ShieldCheck} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts and access control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Administrators" value={data.admins} />
              <Field label="Organization officers" value={data.officers} />
              <Field label="Students" value={data.students} />
              <Field label="Active accounts" value={`${data.activeUsers} of ${data.users}`} />
            </div>
            <p className="text-sm text-muted-foreground">
              Roles are stored separately from profiles and enforced by database-level security policies,
              so permissions cannot be changed from the browser.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/users">Manage users</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {EVENT_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{STATUS_LABEL[status]}</span>
                <Pill tone={status === "pending_approval" ? "warning" : "muted"}>
                  {data.events.filter((e) => e.status === status).length}
                </Pill>
              </div>
            ))}
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/events">Review events</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Records</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <Field label="Registrations" value={data.registrations} />
            <Field label="Attendance records" value={data.attendance} />
            <Field label="Certificates" value={data.certificates} />
            <Field label="Active organizations" value={`${data.activeOrgs} of ${data.orgs}`} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
