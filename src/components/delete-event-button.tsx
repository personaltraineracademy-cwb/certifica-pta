"use client";

import { Trash2 } from "lucide-react";
import { deleteEvent } from "@/app/actions/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          <Trash2 className="size-4" /> Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
          <AlertDialogDescription>
            O evento <strong>{eventName}</strong>, participantes, importações,
            template e certificados emitidos serão apagados permanentemente. Os
            códigos excluídos deixarão de funcionar na validação pública. Esta
            ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <form action={deleteEvent}>
            <input type="hidden" name="eventId" value={eventId} />
            <AlertDialogAction type="submit" variant="destructive">
              Excluir tudo
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
