import Link from "next/link";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        href="/dashboard/eventos"
      >
        <ArrowLeft className="size-4" /> Eventos
      </Link>
      <div>
        <p className="text-sm font-semibold text-brand-blue-accessible">
          Novo evento
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
          Informações principais
        </h1>
      </div>
      {query.erro && (
        <Alert variant="destructive">
          <AlertTitle>Dados inválidos</AlertTitle>
          <AlertDescription>
            Confira datas e campos obrigatórios.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <div className="grid size-10 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
            <CalendarPlus className="size-5" />
          </div>
          <CardTitle>Dados do evento</CardTitle>
          <CardDescription>
            O template padrão será criado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/api/admin/events"
            method="post"
            className="grid gap-5 sm:grid-cols-2"
          >
            <Field className="sm:col-span-2" label="Nome público" name="name">
              <Input
                name="name"
                required
                placeholder="Ex.: Congresso de Inovação 2026"
              />
            </Field>
            <Field label="Edição ou turma" name="edition">
              <Input name="edition" placeholder="Edição 2026" />
            </Field>
            <Field label="Modalidade" name="modality">
              <Select name="modality" defaultValue="presencial">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field
              className="sm:col-span-2"
              label="Descrição"
              name="description"
            >
              <Textarea name="description" rows={3} />
            </Field>
            <Field label="Data e hora inicial" name="startsAt">
              <Input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Data e hora final" name="endsAt">
              <Input name="endsAt" type="datetime-local" required />
            </Field>
            <Field label="Local" name="location">
              <Input name="location" placeholder="Curitiba - PR" />
            </Field>
            <Field label="Carga horária" name="workloadHours">
              <Input
                name="workloadHours"
                type="number"
                min="1"
                defaultValue="8"
                required
              />
            </Field>
            <Field label="Organização emissora" name="issuerName">
              <Input name="issuerName" required />
            </Field>
            <Field label="Canal de suporte" name="supportChannel">
              <Input
                name="supportChannel"
                placeholder="suporte@empresa.com"
                required
              />
            </Field>
            <Field label="Nome do signatário" name="signatoryName">
              <Input name="signatoryName" />
            </Field>
            <Field label="Cargo do signatário" name="signatoryRole">
              <Input name="signatoryRole" />
            </Field>
            <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/eventos">Cancelar</Link>
              </Button>
              <Button type="submit">Criar evento</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  name,
  className,
  children,
}: {
  label: string;
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      {children}
    </div>
  );
}
