import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader, EmptyState, Field } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations · CSU EventTrack" },
      {
        name: "description",
        content: "Register and manage accredited student organizations of Catanduanes State University.",
      },
      { property: "og:title", content: "Organizations · CSU EventTrack" },
      { property: "og:description", content: "Accredited student organizations and their officers." },
    ],
  }),
  component: OrganizationsPage,
});

const orgSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120),
  acronym: z.string().trim().min(2, "Acronym is required").max(20),
  adviser: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
});

function OrganizationsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["organizations-admin"],
    queryFn: async () => {
      const [{ data: orgs, error }, { data: officers }, { data: events }] = await Promise.all([
        supabase.from("organizations").select("*").order("acronym"),
        supabase.from("organization_officers").select("organization_id, position, profiles(full_name)"),
        supabase.from("events").select("id, organization_id, status"),
      ]);
      if (error) throw error;
      return (orgs ?? []).map((org) => ({
        ...org,
        officers: (officers ?? []).filter((o) => o.organization_id === org.id),
        eventCount: (events ?? []).filter((e) => e.organization_id === org.id).length,
      }));
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) => {
      const { error } = await supabase.from("organizations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization updated");
      queryClient.invalidateQueries({ queryKey: ["organizations-admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Accredited student organizations, their advisers and assigned officers."
        actions={<CreateOrgDialog />}
      />

      {!data?.length ? (
        <EmptyState title="No organizations yet" description="Register the first student organization." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((org) => (
            <Card key={org.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {org.acronym}
                    </p>
                    <h2 className="mt-1 text-base font-semibold">{org.name}</h2>
                  </div>
                  {org.status === "active" ? (
                    <Pill tone="success">Active</Pill>
                  ) : (
                    <Pill tone="destructive">Inactive</Pill>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {org.description ?? "No description provided."}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Adviser" value={org.adviser ?? "—"} />
                  <Field label="Events" value={org.eventCount} />
                  <Field label="Officers" value={org.officers.length} />
                </div>
                {org.officers.length ? (
                  <ul className="space-y-1 text-sm">
                    {org.officers.map((officer, index) => (
                      <li key={index} className="text-muted-foreground">
                        {(officer.profiles as { full_name: string } | null)?.full_name} —{" "}
                        <span className="text-foreground">{officer.position}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleStatus.mutate({
                      id: org.id,
                      status: org.status === "active" ? "inactive" : "active",
                    })
                  }
                >
                  {org.status === "active" ? "Deactivate" : "Activate"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateOrgDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = orgSchema.safeParse({
        name: form.get("name"),
        acronym: form.get("acronym"),
        adviser: String(form.get("adviser") ?? "") || undefined,
        description: String(form.get("description") ?? "") || undefined,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { error } = await supabase.from("organizations").insert({
        name: parsed.data.name,
        acronym: parsed.data.acronym.toUpperCase(),
        adviser: parsed.data.adviser ?? null,
        description: parsed.data.description ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organization registered");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["organizations-admin"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register organization</DialogTitle>
          <DialogDescription>Add an accredited student organization.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" name="name" required maxLength={120} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acronym">Acronym</Label>
              <Input id="acronym" name="acronym" required maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adviser">Adviser</Label>
              <Input id="adviser" name="adviser" maxLength={100} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} maxLength={1000} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Save organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
