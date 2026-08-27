import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, EmptyState } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";
import { normalizeRole, type Role } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_admin/users")({
  head: () => ({
    meta: [
      { title: "User Management · CSU EventTrack" },
      {
        name: "description",
        content: "Administer student, officer and admin accounts for the CSU event management system.",
      },
      { property: "og:title", content: "User Management · CSU EventTrack" },
      { property: "og:description", content: "Manage roles, officers and account status." },
    ],
  }),
  component: UsersPage,
});

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  student_no: string | null;
  course: string | null;
  department: string | null;
  status: string;
};

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<UserRow | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }, { data: officers }] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("organization_officers").select("user_id, position, organizations(acronym)"),
      ]);
      if (error) throw error;
      const roleMap = new Map(
        (roles ?? []).map((r) => [r.user_id, normalizeRole(r.role as string) as Role]),
      );
      const officerMap = new Map(
        (officers ?? []).map((o) => [
          o.user_id,
          `${(o.organizations as { acronym: string } | null)?.acronym ?? "—"} · ${o.position}`,
        ]),
      );
      return (profiles ?? []).map((p) => ({
        ...(p as UserRow),
        role: roleMap.get(p.id) ?? "student",
        officer: officerMap.get(p.id) ?? null,
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: "active" | "inactive" }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = (data ?? []).filter((u) =>
    `${u.full_name} ${u.email} ${u.student_no ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="User Management" description="Assign roles, link officers to organizations and manage account access." />

      <Input
        placeholder="Search by name, email or student number…"
        className="mb-4 max-w-md"
        maxLength={80}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Student no.</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Officer of</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell className="text-sm">{user.student_no ?? "—"}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) => setRole.mutate({ userId: user.id, role: role as Role })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="officer">Officer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{user.officer ?? "—"}</TableCell>
                  <TableCell>
                    {user.status === "active" ? (
                      <Pill tone="success">Active</Pill>
                    ) : (
                      <Pill tone="destructive">Inactive</Pill>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAssigning(user)}>
                      Assign officer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setStatus.mutate({
                          userId: user.id,
                          status: user.status === "active" ? "inactive" : "active",
                        })
                      }
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <AssignOfficerDialog user={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}

function AssignOfficerDialog({ user, onClose }: { user: UserRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState("");

  const { data: orgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("id, name, acronym").order("acronym");
      if (error) throw error;
      return data;
    },
  });

  const assign = useMutation({
    mutationFn: async (position: string) => {
      if (!orgId) throw new Error("Select an organization");
      const { error } = await supabase.rpc("assign_officer", {
        _user_id: user!.id,
        _org_id: orgId,
        _position: position || "Officer",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Officer assigned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onClose();
      setOrgId("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign as organization officer</DialogTitle>
          <DialogDescription>
            {user?.full_name} will be granted the officer role for the selected organization.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            assign.mutate(String(new FormData(e.currentTarget).get("position") ?? "").trim());
          }}
        >
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {(orgs ?? []).map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.acronym} — {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" name="position" maxLength={60} placeholder="President" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={assign.isPending}>
              Assign officer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
