import { useState } from "react";
import { ChevronDown, ClipboardList, MoreVertical, Users } from "lucide-react";
import type { GameDTO, LineupPlayer } from "@shared/api";
import { COMPETITION_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/UserAvatar";
import { fmtDate, fmtGameDay, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useActiveClub } from "@/lib/club";
import { gameOutcome, gameSides, sideColors, sideName } from "./GameSides";
import { AttendanceToggle } from "./AttendanceToggle";
import { GameExtras } from "./GameExtras";

const OUTCOME_STYLE = {
  V: "bg-ok text-white",
  E: "bg-warn text-warn-foreground",
  D: "bg-danger text-white",
} as const;
const OUTCOME_LABEL = { V: "Vitória", E: "Empate", D: "Derrota" } as const;

type Actions = {
  onLineup?: () => void;
  onEdit?: () => void;
  onResult?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
};

/** Cartão de jogo: data, confronto com placar, escalação e ações */
export function GameRow({ game, actions }: { game: GameDTO; actions?: Actions }) {
  const { club } = useActiveClub();
  const [showLineup, setShowLineup] = useState(false);
  const { home, away } = gameSides(game, club);
  const outcome = gameOutcome(game);
  const finished = game.status === "finalizado";
  const cancelled = game.status === "cancelado";
  const scheduled = game.status === "agendado";
  const awaitingResult = scheduled && new Date(game.startsAt) < new Date();
  const isRacha = game.kind === "racha";
  const kindLabel = isRacha
    ? "Racha"
    : game.competitionName || COMPETITION_LABELS[game.competition as keyof typeof COMPETITION_LABELS];
  const winner = finished && isRacha && game.teamScore != null && game.opponentScore != null
    ? game.teamScore > game.opponentScore ? "A" : game.teamScore < game.opponentScore ? "B" : null
    : null;

  return (
    <article className={cn("rounded-xl border bg-card", cancelled && "opacity-60")}>
      {/* Faixa superior: quando e que tipo de jogo */}
      <header className="flex items-center gap-2 border-b px-4 py-2 text-xs">
        <span className="font-semibold">{fmtGameDay(game.startsAt)}</span>
        <span className="text-muted-foreground">
          {fmtDate(game.startsAt, "dd/MM")}, {fmtTime(game.startsAt)}
        </span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 font-semibold",
            isRacha ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
          )}
        >
          {kindLabel}
        </span>
        {actions && Object.values(actions).some(Boolean) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mr-2 h-7 w-7" aria-label="Ações do jogo">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.onLineup && !cancelled ? (
                <DropdownMenuItem onSelect={actions.onLineup}>{isRacha ? "Montar os times" : "Escalação"}</DropdownMenuItem>
              ) : null}
              {actions.onResult && !cancelled ? (
                <DropdownMenuItem onSelect={actions.onResult}>
                  {finished ? "Corrigir resultado" : "Lançar resultado"}
                </DropdownMenuItem>
              ) : null}
              {actions.onEdit ? <DropdownMenuItem onSelect={actions.onEdit}>Editar jogo</DropdownMenuItem> : null}
              {actions.onCancel && scheduled ? (
                <DropdownMenuItem onSelect={actions.onCancel}>Cancelar jogo</DropdownMenuItem>
              ) : null}
              {actions.onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={actions.onDelete} className="text-destructive focus:text-destructive">
                    Excluir jogo
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </header>

      {/* Confronto */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-4">
        <Side name={home.name} crest={home.crest(36)} won={winner === "A"} />
        <div className="flex min-w-[5.5rem] flex-col items-center">
          {finished ? (
            <span className="scoreline text-4xl">
              {home.score ?? "–"}
              <span className="mx-1.5 text-2xl text-muted-foreground">×</span>
              {away.score ?? "–"}
            </span>
          ) : (
            <span className="font-display text-xl font-semibold text-muted-foreground">×</span>
          )}
          {outcome ? (
            <span className={cn("mt-1 rounded px-2 py-0.5 text-[11px] font-bold", OUTCOME_STYLE[outcome])}>
              {OUTCOME_LABEL[outcome]}
            </span>
          ) : winner === null && finished && isRacha ? (
            <span className="mt-1 rounded bg-warn px-2 py-0.5 text-[11px] font-bold text-warn-foreground">Empate</span>
          ) : null}
        </div>
        <Side name={away.name} crest={away.crest(36)} won={winner === "B"} align="end" />
      </div>

      {game.location ? (
        <p className="-mt-2 px-4 pb-3 text-center text-xs text-muted-foreground">{game.location}</p>
      ) : null}

      {cancelled ? (
        <p className="border-t px-4 py-2.5 text-xs font-semibold text-danger">Jogo cancelado</p>
      ) : null}

      {awaitingResult && actions?.onResult ? (
        <div className="flex items-center gap-2 border-t bg-warn/10 px-4 py-2.5">
          <span className="flex-1 text-xs font-semibold">Aguardando resultado</span>
          <Button size="sm" onClick={actions.onResult}>
            Lançar resultado
          </Button>
        </div>
      ) : null}

      {/* Escalação */}
      {game.lineup.length > 0 ? (
        <div className="border-t">
          <button
            type="button"
            onClick={() => setShowLineup((v) => !v)}
            aria-expanded={showLineup}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm"
          >
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
            <AvatarStack players={game.lineup} />
            <span className="flex-1 text-xs text-muted-foreground">
              {game.lineup.length} jogador{game.lineup.length === 1 ? "" : "es"} escalado{game.lineup.length === 1 ? "" : "s"}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showLineup && "rotate-180")} />
          </button>
          {showLineup ? (
            <div className={cn("grid gap-3 px-4 pb-4", isRacha && "grid-cols-2")}>
              {(isRacha ? (["A", "B"] as const) : (["A"] as const)).map((s) => {
                const c = sideColors(club, s);
                return (
                  <div key={s}>
                    {isRacha ? (
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full border" style={{ backgroundColor: c.primary }} aria-hidden />
                        {sideName(game, s)}
                      </p>
                    ) : null}
                    <ul className={cn("space-y-1", !isRacha && "grid grid-cols-2 gap-x-3 space-y-0 gap-y-1")}>
                      {game.lineup
                        .filter((l) => l.side === s)
                        .map((l) => (
                          <li key={l.userId} className="flex items-center gap-2 text-sm">
                            <UserAvatar name={l.name} url={l.avatarUrl} className="h-6 w-6 text-[10px]" />
                            <span className="min-w-0 flex-1 truncate">{l.nickname || l.name.split(" ")[0]}</span>
                            {l.goals > 0 ? (
                              <span className="text-xs font-semibold" title={`${l.goals} gol(s)`}>
                                {"⚽".repeat(Math.min(l.goals, 3))}
                                {l.goals > 3 ? `×${l.goals}` : ""}
                              </span>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : scheduled && actions?.onLineup ? (
        <button
          type="button"
          onClick={actions.onLineup}
          className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent/50"
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
          {isRacha ? "Montar os times" : "Escalar jogadores"}
        </button>
      ) : null}

      {scheduled && !awaitingResult ? (
        <div className="space-y-3 border-t px-4 py-3">
          <AttendanceToggle game={game} />
          <GameExtras game={game} />
        </div>
      ) : null}
    </article>
  );
}

function Side({
  name,
  crest,
  won,
  align = "start",
}: {
  name: string;
  crest: React.ReactNode;
  won?: boolean;
  align?: "start" | "end";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "end" && "flex-row-reverse text-right")}>
      {crest}
      <span className={cn("line-clamp-2 font-display text-lg font-semibold leading-tight", won && "text-ok")}>{name}</span>
    </div>
  );
}

function AvatarStack({ players }: { players: LineupPlayer[] }) {
  const shown = players.slice(0, 5);
  return (
    <span className="flex -space-x-2">
      {shown.map((p) => (
        <UserAvatar key={p.userId} name={p.name} url={p.avatarUrl} className="h-6 w-6 border-2 border-card text-[9px]" />
      ))}
    </span>
  );
}
