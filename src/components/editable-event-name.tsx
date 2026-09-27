"use client";

import { useState } from "react";
import { Check, PencilLine, X } from "lucide-react";
import { updateEventName } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditableEventName({
  eventId,
  name,
}: {
  eventId: string;
  name: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <h1 className="text-3xl font-semibold tracking-[-.04em]">{name}</h1>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground hover:text-brand-blue-accessible"
          aria-label="Editar nome do evento"
          title="Editar nome"
          onClick={() => setEditing(true)}
        >
          <PencilLine className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form
      action={updateEventName}
      className="mt-3 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Label htmlFor="event-name" className="sr-only">
        Nome do evento
      </Label>
      <Input
        id="event-name"
        name="name"
        defaultValue={name}
        minLength={3}
        maxLength={140}
        required
        autoFocus
        className="h-11 min-w-0 flex-1 font-heading text-lg font-semibold"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          <Check className="size-4" /> Salvar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
        >
          <X className="size-4" /> Cancelar
        </Button>
      </div>
    </form>
  );
}
