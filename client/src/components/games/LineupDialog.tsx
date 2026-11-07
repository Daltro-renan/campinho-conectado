import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shuffle } from "lucide-react";
import type { AttendeeDTO, GameDTO, MemberDTO, Side } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { cn } from "@/lib/utils";
import { gameSideList, sideColors, sideName } from "./GameSides";

type Pick = Side | null;

/** Embaralha (Fisher–Yates) */
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sorteio equilibrado: separa goleiros primeiro e depois distribui os demais
 * sempre no time com menos gente, para nenhum lado ficar com todos da mesma posição.
 */
function drawTeams(players: MemberDTO[], sides: Side[]): Map<number, Side> {
  const result = new Map<number, Side>();
  const keepers = shuffle(players.filter((p) => p.position === "Goleiro"));
  const byPosition = new Map<string, MemberDTO[]>();
  for (const p of players.filter((x) => x.position !== "Goleiro")) {
    const key = p.position ?? "?";
    byPosition.set(key, [...(byPosition.get(key) ?? []), p]);
  }
  const ordered = [...keepers, ...shuffle([...byPosition.values()]).flatMap((group) => shuffle(group))];
  const count = new Map<Side, number>(sides.map((s) => [s, 0]));
  const order = shuffle(sides);
  for (const p of ordered) {
    const min = Math.min(...count.values());
    const side = order.find((s) => count.get(s) === min)!;
    result.set(p.userId, side);
    count.set(side, min + 1);
    order.push(order.splice(order.indexOf(side), 1)[0]);
  }
  return result;
}

/** Montar os times do jogo, jogador por jogador (ou sortear entre quem confirmou presença) */
export function LineupDialog({ game, onOpenChange }: { game: GameDTO | null; onOpenChange: (open: boolean) => void }) {
  const { club, clubPath, key } = useActiveClub();
  const isRacha = game?.kind === "racha" || game?.kind === "torneio";
  const sides = game ? gameSideList(game) : [];
  const [picks, setPicks] = useState<Map<number, Side>>(new Map());

  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
    enabled: !!game,
  });
  const attendance = useQuery({
    queryKey: key("attendance", game?.id),
    queryFn: () => api.get<AttendeeDTO[]>(clubPath(`/games/${game!.id}/attendance`)),
    enabled: !!game,
  });

  useEffect(() => {
    if (game) setPicks(new Map(game.lineup.map((l) => [l.userId, l.side])));
  }, [game]);

  const status = useMemo(
    () => new Map((attendance.data ?? []).map((a) => [a.userId, a.status])),
    [attendance.data],
  );
  const sorted = useMemo(() => {
    const rank = (m: MemberDTO) => (status.get(m.userId) === "confirmado" ? 0 : status.get(m.userId) === "ausente" ? 2 : 1);
    return [...(members.data ?? [])].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  }, [members.data, status]);

  const save = useClubMutation(
    () =>
      api.put(clubPath(`/games/${game!.id}/lineup`), {
        players: [...picks.entries()].map(([userId, side]) => ({ userId, side })),
      }),
    { success: "Escalação salva", onSuccess: () => onOpenChange(false) },
  );

  if (!game) return null;

  const cycle = (userId: number) => {
    const current: Pick = picks.get(userId) ?? null;
    const i = current === null ? -1 : sides.indexOf(current);
    const next: Pick = i + 1 < sides.length ? sides[i + 1] : null;
    const copy = new Map(picks);
    if (next) copy.set(userId, next);
    else copy.delete(userId);
    setPicks(copy);
  };

  const draw = () => {
    const confirmed = sorted.filter((m) => status.get(m.userId) === "confirmado");
    const pool = confirmed.length >= 2 ? confirmed : sorted.filter((m) => picks.has(m.userId));
    if (pool.length < 2) {
      toast.error("Ninguém confirmou presença ainda. Marque os jogadores tocando nos nomes e sorteie de novo.");
      return;
    }
    setPicks(drawTeams(pool, sides));
    toast.success(`Times sorteados com ${pool.length} jogadores`);
  };

  const countOf = (side: Side) => [...picks.values()].filter((s) => s === side).length;
  const countA = countOf("A");

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{isRacha ? "Montar os times" : "Escalação"}</DialogTitle>
          <DialogDescription>
            {isRacha
              ? `Toque no jogador para passar pelos times (${sides.join(", ")}) ou deixar fora. Quem confirmou presença aparece primeiro.`
              : `Toque em quem joga pelo ${club.name}. Quem confirmou presença aparece primeiro.`}
          </DialogDescription>
        </DialogHeader>

        {isRacha ? (
          <div className="flex flex-wrap items-center gap-2">
            {sides.map((s) => (
              <SideCount key={s} label={sideName(game, s)} count={countOf(s)} color={sideColors(club, s).primary} />
            ))}
            <Button type="button" size="sm" variant="outline" className="ml-auto shrink-0" onClick={draw}>
              <Shuffle className="mr-1.5 h-4 w-4" /> Sortear
            </Button>
          </div>
        ) : (
          <p className="text-sm font-medium">{countA} escalado{countA === 1 ? "" : "s"}</p>
        )}

        <ul className="-mx-1 min-h-0 flex-1 divide-y overflow-y-auto px-1">
          {sorted.map((m) => {
            const side = picks.get(m.userId) ?? null;
            const st = status.get(m.userId);
            const c = side ? sideColors(club, side) : null;
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={() => cycle(m.userId)}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                  aria-label={`${m.name}: ${side ? (isRacha ? sideName(game, side) : "escalado") : "fora"}`}
                >
                  <UserAvatar name={m.name} url={m.avatarUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.nickname || m.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.position ?? "Sem posição"}
                      {st === "confirmado" ? ", confirmou presença" : st === "ausente" ? ", não vai" : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "min-w-[4.5rem] rounded-full px-3 py-1 text-center text-xs font-bold",
                      !side && "bg-muted text-muted-foreground",
                    )}
                    style={c ? { backgroundColor: c.primary, color: c.secondary } : undefined}
                  >
                    {side ? (isRacha ? side : "Joga") : "Fora"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate(undefined)}>
            {save.isPending ? "Salvando…" : "Salvar escalação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SideCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm">
      <span className="h-3 w-3 shrink-0 rounded-full border" style={{ backgroundColor: color }} aria-hidden />
      <span className="truncate font-medium">{label}</span>
      <span className="scoreline text-base">{count}</span>
    </span>
  );
}
