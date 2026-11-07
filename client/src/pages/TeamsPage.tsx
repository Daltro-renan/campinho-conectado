import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Shield } from "lucide-react";
import type { MemberDTO, TeamDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { ClubTeamCrest } from "@/components/TeamCrest";
import { TeamFormDialog } from "@/components/squad/TeamFormDialog";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";

export default function TeamsPage() {
  const { clubPath, key, can } = useActiveClub();
  const manage = can("teams.manage");
  const [open, setOpen] = useState(false);

  const teams = useQuery({ queryKey: key("teams"), queryFn: () => api.get<TeamDTO[]>(clubPath("/teams")) });
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
    enabled: manage,
  });

  return (
    <div>
      <PageHeader
        title="Times"
        description="As equipes e categorias do clube."
        actions={
          manage ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo time
            </Button>
          ) : null
        }
      />

      {teams.isLoading ? (
        <LoadingRows />
      ) : (teams.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Shield}
          title="Nenhum time cadastrado"
          description={
            manage
              ? "Cadastre o time principal e as categorias (Sub-17, Veteranos…) para montar o elenco e marcar jogos."
              : "A diretoria ainda não cadastrou os times do clube."
          }
          action={
            manage ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Cadastrar time
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {teams.data!.map((t) => (
            <li key={t.id}>
              <Link href={`/times/${t.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-accent/50">
                <ClubTeamCrest
                  abbreviation={t.abbreviation}
                  colorPrimary={t.colorPrimary}
                  colorSecondary={t.colorSecondary}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl font-semibold">{t.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {t.category}, {t.playerCount} jogador{t.playerCount === 1 ? "" : "es"}
                    {t.coachName ? `, técnico ${t.coachName}` : ""}
                  </span>
                </span>
                <span className="hidden text-right sm:block" aria-label="Vitórias, empates e derrotas">
                  <span className="scoreline text-lg">
                    {t.record.wins}-{t.record.draws}-{t.record.losses}
                  </span>
                  <span className="block text-xs text-muted-foreground">V-E-D</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {manage ? <TeamFormDialog open={open} onOpenChange={setOpen} members={members.data ?? []} /> : null}
    </div>
  );
}
