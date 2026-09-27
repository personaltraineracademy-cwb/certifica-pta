import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { DashboardNav } from "@/components/dashboard-nav";
import { requireOrganization } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization } = await requireOrganization();
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-sidebar px-5 py-6 lg:flex">
        <div className="px-1 pb-6">
          <Brand inverse />
        </div>
        <div className="border-t border-white/10 pt-5">
          <Suspense>
            <DashboardNav />
          </Suspense>
        </div>
        <div className="mt-auto border-t border-white/10 px-1 pt-5">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">
            Organização ativa
          </p>
          <p className="mt-1.5 truncate text-sm font-medium text-sidebar-foreground/90">
            {organization.name}
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-17 items-center justify-between border-b bg-brand-offwhite/95 px-5 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="hidden text-sm font-medium lg:block">Painel administrativo</div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {organization.name}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
