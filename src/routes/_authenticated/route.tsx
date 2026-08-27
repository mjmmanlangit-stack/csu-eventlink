import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  Award,
  UserCircle,
  LogOut,
  Users,
  Building2,
  FileBarChart,
  Settings,
  Bell,
  Menu,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/hooks/use-auth";
import { ensureProfile } from "@/routes/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["student"] },
  { to: "/org/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["officer"] },
  { to: "/events", label: "Events", icon: CalendarDays, roles: ["student", "officer", "admin"] },
  { to: "/my-events", label: "My Events", icon: CalendarCheck, roles: ["student"] },
  { to: "/evaluations", label: "Evaluations", icon: ClipboardCheck, roles: ["student", "officer"] },
  { to: "/certificates", label: "Certificates", icon: Award, roles: ["student"] },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
  { to: "/organizations", label: "Organizations", icon: Building2, roles: ["admin"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["officer", "admin"] },
  { to: "/system", label: "System Management", icon: Settings, roles: ["admin"] },
  { to: "/profile", label: "Profile", icon: UserCircle, roles: ["student", "officer", "admin"] },
];

function AppLayout() {
  const { session, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  useQuery({
    queryKey: ["ensure-profile"],
    queryFn: async () => {
      await ensureProfile();
      return true;
    },
    enabled: !isLoading && !!session && !session.profile,
    staleTime: Infinity,
  });

  const role = session?.role ?? null;
  const items = role ? NAV.filter((item) => item.roles.includes(role)) : [];

  return (
    <div className="min-h-screen bg-secondary/30">
      <div className="flex">
        <aside className="hidden w-64 shrink-0 lg:block">
          <SidebarContent items={items} session={session} />
        </aside>

        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background px-4">
            <div className="flex items-center gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SidebarContent items={items} session={session} onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="lg:hidden">
                <p className="text-sm font-semibold">CSU EventTrack</p>
              </div>
              <p className="hidden text-sm text-muted-foreground lg:block">
                {session?.organizationName
                  ? session.organizationName
                  : "Catanduanes State University"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsMenu />
              <AccountMenu />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  session,
  onNavigate,
}: {
  items: NavItem[];
  session: ReturnType<typeof useAuth>["session"];
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full min-h-screen flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <QrCode className="h-5 w-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">CSU EventTrack</span>
          <span className="block text-xs opacity-70">Event & Attendance</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "opacity-80 hover:bg-sidebar-accent/60 hover:opacity-100",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4 text-xs">
        <p className="font-medium">{session?.profile?.full_name ?? "—"}</p>
        <p className="mt-0.5 capitalize opacity-70">{session?.role ?? ""}</p>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
  });

  const unread = (data ?? []).filter((n) => !n.read_at).length;

  async function markAllRead() {
    const ids = (data ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]">
              {unread}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 ? (
            <button className="text-xs font-normal text-primary" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {(data ?? []).length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</p>
          ) : (
            (data ?? []).map((n) => (
              <div
                key={n.id}
                className={cn("px-3 py-2.5 text-sm", !n.read_at && "bg-primary/5")}
              >
                <p className="font-medium text-foreground">{n.title}</p>
                {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (session?.profile?.full_name ?? "CSU")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">
            {session?.profile?.full_name ?? "Account"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{session?.profile?.full_name}</p>
          <p className="text-xs font-normal capitalize text-muted-foreground">{session?.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserCircle className="mr-2 h-4 w-4" /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
