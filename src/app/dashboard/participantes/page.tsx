import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Event, Registration } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { findRecords, listRecords } from "@/lib/firestore-data";

export default async function ParticipantsPage() {
  const { organization } = await requireOrganization();
  const [events, registrations] = await Promise.all([
    findRecords<Event>("events", { organizationId: organization.id }),
    listRecords<Registration>("registrations"),
  ]);
  const eventById = new Map(events.map((event) => [event.id, event]));
  const rows = registrations
    .filter((item) => eventById.has(item.eventId))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100)
    .map((item) => ({
      id: item.id,
      name: item.confirmedName,
      originalName: item.originalName,
      email: item.participantEmail,
      buyerEmail: item.buyerEmail,
      eligibility: item.eligibility,
      eventName: eventById.get(item.eventId)!.name,
    }));
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand-blue-accessible">
          Base consolidada
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
          Participantes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Registros recentes em todos os eventos.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{rows.length} participantes</CardTitle>
          <CardDescription>
            Importe e altere elegibilidade dentro de cada evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 font-medium">
                      {row.name ?? row.originalName ?? "Pendente"}
                    </TableCell>
                    <TableCell>{row.eventName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email ?? row.buyerEmail}
                    </TableCell>
                    <TableCell className="pr-6">
                      <Badge variant="outline">{row.eligibility}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Nenhum participante.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
