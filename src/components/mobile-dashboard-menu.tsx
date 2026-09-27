"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileDashboardMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-white/10 p-6">
          <Brand inverse />
          <SheetTitle className="sr-only">Menu do painel</SheetTitle>
          <SheetDescription className="sr-only">
            Navegação principal do painel administrativo.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-3">
          <DashboardNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
