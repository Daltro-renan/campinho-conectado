import { toast } from "sonner";
import { CalendarDays, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActiveClub } from "@/lib/club";
import { googleCalendarSubscribeUrl } from "@/lib/google-links";

/** Assinar a agenda do clube: todos os jogos aparecem no Google Agenda e se atualizam sozinhos */
export function CalendarSubscribe() {
  const { club } = useActiveClub();
  if (!club.calendarUrl) return null;

  return (
    <section className="mt-8 flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <CalendarDays className="hidden h-8 w-8 shrink-0 text-primary sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Jogos do clube na sua agenda</p>
        <p className="text-sm text-muted-foreground">
          Assine uma vez e todos os jogos marcados aparecem no Google Agenda, atualizados sozinhos.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={googleCalendarSubscribeUrl(club.calendarUrl)} target="_blank" rel="noreferrer">
            Assinar no Google Agenda
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            navigator.clipboard
              .writeText(club.calendarUrl)
              .then(() => toast.success("Link da agenda copiado (funciona também no iPhone e Outlook)"))
          }
        >
          <Copy className="mr-1.5 h-4 w-4" /> Copiar link
        </Button>
      </div>
    </section>
  );
}
