import { CalendarPlus, MapPin, Navigation } from "lucide-react";
import { googleCalendarUrl, mapsDirectionsUrl } from "@/lib/google-links";
import type { GameDTO } from "@shared/api";
import { COMPETITION_LABELS } from "@shared/validation";
import { daysUntil, fmtGameDay, fmtTime } from "@/lib/format";
import { gameSides } from "./GameSides";
import { useActiveClub } from "@/lib/club";
import { AttendanceToggle } from "./AttendanceToggle";

/**
 * O placar do próximo jogo — o destaque da tela inicial.
 * Fundo de gramado com a linha do meio e o círculo central.
 */
export function Scoreboard({ game }: { game: GameDTO }) {
  const { club } = useActiveClub();
  const { home, away } = gameSides(game, club);
  const days = daysUntil(game.startsAt);
  const countdown = days <= 0 ? "É hoje" : days === 1 ? "É amanhã" : `Faltam ${days} dias`;

  return (
    <section
      aria-label="Próximo jogo"
      className="pitch-markings overflow-hidden rounded-xl text-pitch-foreground shadow-lg shadow-pitch/20"
    >
      <div className="flex items-center justify-between px-5 pt-4 text-sm">
        <span className="font-semibold">
          {game.kind === "racha"
            ? "Racha do clube"
            : game.competitionName || COMPETITION_LABELS[game.competition as keyof typeof COMPETITION_LABELS]}
        </span>
        <span className="rounded-full bg-warn px-2.5 py-0.5 text-xs font-bold text-warn-foreground">
          {countdown}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          {home.crest(64)}
          <span className="line-clamp-2 font-display text-lg font-semibold leading-tight">{home.name}</span>
        </div>
        <div className="flex flex-col items-center px-1 text-center">
          <span className="scoreline text-5xl md:text-6xl">{fmtTime(game.startsAt)}</span>
          <span className="mt-1 font-display text-lg font-medium text-pitch-foreground/80">
            {fmtGameDay(game.startsAt)}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          {away.crest(64)}
          <span className="line-clamp-2 font-display text-lg font-semibold leading-tight">{away.name}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-pitch-line bg-black/15 px-5 py-3">
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-pitch-foreground/85">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{game.location || "Local a definir"}</span>
        </span>
        <AttendanceToggle game={game} tone="pitch" />
      </div>
      <div className="flex flex-wrap gap-2 bg-black/15 px-5 pb-3">
        <a
          href={googleCalendarUrl(game, club)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden /> Adicionar à agenda
        </a>
        {game.location ? (
          <a
            href={mapsDirectionsUrl(game.location)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
          >
            <Navigation className="h-4 w-4" aria-hidden /> Como chegar
          </a>
        ) : null}
      </div>
    </section>
  );
}
