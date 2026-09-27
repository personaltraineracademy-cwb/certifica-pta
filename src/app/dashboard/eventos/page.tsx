import Link from "next/link";
import { CalendarRange, CheckCircle2, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteEventButton } from "@/components/delete-event-button";
import type { Event } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { findRecords, listRecords } from "@/lib/firestore-data";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ excluido?: string }>;
}) {
  const [{ organization }, query] = await Promise.all([
    requireOrganization(),
    searchParams,
  ]);
  const [eventRows, registrationRows] = await Promise.all([
    findRecords<Event>("events", { organizationId: organization.id }),
    listRecords<{ id: string; eventId: string }>("registrations"),
  ]);
  const participantCounts = new Map<string, number>();
  for (const registration of registrationRows) {
    participantCounts.set(registration.eventId, (participantCounts.get(registration.eventId) ?? 0) + 1);
  }
  const rows = eventRows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((event) => ({ ...event, participants: participantCounts.get(event.id) ?? 0 }));

  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-blue-accessible">
            Gestão
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
            Eventos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure participantes, certificado e publicação.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/eventos/novo">
            <Plus className="size-4" /> Novo evento
          </Link>
        </Button>
      </div>

      {query.excluido && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Evento excluído</AlertTitle>
          <AlertDescription>
            O evento, participantes e certificados relacionados foram removidos.
          </AlertDescription>
        </Alert>
      )}

      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((event) => (
            <Card
              key={event.id}
              className="transition-colors hover:border-brand-blue-border"
            >
              <CardContent className="py-5">
                <Link
                  href={`/dashboard/eventos/${event.id}`}
                  className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid size-11 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
                      <CalendarRange className="size-5" />
                    </div>
                    <Badge
                      variant={
                        event.status === "published" ? "default" : "secondary"
                      }
                      className={
                        event.status === "published"
                          ? "bg-semantic-success"
                          : ""
                      }
                    >
                      {event.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-lg font-semibold">{event.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.edition ?? "Sem edição"} · {event.modality}
                  </p>
                </Link>
                <div className="mt-5 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex gap-4">
                    <span>{event.startsAt.toLocaleDateString("pt-BR")}</span>
                    <span>{event.participants} participantes</span>
                  </div>
                  <DeleteEventButton
                    eventId={event.id}
                    eventName={event.name}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarRange className="mx-auto size-9 text-neutral-300" />
            <h2 className="mt-4 font-semibold">Nenhum evento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie o primeiro evento da organização.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
