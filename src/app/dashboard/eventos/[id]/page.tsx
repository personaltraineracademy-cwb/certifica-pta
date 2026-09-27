import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileBadge2,
  FileSpreadsheet,
  Globe2,
  ShieldCheck,
  Upload,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  addParticipant,
  importParticipants,
  publishEvent,
  revokeCertificate,
  setEligibility,
} from "@/app/actions/admin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CertificateTemplateEditor } from "@/components/certificate-template-editor";
import { EditableEventName } from "@/components/editable-event-name";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CertificateTemplate, Event } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { findRecords, getRecord } from "@/lib/firestore-data";

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  scheduled: "Agendado",
  published: "Publicado",
  closed: "Encerrado",
  archived: "Arquivado",
};
const eligibilityLabel: Record<string, string> = {
  pending: "Pendente",
  eligible: "Elegível",
  ineligible: "Não elegível",
  blocked: "Bloqueado",
  issued: "Emitido",
  revoked: "Revogado",
};

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    erro?: string;
    importados?: string;
    invalidos?: string;
    aba?: string;
    template?: string;
    adicionado?: string;
    nome?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { organization } = await requireOrganization();
  const event = await getRecord<Event>("events", id);
  if (!event || event.organizationId !== organization.id) notFound();

  const [firestoreRegistrations, firestoreCertificates, templates, batches] = await Promise.all([
    findRecords<Record<string, unknown> & { id: string; eventId: string; createdAt?: Date; eligibility: string }>("registrations", { eventId: id }),
    findRecords<Record<string, unknown> & { id: string; registrationId: string; publicCode?: string; status: string }>("certificates", {}),
    findRecords<CertificateTemplate>("certificate_templates", { eventId: id }),
    findRecords<{
      id: string;
      eventId: string;
      filename: string;
      validRows: number;
      invalidRows: number;
      createdAt: Date;
    }>("import_batches", { eventId: id }),
  ]);
  const template = templates.sort((a, b) => b.version - a.version)[0];
  const certificateByRegistration = new Map(
    firestoreCertificates.filter((item) => item.status === "valid").map((item) => [item.registrationId, item]),
  );
  const participantRows = firestoreRegistrations
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, 100)
    .map((item) => {
      const certificate = certificateByRegistration.get(item.id);
      return {
        id: item.id,
        name: item.confirmedName as string | null,
        originalName: item.originalName as string | null,
        email: item.participantEmail as string | null,
        buyerEmail: item.buyerEmail as string,
        eligibility: item.eligibility,
        certificateId: certificate?.id ?? null,
        certificateCode: certificate?.publicCode ?? null,
        certificateStatus: certificate?.status ?? null,
      };
    });
  const stats = {
    total: firestoreRegistrations.length,
    eligible: firestoreRegistrations.filter((item) => item.eligibility === "eligible").length,
    issued: firestoreRegistrations.filter((item) => item.eligibility === "issued").length,
  };
  batches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).splice(5);
  const hasTemplateBackground = Boolean(
    template?.backgroundData || template?.backgroundStoragePath,
  );
  const readiness =
    [
      Boolean(event.name),
      Boolean(event.supportChannel),
      stats.eligible > 0,
      hasTemplateBackground,
    ].filter(Boolean).length * 25;
  return (
    <div className="space-y-7">
      <Link
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/dashboard/eventos"
      >
        <ArrowLeft className="size-4" /> Eventos
      </Link>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-3">
            <Badge
              className={
                event.status === "published" ? "bg-semantic-success" : ""
              }
              variant={event.status === "published" ? "default" : "secondary"}
            >
              {statusLabel[event.status]}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">
              /{event.slug}
            </span>
          </div>
          <EditableEventName eventId={event.id} name={event.name} />
          <p className="mt-2 text-sm text-muted-foreground">
            {event.startsAt.toLocaleDateString("pt-BR")} · {event.modality} ·{" "}
            {event.workloadHours} horas
          </p>
        </div>
        <div className="flex gap-2">
          {event.status === "published" && (
            <Button asChild variant="outline">
              <Link href={`/emitir/${organization.slug}/${event.slug}`}>
                <Globe2 className="size-4" /> Página de emissão
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={`/api/admin/events/${event.id}/report`}>
              <Download className="size-4" /> Exportar
            </a>
          </Button>
        </div>
      </div>
      {event.status !== "published" &&
        query.erro === "publicacao-incompleta" && (
        <Alert variant="destructive">
          <AlertTitle>Publicação bloqueada</AlertTitle>
          <AlertDescription>
            É necessário ter suporte, template e ao menos um participante
            elegível.
          </AlertDescription>
        </Alert>
        )}
      {query.erro === "template-invalido" && (
        <Alert variant="destructive">
          <AlertTitle>Template inválido</AlertTitle>
          <AlertDescription>
            Envie um PNG ou JPG em paisagem, com até 10 MB.
          </AlertDescription>
        </Alert>
      )}
      {query.erro === "email-invalido" && (
        <Alert variant="destructive">
          <AlertTitle>E-mail inválido</AlertTitle>
          <AlertDescription>
            Confira o endereço informado e tente novamente.
          </AlertDescription>
        </Alert>
      )}
      {query.erro === "nome-invalido" && (
        <Alert variant="destructive">
          <AlertTitle>Nome inválido</AlertTitle>
          <AlertDescription>
            Informe um nome entre 3 e 140 caracteres.
          </AlertDescription>
        </Alert>
      )}
      {query.nome === "salvo" && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Nome atualizado</AlertTitle>
          <AlertDescription>
            O novo nome já aparece no painel e nas próximas emissões.
          </AlertDescription>
        </Alert>
      )}
      {query.template === "salvo" && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Template salvo</AlertTitle>
          <AlertDescription>
            A prévia abaixo será usada nos próximos certificados.
          </AlertDescription>
        </Alert>
      )}
      {query.adicionado && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Participante adicionado</AlertTitle>
          <AlertDescription>
            O e-mail já está elegível para emitir o certificado.
          </AlertDescription>
        </Alert>
      )}
      {query.importados && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Importação concluída</AlertTitle>
          <AlertDescription>
            {query.importados} registros válidos e {query.invalidos ?? 0}{" "}
            inválidos.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon={UsersRound} label="Participantes" value={stats.total} />
        <Summary icon={ShieldCheck} label="Elegíveis" value={stats.eligible} />
        <Summary icon={FileBadge2} label="Emitidos" value={stats.issued} />
      </div>
      <Tabs
        defaultValue={
          query.aba === "template" || query.erro === "template-invalido"
            ? "template"
            : "participants"
        }
        className="space-y-5"
      >
        <TabsList>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
          <TabsTrigger value="template">Certificado</TabsTrigger>
          <TabsTrigger value="publish">Publicar</TabsTrigger>
        </TabsList>
        <TabsContent value="participants">
          <Card>
            <CardHeader className="gap-5">
              <div>
                <CardTitle>Participantes</CardTitle>
                <CardDescription>
                  Adicione um e-mail manualmente ou importe uma planilha.
                </CardDescription>
              </div>
              <form
                action={addParticipant}
                className="flex flex-col gap-3 rounded-xl border bg-muted p-4 sm:flex-row sm:items-end"
              >
                <input type="hidden" name="eventId" value={event.id} />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="participant-email">
                    E-mail do participante
                  </Label>
                  <Input
                    id="participant-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="participante@exemplo.com"
                    required
                  />
                </div>
                <Button type="submit">
                  <UserPlus className="size-4" /> Adicionar participante
                </Button>
              </form>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Participante</TableHead>
                    <TableHead>Elegibilidade</TableHead>
                    <TableHead>Certificado</TableHead>
                    <TableHead className="pr-6 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participantRows.length ? (
                    participantRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="pl-6">
                          <p className="font-medium">
                            {row.name ?? row.originalName ?? "Nome pendente"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.email ?? row.buyerEmail}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {eligibilityLabel[row.eligibility]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.certificateCode ? (
                            <Link
                              className="font-mono text-xs text-brand-blue-accessible hover:underline"
                              href={`/validar/${row.certificateCode}`}
                            >
                              {row.certificateCode.slice(0, 18)}…
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Não emitido
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex justify-end gap-2">
                            {row.certificateId ? (
                              <form
                                action={revokeCertificate}
                                className="flex gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="certificateId"
                                  value={row.certificateId}
                                />
                                <input
                                  type="hidden"
                                  name="eventId"
                                  value={event.id}
                                />
                                <Input
                                  className="h-8 w-32"
                                  name="reason"
                                  placeholder="Motivo"
                                  required
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  type="submit"
                                >
                                  Revogar
                                </Button>
                              </form>
                            ) : (
                              <form
                                action={setEligibility}
                                className="flex gap-2"
                              >
                                <input
                                  type="hidden"
                                  name="registrationId"
                                  value={row.id}
                                />
                                <input
                                  type="hidden"
                                  name="eventId"
                                  value={event.id}
                                />
                                <Select
                                  name="eligibility"
                                  defaultValue={
                                    row.eligibility === "issued" ||
                                    row.eligibility === "revoked"
                                      ? "pending"
                                      : row.eligibility
                                  }
                                >
                                  <SelectTrigger className="h-8 w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      Pendente
                                    </SelectItem>
                                    <SelectItem value="eligible">
                                      Elegível
                                    </SelectItem>
                                    <SelectItem value="ineligible">
                                      Não elegível
                                    </SelectItem>
                                    <SelectItem value="blocked">
                                      Bloqueado
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="submit"
                                >
                                  Salvar
                                </Button>
                              </form>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-28 text-center text-muted-foreground"
                      >
                        Nenhum participante cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent
          value="import"
          className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"
        >
          <Card>
            <CardHeader>
              <CardTitle>Importar e-mails</CardTitle>
              <CardDescription>
                CSV ou XLSX até 10 MB. Somente o e-mail é utilizado; todo o
                restante é ignorado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={importParticipants} className="space-y-5">
                <input type="hidden" name="eventId" value={event.id} />
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <Upload className="mx-auto size-7 text-brand-blue-accessible" />
                  <Label htmlFor="file" className="mt-3 block">
                    Selecione CSV ou XLSX
                  </Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".csv,.xlsx"
                    className="mt-4"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  <FileSpreadsheet className="size-4" /> Importar e-mails
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Única coluna necessária</CardTitle>
              <CardDescription>
                Os participantes ficam elegíveis automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted p-4">
                <code className="text-sm font-semibold text-brand-navy">
                  email
                </code>
                <p className="mt-2 text-sm text-muted-foreground">
                  Exemplo: participante@exemplo.com
                </p>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Também reconhecemos <code>email_participante</code> e{" "}
                <code>email_compra</code>. Outras colunas são descartadas.
              </p>
              {batches.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Última importação
                  </p>
                  <p className="mt-1 text-sm">{batches[0].filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {batches[0].validRows} válidos · {batches[0].invalidRows}{" "}
                    inválidos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="template">
          <CertificateTemplateEditor
            eventId={event.id}
            imageUrl={
              hasTemplateBackground
                ? `/api/admin/events/${event.id}/template-image`
                : null
            }
            filename={template?.backgroundFilename ?? null}
            config={
              template?.config ?? {
                accent: "#0079FD",
                orientation: "landscape",
              }
            }
          />
        </TabsContent>
        <TabsContent value="publish">
          <Card>
            <CardHeader>
              <CardTitle>Checklist de publicação</CardTitle>
              <CardDescription>Prontidão atual do evento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Configuração concluída</span>
                  <span>{readiness}%</span>
                </div>
                <Progress value={readiness} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Check ok={Boolean(event.name)} text="Dados do evento" />
                <Check ok={stats.eligible > 0} text="Participantes elegíveis" />
                <Check ok={hasTemplateBackground} text="Template configurado" />
                <Check
                  ok={Boolean(event.supportChannel)}
                  text="Canal de suporte"
                />
              </div>
              <form action={publishEvent}>
                <input type="hidden" name="eventId" value={event.id} />
                <Button
                  type="submit"
                  disabled={readiness < 100 || event.status === "published"}
                >
                  {event.status === "published"
                    ? "Evento publicado"
                    : "Publicar emissão"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="size-5 text-brand-blue-accessible" />
      </CardContent>
    </Card>
  );
}
function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
      <CheckCircle2
        className={`size-4 ${ok ? "text-semantic-success" : "text-neutral-300"}`}
      />
      {text}
    </div>
  );
}
