import { requireOrganization } from "@/lib/auth";

export default async function SettingsPage() {
  const { organization } = await requireOrganization();
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand-blue-accessible">
          Organização
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
          Configurações
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dados da organização e acesso administrativo.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <dl className="grid gap-5 p-6 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">Nome</dt><dd className="mt-1 font-medium">{organization.name}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Identificador</dt><dd className="mt-1 font-mono text-sm">{organization.slug}</dd></div>
          <div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Autenticação</dt><dd className="mt-1 font-medium">Firebase Authentication — confirmação de e-mail desativada</dd></div>
        </dl>
      </div>
    </div>
  );
}
