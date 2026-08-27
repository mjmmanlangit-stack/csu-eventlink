import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchSessionProfile } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_student")({
  beforeLoad: async () => {
    const session = await fetchSessionProfile();
    if (session?.role !== "student") throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});