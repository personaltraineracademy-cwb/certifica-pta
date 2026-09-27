import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const signedIn = Boolean((await cookies()).get("certifica_admin")?.value);
  return (
    <header className="border-b border-border/70 bg-brand-offwhite/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="Página inicial">
          <Brand />
        </Link>
        <nav
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
          aria-label="Principal"
        >
          <Link
            className="transition-colors hover:text-brand-navy"
            href="/emitir"
          >
            Como emitir
          </Link>
          <Link
            className="transition-colors hover:text-brand-navy"
            href="/validar"
          >
            Validar
          </Link>
          <Link
            className="transition-colors hover:text-brand-navy"
            href="/#como-funciona"
          >
            Como funciona
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {!signedIn ? (
            <Button asChild variant="ghost"><Link href="/sign-in">Entrar</Link></Button>
          ) : (
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/dashboard">
                Painel <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
