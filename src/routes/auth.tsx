import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · CSU Event & Attendance System" },
      {
        name: "description",
        content:
          "Sign in or create a student account to register for Catanduanes State University organization events.",
      },
      { property: "og:title", content: "Sign in · CSU Event & Attendance System" },
      {
        property: "og:description",
        content: "Access your CSU student organization events, QR attendance and certificates.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(3, "Enter your full name").max(120),
  studentNo: z.string().trim().min(3, "Enter your student number").max(40),
  course: z.string().trim().max(120).optional(),
  yearLevel: z.string().trim().max(40).optional(),
});

export async function ensureProfile() {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  await supabase.rpc("bootstrap_profile", {
    _full_name: meta["full_name"] || user.email || "CSU User",
    _email: user.email ?? "",
    _student_no: meta["student_no"] ?? undefined,
    _course: meta["course"] ?? undefined,
    _year_level: meta["year_level"] ?? undefined,
    _department: meta["department"] ?? undefined,
  });
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => setAdminExists(data !== false));
  }, []);

  async function handleLogin(form: FormData) {
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    await ensureProfile();
    setLoading(false);
    navigate({ to: "/dashboard" });
  }

  async function handleRegister(form: FormData) {
    const parsed = registerSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      fullName: form.get("fullName"),
      studentNo: form.get("studentNo"),
      course: form.get("course") || undefined,
      yearLevel: form.get("yearLevel") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.fullName,
          student_no: parsed.data.studentNo,
          course: parsed.data.course ?? null,
          year_level: parsed.data.yearLevel ?? null,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      await ensureProfile();
      toast.success("Account created");
      navigate({ to: "/dashboard" });
    } else {
      toast.success("Account created. Check your email to confirm, then sign in.");
    }
  }

  async function claimAdmin() {
    const { error } = await supabase.rpc("claim_first_admin");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Administrator role assigned to your account");
    setAdminExists(true);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <QrCode className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-foreground">CSU EventTrack</span>
              <span className="block text-xs text-muted-foreground">
                Catanduanes State University
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in with your CSU account or register as a student.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleLogin(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      maxLength={128}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRegister(new FormData(e.currentTarget));
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" name="fullName" required maxLength={120} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="studentNo">Student number</Label>
                      <Input id="studentNo" name="studentNo" required maxLength={40} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearLevel">Year level</Label>
                      <Input id="yearLevel" name="yearLevel" maxLength={40} placeholder="3rd Year" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input id="course" name="course" maxLength={120} placeholder="BS Information Technology" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      maxLength={128}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account…" : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {!adminExists ? (
          <Card className="mt-4 border-accent/50">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent-foreground" />
                Initial system setup
              </div>
              <p className="text-sm text-muted-foreground">
                No administrator exists yet. Sign in first, then claim the administrator role for
                your account.
              </p>
              <Button variant="outline" size="sm" onClick={() => void claimAdmin()}>
                Claim administrator role
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
