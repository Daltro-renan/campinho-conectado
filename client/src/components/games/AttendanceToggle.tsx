import { Check, X } from "lucide-react";
import type { GameDTO } from "@shared/api";
import { api } from "@/lib/api";
import { useClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { cn } from "@/lib/utils";

/** "Vou" / "Não vou" — confirmação de presença no jogo */
export function AttendanceToggle({ game, tone = "default" }: { game: GameDTO; tone?: "default" | "pitch" }) {
  const { clubPath } = useClub();
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
    <div className="flex items-center gap-2" role="group" aria-label="Sua presença">
      <span className={cn("mr-1 text-xs", tone === "pitch" ? "text-pitch-foreground/70" : "text-muted-foreground")}>
        {game.attendance.confirmed} confirmado{game.attendance.confirmed === 1 ? "" : "s"}
      </span>
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
    </div>
  );
}
