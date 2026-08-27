import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { fetchSessionProfile } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async () => {
    const session = await fetchSessionProfile();
    if (session?.role !== "admin") throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});