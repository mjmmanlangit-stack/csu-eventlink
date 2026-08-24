import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Field } from "@/components/app/ui-bits";
import { Pill } from "@/components/app/status-badge";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile · CSU EventTrack" },
      {
        name: "description",
        content: "Manage your student or officer profile details for CSU event registration and certificates.",
      },
      { property: "og:title", content: "My Profile · CSU EventTrack" },
      { property: "og:description", content: "Keep your academic details up to date." },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Full name is required").max(100),
  student_no: z.string().trim().max(30).optional(),
  course: z.string().trim().max(80).optional(),
  year_level: z.string().trim().max(30).optional(),
  department: z.string().trim().max(80).optional(),
});

function ProfilePage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const parsed = profileSchema.safeParse({
        full_name: form.get("full_name"),
        student_no: String(form.get("student_no") ?? "") || undefined,
        course: String(form.get("course") ?? "") || undefined,
        year_level: String(form.get("year_level") ?? "") || undefined,
        department: String(form.get("department") ?? "") || undefined,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.full_name,
          student_no: parsed.data.student_no ?? null,
          course: parsed.data.course ?? null,
          year_level: parsed.data.year_level ?? null,
          department: parsed.data.department ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["session-profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const profile = session?.profile;

  return (
    <div className="max-w-3xl">
      <PageHeader title="My Profile" description="Your account details and academic information." />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Email" value={profile?.email ?? session?.user.email ?? "—"} />
            <Field label="Role" value={<Pill tone="primary">{session?.role ?? "student"}</Pill>} />
            <Field
              label="Organization"
              value={session?.organizationName ?? "—"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal information</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  required
                  maxLength={100}
                  defaultValue={profile?.full_name ?? ""}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student_no">Student number</Label>
                  <Input
                    id="student_no"
                    name="student_no"
                    maxLength={30}
                    defaultValue={profile?.student_no ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course / Program</Label>
                  <Input id="course" name="course" maxLength={80} defaultValue={profile?.course ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year_level">Year level</Label>
                  <Input
                    id="year_level"
                    name="year_level"
                    maxLength={30}
                    defaultValue={profile?.year_level ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department / College</Label>
                  <Input
                    id="department"
                    name="department"
                    maxLength={80}
                    defaultValue={profile?.department ?? ""}
                  />
                </div>
              </div>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
