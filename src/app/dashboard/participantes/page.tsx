import { desc, eq } from "drizzle-orm";
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
import { getDb } from "@/db";
import { events, registrations } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";

export default async function ParticipantsPage() {
  const { organization } = await requireOrganization();
  const rows = await getDb()
    .select({
      id: registrations.id,
      name: registrations.confirmedName,
      originalName: registrations.originalName,
      email: registrations.participantEmail,
      buyerEmail: registrations.buyerEmail,
      eligibility: registrations.eligibility,
      eventName: events.name,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(eq(events.organizationId, organization.id))
    .orderBy(desc(registrations.createdAt))
    .limit(100);
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
