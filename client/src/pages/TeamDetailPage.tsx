import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import type { GameDTO, MemberDTO, PlayerDTO, TeamDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionTitle } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { ConfirmAction } from "@/components/ConfirmAction";
import { ClubTeamCrest } from "@/components/TeamCrest";
import { TeamFormDialog } from "@/components/squad/TeamFormDialog";
import { PlayerFormDialog } from "@/components/squad/PlayerFormDialog";
import { GameRow } from "@/components/games/GameRow";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { capitalize } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);
  const [, navigate] = useLocation();
  const { clubPath, key, can } = useActiveClub();
  const manageTeam = can("teams.manage");
  const manageSquad = can("squad.manage");

  const [teamOpen, setTeamOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerDTO | null>(null);

  const team = useQuery({
    queryKey: key("teams", teamId),
    queryFn: () => api.get<TeamDTO>(clubPath(`/teams/${teamId}`)),
  });
  const players = useQuery({
    queryKey: key("players", teamId),
    queryFn: () => api.get<PlayerDTO[]>(clubPath(`/players?teamId=${teamId}`)),
  });
  const games = useQuery({
    queryKey: key("games", "anteriores", teamId),
    queryFn: () => api.get<GameDTO[]>(clubPath(`/games?when=anteriores&teamId=${teamId}`)),
  });
  const teams = useQuery({ queryKey: key("teams"), queryFn: () => api.get<TeamDTO[]>(clubPath("/teams")) });
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
    enabled: manageSquad,
  });

  const removeTeam = useClubMutation(() => api.delete(clubPath(`/teams/${teamId}`)), {
    success: "Time excluído",
    onSuccess: () => navigate("/times"),
  });
  const removePlayer = useClubMutation((p: PlayerDTO) => api.delete(clubPath(`/players/${p.id}`)), {
    success: "Jogador removido",
  });

  if (team.isLoading) return <LoadingRows />;
  if (!team.data) {
    return (
      <EmptyState
        icon={Users}
        title="Time não encontrado"
        description="Ele pode ter sido excluído."
        action={
          <Button asChild variant="outline">
            <Link href="/times">Ver times</Link>
          </Button>
        }
      />
    );
  }

  const t = team.data;
  const r = t.record;

  return (
    <div>
      <Link href="/times" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Times
      </Link>

      {/* Cabeçalho com as cores do time */}
      <header
        className="relative overflow-hidden rounded-xl p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${t.colorPrimary} 60%, ${t.colorSecondary} 60.2%)` }}
      >
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <div className="relative flex items-center gap-4">
          <ClubTeamCrest abbreviation={t.abbreviation} colorPrimary={t.colorPrimary} colorSecondary={t.colorSecondary} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-bold md:text-4xl">{t.name}</h1>
            <p className="text-white/85">
              {t.category}
              {t.coachName ? `, técnico ${t.coachName}` : ""}
            </p>
          </div>
          {manageTeam ? (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" onClick={() => setTeamOpen(true)} aria-label="Editar time">
                <Pencil className="h-4 w-4" />
              </Button>
              <ConfirmAction
                trigger={
                  <Button size="icon" variant="ghost" className="text-white hover:bg-white/15" aria-label="Excluir time">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
                title={`Excluir ${t.name}?`}
                description="Os jogos deste time serão apagados. Os jogadores continuam no clube, sem time."
                confirmLabel="Excluir time"
                onConfirm={() => removeTeam.mutate(undefined)}
              />
            </div>
          ) : null}
        </div>
        {t.description ? <p className="relative mt-3 text-sm text-white/85">{t.description}</p> : null}
      </header>

      <dl className="mt-4 grid grid-cols-3 divide-x rounded-lg border bg-card text-center sm:grid-cols-6">
        {(
          [
            ["Jogos", r.played],
            ["Vitórias", r.wins],
            ["Empates", r.draws],
            ["Derrotas", r.losses],
            ["Gols pró", r.goalsFor],
            ["Gols contra", r.goalsAgainst],
          ] as const
        ).map(([label, value], i) => (
          <div key={label} className={cn("py-3", i >= 3 && "border-t sm:border-t-0")}>
            <dd className="scoreline text-3xl">{value}</dd>
            <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <SectionTitle
        action={
          manageSquad ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingPlayer(null);
                setPlayerOpen(true);
              }}
            >
              <UserPlus className="mr-1.5 h-4 w-4" /> Adicionar jogador
            </Button>
          ) : undefined
        }
      >
        Elenco
      </SectionTitle>

      {players.isLoading ? (
        <LoadingRows />
      ) : (players.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Users}
          title="Elenco vazio"
          description={manageSquad ? "Adicione os jogadores deste time." : "Os jogadores deste time aparecem aqui."}
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {players.data!.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md font-display text-xl font-bold"
                style={{ backgroundColor: t.colorPrimary, color: "white" }}
                aria-label={p.shirtNumber != null ? `Camisa ${p.shirtNumber}` : "Sem número"}
              >
                {p.shirtNumber ?? "–"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.nickname || p.name}</span>
                  {p.isCaptain ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]" title="Capitão">
                      C
                    </Badge>
                  ) : null}
                  {p.status !== "ativo" ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      {capitalize(p.status)}
                    </Badge>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {p.position}
                  {p.nickname ? `, ${p.name}` : ""}
                </span>
              </span>
              <span className="hidden gap-4 text-center sm:flex">
                <MiniStat label="Jogos" value={p.gamesPlayed} />
                <MiniStat label="Gols" value={p.goals} />
                <MiniStat label="Assist." value={p.assists} />
              </span>
              {manageSquad ? (
                <span className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => {
                      setEditingPlayer(p);
                      setPlayerOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmAction
                    trigger={
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remover ${p.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title={`Remover ${p.name}?`}
                    description="O jogador e os números dele na temporada serão apagados."
                    confirmLabel="Remover jogador"
                    onConfirm={() => removePlayer.mutate(p)}
                  />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {(games.data?.length ?? 0) > 0 ? (
        <>
          <SectionTitle>Últimos jogos</SectionTitle>
          <div className="divide-y rounded-lg border bg-card">
            {games.data!.slice(0, 5).map((g) => (
              <GameRow key={g.id} game={g} />
            ))}
          </div>
        </>
      ) : null}

      {manageTeam ? (
        <TeamFormDialog open={teamOpen} onOpenChange={setTeamOpen} team={t} members={members.data ?? []} />
      ) : null}
      {manageSquad ? (
        <PlayerFormDialog
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          player={editingPlayer}
          teams={teams.data ?? []}
          members={members.data ?? []}
          defaultTeamId={teamId}
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="w-12">
      <span className="scoreline block text-lg">{value}</span>
      <span className="block text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}
