import { CalendarPlus, MapPin, Navigation } from "lucide-react";
import { googleCalendarUrl, mapsDirectionsUrl } from "@/lib/google-links";
import type { GameDTO } from "@shared/api";
import { COMPETITION_LABELS } from "@shared/validation";
import { daysUntil, fmtGameDay, fmtTime } from "@/lib/format";
import { SideCrest, gameSideList, gameSides, sideName } from "./GameSides";
import { useActiveClub } from "@/lib/club";
import { AttendanceToggle } from "./AttendanceToggle";

/**
 * O próximo jogo — o destaque da tela inicial: um estádio à noite,
 * com os refletores acesos e o gramado embaixo.
 */
export function Scoreboard({ game }: { game: GameDTO }) {
  const { club } = useActiveClub();
  const days = daysUntil(game.startsAt);
  const countdown = days <= 0 ? "É hoje" : days === 1 ? "É amanhã" : `Faltam ${days} dias`;
  const label =
    game.kind === "racha"
      ? "Racha do clube"
      : game.kind === "torneio"
        ? game.competitionName || "Torneio"
        : game.competitionName || COMPETITION_LABELS[game.competition as keyof typeof COMPETITION_LABELS];

  return (
    <section
      aria-label="Próximo jogo"
      className="overflow-hidden rounded-2xl border border-white/10 bg-[hsl(211_55%_11%)] text-white shadow-xl shadow-black/30"
    >
      <div className="stadium relative">
        <div className="flex items-center justify-between px-4 pt-3.5 text-sm">
          <span className="font-semibold text-white/90">{label}</span>
          <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-gold-foreground shadow">
            {countdown}
          </span>
        </div>

        {game.kind === "torneio" ? (
          <div className="flex flex-col items-center px-4 pb-6 pt-4 text-center">
            <ul className="flex flex-wrap justify-center gap-2" aria-label="Times do torneio">
              {gameSideList(game).map((s) => (
                <li key={s} className="flex flex-col items-center gap-1">
                  <SideCrest club={club} side={s} size={40} />
                  <span className="max-w-[4.5rem] truncate text-xs font-medium text-white/90">{sideName(game, s)}</span>
                </li>
              ))}
            </ul>
            <span className="scoreline mt-3 text-5xl drop-shadow">{fmtTime(game.startsAt)}</span>
            <span className="font-display text-base font-medium text-white/80">{fmtGameDay(game.startsAt)}</span>
          </div>
        ) : (
          <Matchup game={game} />
        )}
      </div>

      <div className="space-y-3 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-white/85">
          <MapPin className="h-4 w-4 shrink-0 text-gold" aria-hidden />
          <span className="truncate">{game.location || "Local a definir"}</span>
        </p>
        <AttendanceToggle game={game} tone="pitch" />
        <div className="grid grid-cols-2 gap-2">
          <a
            href={googleCalendarUrl(game, club)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Agenda
          </a>
          {game.location ? (
            <a
              href={mapsDirectionsUrl(game.location)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10"
            >
              <Navigation className="h-4 w-4" aria-hidden /> Como chegar
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Matchup({ game }: { game: GameDTO }) {
  const { club } = useActiveClub();
  const { home, away } = gameSides(game, club);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pb-7 pt-5">
      <div className="flex flex-col items-center gap-2 text-center">
        {home.crest(62)}
        <span className="line-clamp-2 font-display text-base font-semibold leading-tight drop-shadow">{home.name}</span>
      </div>
      <div className="flex flex-col items-center px-1 text-center">
        <span className="scoreline text-5xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] md:text-6xl">{fmtTime(game.startsAt)}</span>
        <span className="mt-1 font-display text-base font-medium text-white/80">{fmtGameDay(game.startsAt)}</span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        {away.crest(62)}
        <span className="line-clamp-2 font-display text-base font-semibold leading-tight drop-shadow">{away.name}</span>
      </div>
    </div>
  );
}
