import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listCertificates } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, EmptyState, formatDate } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_authenticated/_student/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates · CSU EventTrack" },
      {
        name: "description",
        content: "View and print certificates of participation earned from CSU organization events.",
      },
      { property: "og:title", content: "Certificates · CSU EventTrack" },
      { property: "og:description", content: "Your certificates of participation." },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { session } = useAuth();

  const { data, error, isLoading } = useQuery({
    queryKey: ["certificates", session?.user.id],
    enabled: !!session,
    queryFn: () => listCertificates({ studentId: session!.user.id }),
  });

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Certificates of participation issued for events you attended."
        actions={
          data?.length ? (
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              Print all
            </Button>
          ) : undefined
        }
      />
      {isLoading ? <EmptyState title="Loading certificates..." /> : error ? (
        <EmptyState title="Unable to load certificates" description={error.message} />
      ) : !data?.length ? (
        <EmptyState
          title="No certificates yet"
          description="Attend an event and submit its evaluation to earn a certificate."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.map((cert) => (
            <Card key={cert.id} className="overflow-hidden border-2 border-primary/25">
              <CardContent className="space-y-4 bg-secondary/40 p-8 text-center">
                <Award className="mx-auto h-10 w-10 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Catanduanes State University
                </p>
                <h2 className="font-heading text-lg font-semibold">Certificate of Participation</h2>
                <p className="text-sm text-muted-foreground">is hereby awarded to</p>
                <p className="text-xl font-semibold text-foreground">
                  {session?.profile?.full_name}
                </p>
                <p className="text-sm text-muted-foreground">for participating in</p>
                <p className="text-base font-medium">{cert.events?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.events?.organizations?.name} · {formatDate(cert.events?.starts_at)}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="font-mono">{cert.certificate_no}</span>
                  <span>Issued {formatDate(cert.issued_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
