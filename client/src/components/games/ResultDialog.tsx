import { useEffect, useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import type { GameDTO, LineupPlayer } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { gameSides, sideName } from "./GameSides";

type Stats = Record<number, { goals: number; assists: number }>;

/**
 * Lançar o resultado: placar e, para cada escalado, gols e assistências.
 * Esses números alimentam o ranking da temporada automaticamente.
 */
export function ResultDialog({
  game,
  onOpenChange,
}: {
  game: GameDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { club, clubPath } = useActiveClub();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    if (!game) return;
    const sides = gameSides(game, club);
    setHome(sides.home.score != null ? String(sides.home.score) : "");
    setAway(sides.away.score != null ? String(sides.away.score) : "");
    setStats(Object.fromEntries(game.lineup.map((l) => [l.userId, { goals: l.goals, assists: l.assists }])));
  }, [game, club]);

  // Soma dos gols lançados por lado, para conferir com o placar
  const sumGoals = (side: "A" | "B") =>
    (game?.lineup ?? []).filter((l) => l.side === side).reduce((s, l) => s + (stats[l.userId]?.goals ?? 0), 0);

  const save = useClubMutation(
    () => {
      if (!game) return Promise.resolve();
      const homeN = Number(home);
      const awayN = Number(away);
      // No racha: casa = Time A. Contra adversário: converte para "clube" x "adversário".
      const teamScore = game.kind === "racha" || game.isHome ? homeN : awayN;
      const opponentScore = game.kind === "racha" || game.isHome ? awayN : homeN;
      return api.put(clubPath(`/games/${game.id}/result`), {
        teamScore,
        opponentScore,
        players: Object.entries(stats).map(([userId, s]) => ({ userId: Number(userId), ...s })),
      });
    },
    { success: "Resultado lançado. O ranking já foi atualizado.", onSuccess: () => onOpenChange(false) },
  );

  if (!game) return null;
  const sides = gameSides(game, club);
  const valid = home !== "" && away !== "";
  const groups: { side: "A" | "B"; title: string; players: LineupPlayer[] }[] =
    game.kind === "racha"
      ? (["A", "B"] as const).map((s) => ({ side: s, title: sideName(game, s), players: game.lineup.filter((l) => l.side === s) }))
      : [{ side: "A", title: club.name, players: game.lineup }];

  const bump = (userId: number, field: "goals" | "assists", delta: number) =>
    setStats((prev) => {
      const cur = prev[userId] ?? { goals: 0, assists: 0 };
      return { ...prev, [userId]: { ...cur, [field]: Math.max(0, cur[field] + delta) } };
    });

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Resultado</DialogTitle>
          <DialogDescription>Placar final e quem fez os gols.</DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
            <ScoreInput label={sides.home.name} crest={sides.home.crest(44)} value={home} onChange={setHome} />
            <span className="scoreline pt-8 text-3xl text-muted-foreground">×</span>
            <ScoreInput label={sides.away.name} crest={sides.away.crest(44)} value={away} onChange={setAway} />
          </div>

          {game.lineup.length === 0 ? (
            <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Sem escalação: só o placar será salvo. Monte os times antes para contar gols, vitórias e jogos no ranking.
            </p>
          ) : (
            <div className="-mx-1 mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              {groups.map((g) => (
                <section key={g.side}>
                  <h3 className="mb-1 flex items-center justify-between font-display text-lg font-semibold">
                    {g.title}
                    {game.kind === "racha" ? (
                      <span className="text-xs font-normal text-muted-foreground">{sumGoals(g.side)} gol(s) lançado(s)</span>
                    ) : null}
                  </h3>
                  <ul className="divide-y rounded-lg border">
                    {g.players.map((p) => (
                      <li key={p.userId} className="flex items-center gap-2 px-3 py-2">
                        <UserAvatar name={p.name} url={p.avatarUrl} className="h-8 w-8" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nickname || p.name}</span>
                        <Stepper
                          label="Gols"
                          value={stats[p.userId]?.goals ?? 0}
                          onChange={(d) => bump(p.userId, "goals", d)}
                        />
                        <Stepper
                          label="Assist."
                          value={stats[p.userId]?.assists ?? 0}
                          onChange={(d) => bump(p.userId, "assists", d)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar resultado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  return (
    <span className="flex flex-col items-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="flex items-center">
        <button
          type="button"
          onClick={() => onChange(-1)}
          disabled={value === 0}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent disabled:opacity-30"
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="scoreline w-5 text-center text-lg">{value}</span>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent"
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
    </span>
  );
}

function ScoreInput({
  label,
  crest,
  value,
  onChange,
}: {
  label: string;
  crest: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-2 text-center">
      {crest}
      <span className="line-clamp-1 text-sm font-medium">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-16 w-20 text-center font-display text-4xl font-bold"
        aria-label={`Gols de ${label}`}
      />
    </label>
  );
}
