import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, QrCode, ClipboardCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CSU Event & Attendance Management System" },
      {
        name: "description",
        content:
          "Register for student organization events at Catanduanes State University, record attendance with QR codes, submit evaluations and claim certificates.",
      },
      { property: "og:title", content: "CSU Event & Attendance Management System" },
      {
        property: "og:description",
        content:
          "One platform for CSU student organizations: event approval, registration, QR attendance, evaluations, certificates and reports.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Discover & register",
    text: "Browse published organization events and reserve your slot in a few clicks.",
  },
  {
    icon: QrCode,
    title: "QR attendance",
    text: "Your personal event QR code is scanned by officers to record attendance.",
  },
  {
    icon: ClipboardCheck,
    title: "Evaluate",
    text: "Attendees submit event evaluations that officers review per event.",
  },
  {
    icon: Award,
    title: "Get certified",
    text: "Certificates are issued once attendance and evaluation requirements are met.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">CSU EventTrack</p>
              <p className="text-xs text-muted-foreground">Catanduanes State University</p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Student Organization Events
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            QR code-enabled event and attendance management for CSU organizations
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            A single platform for students, organization officers and administrators — from event
            approval and registration to QR attendance, evaluations, certificates and reports.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "register" }}>
                Create student account
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <Card key={step.title} className="border-border/70 bg-card">
                <CardContent className="p-6">
                  <span className="inline-flex rounded-md bg-primary/10 p-2 text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-4 text-base font-semibold text-foreground">{step.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          Catanduanes State University · Office of Student Affairs and Services
        </div>
      </footer>
    </div>
  );
}
