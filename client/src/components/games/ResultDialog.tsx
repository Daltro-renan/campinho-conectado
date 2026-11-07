import { useEffect, useState, type FormEvent } from "react";
import { Minus, Plus, Trash2, Trophy } from "lucide-react";
import type { GameDTO, LineupPlayer, Side } from "@shared/api";
import { standings } from "@shared/standings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { SideCrest, gameSideList, gameSides, sideName } from "./GameSides";

type Stats = Record<number, { goals: number; assists: number }>;
type MatchForm = { key: number; homeSide: Side; awaySide: Side; homeScore: string; awayScore: string };
let matchKey = 0;

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
  const [matches, setMatches] = useState<MatchForm[]>([]);
  const isTournament = game?.kind === "torneio";

  useEffect(() => {
    if (!game) return;
    const sides = gameSides(game, club);
    setHome(sides.home.score != null ? String(sides.home.score) : "");
    setAway(sides.away.score != null ? String(sides.away.score) : "");
    setStats(Object.fromEntries(game.lineup.map((l) => [l.userId, { goals: l.goals, assists: l.assists }])));
    setMatches(
      game.matches.map((m) => ({
        key: ++matchKey,
        homeSide: m.homeSide,
        awaySide: m.awaySide,
        homeScore: String(m.homeScore),
        awayScore: String(m.awayScore),
      })),
    );
  }, [game, club]);

  // Soma dos gols lançados por lado, para conferir com o placar
  const sumGoals = (side: Side) =>
    (game?.lineup ?? []).filter((l) => l.side === side).reduce((s, l) => s + (stats[l.userId]?.goals ?? 0), 0);

  const save = useClubMutation(
    () => {
      if (!game) return Promise.resolve();
      const players = Object.entries(stats).map(([userId, s]) => ({ userId: Number(userId), ...s }));
      if (game.kind === "torneio") {
        return api.put(clubPath(`/games/${game.id}/result`), {
          matches: matches.map((m) => ({
            homeSide: m.homeSide,
            awaySide: m.awaySide,
            homeScore: Number(m.homeScore),
            awayScore: Number(m.awayScore),
          })),
          players,
        });
      }
      const homeN = Number(home);
      const awayN = Number(away);
      // No racha: casa = Time A. Contra adversário: converte para "clube" x "adversário".
      const teamScore = game.kind === "racha" || game.isHome ? homeN : awayN;
      const opponentScore = game.kind === "racha" || game.isHome ? awayN : homeN;
      return api.put(clubPath(`/games/${game.id}/result`), {
        teamScore,
        opponentScore,
        players,
      });
    },
    { success: "Resultado lançado. O ranking já foi atualizado.", onSuccess: () => onOpenChange(false) },
  );

  if (!game) return null;
  const sides = gameSides(game, club);
  const teamSides = gameSideList(game);
  const valid = isTournament
    ? matches.length > 0 && matches.every((m) => m.homeScore !== "" && m.awayScore !== "" && m.homeSide !== m.awaySide)
    : home !== "" && away !== "";
  const groups: { side: Side; title: string; players: LineupPlayer[] }[] =
    game.kind === "externo"
      ? [{ side: "A", title: club.name, players: game.lineup }]
      : teamSides.map((s) => ({ side: s, title: sideName(game, s), players: game.lineup.filter((l) => l.side === s) }));
  const table = isTournament
    ? standings(
        game.teams,
        matches
          .filter((m) => m.homeScore !== "" && m.awayScore !== "")
          .map((m) => ({ ...m, homeScore: Number(m.homeScore), awayScore: Number(m.awayScore) })),
      )
    : [];

  const setMatch = (key: number, patch: Partial<MatchForm>) =>
    setMatches((list) => list.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  const addMatch = () => {
    const last = matches[matches.length - 1];
    setMatches([
      ...matches,
      {
        key: ++matchKey,
        homeSide: last?.awaySide ?? teamSides[0],
        awaySide: teamSides.find((s) => s !== (last?.awaySide ?? teamSides[0]) && s !== last?.homeSide) ?? teamSides[1],
        homeScore: "",
        awayScore: "",
      },
    ]);
  };
  const roundRobin = () => {
    const list: MatchForm[] = [];
    for (let i = 0; i < teamSides.length; i++)
      for (let j = i + 1; j < teamSides.length; j++)
        list.push({ key: ++matchKey, homeSide: teamSides[i], awaySide: teamSides[j], homeScore: "", awayScore: "" });
    setMatches(list);
  };

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
          <DialogDescription>
            {isTournament ? "Lance cada partida do torneio e quem fez os gols." : "Placar final e quem fez os gols."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {isTournament ? (
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Partidas</h3>
                {matches.length === 0 ? (
                  <Button type="button" size="sm" variant="outline" onClick={roundRobin}>
                    Todos contra todos
                  </Button>
                ) : null}
              </div>
              <ul className="space-y-2">
                {matches.map((m, i) => (
                  <li key={m.key} className="flex items-center gap-1.5 rounded-lg border p-2">
                    <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                    <TeamSelect game={game} value={m.homeSide} onChange={(v) => setMatch(m.key, { homeSide: v })} />
                    <MiniScore value={m.homeScore} onChange={(v) => setMatch(m.key, { homeScore: v })} label="Gols do mandante" />
                    <span className="text-muted-foreground">×</span>
                    <MiniScore value={m.awayScore} onChange={(v) => setMatch(m.key, { awayScore: v })} label="Gols do visitante" />
                    <TeamSelect game={game} value={m.awaySide} onChange={(v) => setMatch(m.key, { awaySide: v })} />
                    <button
                      type="button"
                      onClick={() => setMatches(matches.filter((x) => x.key !== m.key))}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                      aria-label={`Remover partida ${i + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={addMatch}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar partida
              </Button>
              {table.some((t) => t.played > 0) ? (
                <p className="flex items-center gap-1.5 rounded-md bg-warn/15 px-3 py-2 text-sm">
                  <Trophy className="h-4 w-4 text-warn" aria-hidden />
                  Líder: <strong>{table[0].name}</strong>, {table[0].points} pts
                </p>
              ) : null}
            </section>
          ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
            <ScoreInput label={sides.home.name} crest={sides.home.crest(44)} value={home} onChange={setHome} />
            <span className="scoreline pt-8 text-3xl text-muted-foreground">×</span>
            <ScoreInput label={sides.away.name} crest={sides.away.crest(44)} value={away} onChange={setAway} />
          </div>
          )}

          {game.lineup.length === 0 ? (
            <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Sem escalação: só o placar será salvo. Monte os times antes para contar gols, vitórias e jogos no ranking.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {groups.map((g) => (
                <section key={g.side}>
                  <h3 className="mb-1 flex items-center justify-between font-display text-lg font-semibold">
                    {g.title}
                    {game.kind !== "externo" ? (
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
          </div>

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

function TeamSelect({ game, value, onChange }: { game: GameDTO; value: Side; onChange: (v: Side) => void }) {
  const { club } = useActiveClub();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Side)}>
      <SelectTrigger className="h-9 min-w-0 flex-1 px-2 text-xs" aria-label="Time">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {gameSideList(game).map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-2">
              <SideCrest club={club} side={s} size={18} />
              {sideName(game, s)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MiniScore({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-11 shrink-0 px-1 text-center font-display text-lg font-bold"
      aria-label={label}
    />
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
