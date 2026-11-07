import { MoreVertical } from "lucide-react";
import type { GameDTO } from "@shared/api";
import { COMPETITION_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { gameOutcome, gameSides } from "./GameSides";
import { AttendanceToggle } from "./AttendanceToggle";
import { GameExtras } from "./GameExtras";

const OUTCOME_STYLE = {
  V: "bg-ok text-white",
  E: "bg-warn text-warn-foreground",
  D: "bg-danger text-white",
} as const;
const OUTCOME_LABEL = { V: "Vitória", E: "Empate", D: "Derrota" } as const;

type Actions = {
  onEdit?: () => void;
  onResult?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
};

/** Linha de jogo no estilo súmula: data à esquerda, confronto e placar no centro */
export function GameRow({ game, actions }: { game: GameDTO; actions?: Actions }) {
  const { home, away } = gameSides(game);
  const outcome = gameOutcome(game);
  const finished = game.status === "finalizado";
  const cancelled = game.status === "cancelado";
  const awaitingResult = game.status === "agendado" && new Date(game.startsAt) < new Date();

  return (
    <article className={cn("flex gap-4 px-4 py-4", cancelled && "opacity-60")}>
      <div className="w-12 shrink-0 text-center">
        <div className="scoreline text-3xl">{fmtDate(game.startsAt, "dd")}</div>
        <div className="font-display text-sm font-semibold uppercase text-muted-foreground">
          {fmtDate(game.startsAt, "MMM").replace(".", "")}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <TeamLine name={home.name} crest={home.crest(22)} />
          <Score value={home.score} show={finished} />
          <TeamLine name={away.name} crest={away.crest(22)} />
          <Score value={away.score} show={finished} />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {game.competitionName || COMPETITION_LABELS[game.competition as keyof typeof COMPETITION_LABELS]}
          {", "}
          {fmtTime(game.startsAt)}
          {game.location ? `, ${game.location}` : ""}
        </p>

        {cancelled ? (
          <p className="mt-2 text-xs font-semibold text-danger">Jogo cancelado</p>
        ) : awaitingResult ? (
          <p className="mt-2 text-xs font-semibold text-warn-foreground dark:text-warn">Aguardando resultado</p>
        ) : !finished ? (
          <div className="mt-3 space-y-3">
            <AttendanceToggle game={game} />
            <GameExtras game={game} />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {outcome ? (
          <span
            className={cn("grid h-7 w-7 place-items-center rounded font-display text-sm font-bold", OUTCOME_STYLE[outcome])}
            title={OUTCOME_LABEL[outcome]}
            aria-label={OUTCOME_LABEL[outcome]}
          >
            {outcome}
          </span>
        ) : (
          <span />
        )}
        {actions && Object.values(actions).some(Boolean) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do jogo">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.onResult ? (
                <DropdownMenuItem onSelect={actions.onResult}>
                  {finished ? "Corrigir placar" : "Lançar resultado"}
                </DropdownMenuItem>
              ) : null}
              {actions.onEdit ? <DropdownMenuItem onSelect={actions.onEdit}>Editar jogo</DropdownMenuItem> : null}
              {actions.onCancel && !cancelled && !finished ? (
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
      </div>
    </article>
  );
}

function TeamLine({ name, crest }: { name: string; crest: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {crest}
      <span className="truncate font-medium">{name}</span>
    </div>
  );
}

function Score({ value, show }: { value: number | null; show: boolean }) {
  return <span className="scoreline w-6 text-right text-xl">{show && value != null ? value : ""}</span>;
}
