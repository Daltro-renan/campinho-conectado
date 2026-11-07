import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Share2, Users } from "lucide-react";
import { Link } from "wouter";
import type { MemberDTO, RankingResponse } from "@shared/api";
import { PLAYER_POSITIONS } from "@shared/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { ClubTeamCrest } from "@/components/TeamCrest";
import { UserAvatar } from "@/components/UserAvatar";
import { PlayerDialog } from "@/components/squad/PlayerDialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useActiveClub } from "@/lib/club";
import { capitalize } from "@/lib/format";
import { cn } from "@/lib/utils";

const ORDER = [...PLAYER_POSITIONS, "Sem posição"] as const;

/** Elenco: todos os associados do clube, agrupados por posição */
export default function SquadPage() {
  const { club, clubPath, key, can } = useActiveClub();
  const { user } = useAuth();
  const staff = can("squad.manage");
  const [editing, setEditing] = useState<MemberDTO | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
  });

  const groups = useMemo(() => {
    const map = new Map<string, MemberDTO[]>();
    for (const m of members ?? []) {
      const pos = m.position ?? "Sem posição";
      map.set(pos, [...(map.get(pos) ?? []), m]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) || a.name.localeCompare(b.name));
    }
    return ORDER.filter((p) => map.has(p)).map((p) => ({ position: p, members: map.get(p)! }));
  }, [members]);

  const season = String(new Date().getFullYear());
  const ranking = useQuery({
    queryKey: key("ranking", season),
    queryFn: () => api.get<RankingResponse>(clubPath(`/ranking?temporada=${season}`)),
  });
  const statsOf = useMemo(
    () => new Map((ranking.data?.entries ?? []).map((e) => [e.memberId, e])),
    [ranking.data],
  );
  const me = members?.find((m) => m.userId === user?.id);
  const totals = (ranking.data?.entries ?? []).reduce(
    (t, m) => ({ goals: t.goals + m.goals, wins: t.wins + m.wins }),
    { goals: 0, wins: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Elenco"
        description={`Todo associado do clube faz parte do time. Números da temporada ${new Date().getFullYear()}; toque no jogador para ver a ficha e os jogos.`}
      />

      <section className="mb-6 flex items-center gap-4 rounded-lg border bg-card p-4">
        <ClubTeamCrest
          abbreviation={club.abbreviation}
          colorPrimary={club.colorPrimary}
          colorSecondary={club.colorSecondary}
          size={52}
        />
        <dl className="grid flex-1 grid-cols-3 text-center">
          <div>
            <dd className="scoreline text-3xl">{members?.length ?? "–"}</dd>
            <dt className="text-xs text-muted-foreground">Jogadores</dt>
          </div>
          <div>
            <dd className="scoreline text-3xl">{totals.goals}</dd>
            <dt className="text-xs text-muted-foreground">Gols em {season}</dt>
          </div>
          <div>
            <dd className="scoreline text-3xl">{ranking.data?.entries.filter((e) => e.games > 0).length ?? "–"}</dd>
            <dt className="text-xs text-muted-foreground">Já jogaram</dt>
          </div>
        </dl>
      </section>

      {me && (!me.position || !me.avatarUrl) ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
          <p className="text-sm">Complete sua ficha: foto, posição e número da camisa.</p>
          <Button size="sm" onClick={() => setEditing(me)}>
            Completar ficha
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingRows rows={5} />
      ) : (members?.length ?? 0) <= 1 ? (
        <EmptyState
          icon={Users}
          title="Chame a galera para o clube"
          description="Quem entrar com o código de convite aparece aqui automaticamente, já no elenco."
          action={
            can("members.manage") ? (
              <Button asChild>
                <Link href="/clube">
                  <Share2 className="mr-2 h-4 w-4" /> Convidar associados
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {groups.map((g) => (
        <div key={g.position}>
          <SectionTitle>
            {g.position === "Goleiro" ? "Goleiros" : g.position === "Sem posição" ? "Sem posição definida" : `${g.position}s`}
            <span className="ml-2 text-base font-normal text-muted-foreground">{g.members.length}</span>
          </SectionTitle>
          <ul className="divide-y rounded-lg border bg-card">
            {g.members.map((m) => {
              const st = statsOf.get(m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(m)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md font-display text-xl font-bold text-white"
                      style={{ backgroundColor: club.colorPrimary }}
                      aria-label={m.shirtNumber != null ? `Camisa ${m.shirtNumber}` : "Sem número"}
                    >
                      {m.shirtNumber ?? "–"}
                    </span>
                    <UserAvatar name={m.name} url={m.avatarUrl} className="hidden h-9 w-9 sm:flex" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{m.nickname || m.name}</span>
                        {m.isCaptain ? (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]" title="Capitão">
                            C
                          </Badge>
                        ) : null}
                        {m.playerStatus !== "ativo" ? (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {capitalize(m.playerStatus)}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {m.nickname ? m.name : (m.position ?? "Posição não definida")}
                        {m.role !== "jogador" ? ` (${m.role === "tecnico" ? "técnico" : m.role})` : ""}
                      </span>
                    </span>
                    <span className="flex gap-4 text-center">
                      <MiniStat label="Jogos" value={st?.games ?? 0} />
                      <MiniStat label="Vit." value={st?.wins ?? 0} className="hidden sm:block" />
                      <MiniStat label="Gols" value={st?.goals ?? 0} />
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <PlayerDialog member={editing} staff={staff} onOpenChange={(open) => !open && setEditing(null)} />
    </div>
  );
}

function MiniStat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <span className={cn("w-10", className)}>
      <span className="scoreline block text-lg">{value}</span>
      <span className="block text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}
