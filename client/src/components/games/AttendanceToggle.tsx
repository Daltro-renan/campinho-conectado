import { useState } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import type { GameDTO } from "@shared/api";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { cn } from "@/lib/utils";
import { AttendanceList } from "./AttendanceList";
import { gameTitle } from "./GameSides";

/** "Vou" / "Não vou" — confirmação de presença no jogo */
export function AttendanceToggle({ game, tone = "default" }: { game: GameDTO; tone?: "default" | "pitch" }) {
  const { club, clubPath } = useActiveClub();
  const [listOpen, setListOpen] = useState(false);
  const mutation = useClubMutation((status: "confirmado" | "ausente") =>
    api.put(clubPath(`/games/${game.id}/attendance`), { status }),
  );

  if (game.status !== "agendado") return null;
  const mine = mutation.isPending ? mutation.variables : game.attendance.mine;

  const base =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60";
  const idle =
    tone === "pitch"
      ? "bg-white/10 text-pitch-foreground hover:bg-white/20"
      : "bg-secondary text-secondary-foreground hover:bg-accent";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sua presença">
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className={cn(
          "mr-auto inline-flex items-center gap-1 rounded-full py-1 pr-1 text-xs font-medium underline-offset-2 hover:underline",
          tone === "pitch" ? "text-pitch-foreground/80" : "text-muted-foreground",
        )}
      >
        <span className="scoreline text-base">{game.attendance.confirmed}</span>
        confirmado{game.attendance.confirmed === 1 ? "" : "s"}, ver lista
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={mine === "confirmado"}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate("confirmado")}
        className={cn(base, mine === "confirmado" ? "bg-ok text-white" : idle)}
      >
        <Check className="h-4 w-4" aria-hidden /> Vou
      </button>
      <button
        type="button"
        aria-pressed={mine === "ausente"}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate("ausente")}
        className={cn(base, mine === "ausente" ? "bg-danger text-white" : idle)}
      >
        <X className="h-4 w-4" aria-hidden /> Não vou
      </button>
      <AttendanceList game={listOpen ? game : null} title={gameTitle(game, club)} onOpenChange={setListOpen} />
    </div>
  );
}
