"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  FileBadge2,
  LayoutDashboard,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/dashboard",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/dashboard/eventos", label: "Eventos", icon: CalendarRange },
  {
    href: "/dashboard/participantes",
    label: "Participantes",
    icon: UsersRound,
  },
  { href: "/dashboard/certificados", label: "Certificados", icon: FileBadge2 },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
];

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Painel">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[transform,background-color,color] duration-200 ease-out active:scale-[.98]",
              active
                ? "bg-white/[0.06] text-sidebar-foreground before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary [&_svg]:text-sidebar-primary"
                : "text-sidebar-foreground/60 hover:translate-x-0.5 hover:bg-white/[0.05] hover:text-sidebar-foreground/90",
            )}
          >
            <link.icon className="size-[1.05rem] transition-colors" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
