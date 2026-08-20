import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "student" | "officer" | "admin";

export type SessionProfile = {
  user: User;
  role: Role;
  organizationId: string | null;
  organizationName: string | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    student_no: string | null;
    course: string | null;
    year_level: string | null;
    department: string | null;
    status: string;
  } | null;
};

export async function fetchSessionProfile(): Promise<SessionProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const [{ data: profile }, { data: roles }, { data: officer }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase
      .from("organization_officers")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const roleList = (roles ?? []).map((r) => r.role as Role);
  const role: Role = roleList.includes("admin")
    ? "admin"
    : roleList.includes("officer")
      ? "officer"
      : "student";

  return {
    user,
    role,
    organizationId: officer?.organization_id ?? null,
    organizationName:
      (officer?.organizations as { name: string } | null | undefined)?.name ?? null,
    profile: (profile as SessionProfile["profile"]) ?? null,
  };
}

export function useAuth() {
  const query = useQuery({
    queryKey: ["session-profile"],
    queryFn: fetchSessionProfile,
    staleTime: 30_000,
  });

  return {
    ...query,
    session: query.data ?? null,
    role: query.data?.role ?? null,
    userId: query.data?.user.id ?? null,
  };
}