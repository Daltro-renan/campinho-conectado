import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, CalendarX, Shield } from "lucide-react";
import { Link } from "wouter";
import type { GameDTO, TeamDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { ConfirmAction } from "@/components/ConfirmAction";
import { GameRow } from "@/components/games/GameRow";
import { GameFormDialog } from "@/components/games/GameFormDialog";
import { ResultDialog } from "@/components/games/ResultDialog";
import { CalendarSubscribe } from "@/components/games/CalendarSubscribe";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";

type When = "proximos" | "anteriores";

export default function GamesPage() {
  const { clubPath, key, can } = useActiveClub();
  const manage = can("squad.manage");
  const [when, setWhen] = useState<When>("proximos");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GameDTO | null>(null);
  const [resultFor, setResultFor] = useState<GameDTO | null>(null);
  const [deleting, setDeleting] = useState<GameDTO | null>(null);

  const games = useQuery({
    queryKey: key("games", when),
    queryFn: () => api.get<GameDTO[]>(clubPath(`/games?when=${when}`)),
  });
  const teams = useQuery({
    queryKey: key("teams"),
    queryFn: () => api.get<TeamDTO[]>(clubPath("/teams")),
  });

  const cancel = useClubMutation(
    (game: GameDTO) => api.patch(clubPath(`/games/${game.id}`), { status: "cancelado" }),
    { success: "Jogo cancelado" },
  );
  const remove = useClubMutation((game: GameDTO) => api.delete(clubPath(`/games/${game.id}`)), {
    success: "Jogo excluído",
    onSuccess: () => setDeleting(null),
  });

  const hasTeams = (teams.data?.length ?? 0) > 0;
  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Jogos"
        actions={
          manage && hasTeams ? (
            <Button onClick={openNew}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Marcar jogo
            </Button>
          ) : null
        }
      />

      <Tabs value={when} onValueChange={(v) => setWhen(v as When)} className="mb-4">
        <TabsList>
          <TabsTrigger value="proximos">Próximos</TabsTrigger>
          <TabsTrigger value="anteriores">Resultados</TabsTrigger>
        </TabsList>
      </Tabs>

      {games.isLoading ? (
        <LoadingRows />
      ) : !hasTeams && manage ? (
        <EmptyState
          icon={Shield}
          title="Cadastre um time primeiro"
          description="Os jogos são marcados para os times do clube (Principal, Sub-17, Veteranos…)."
          action={
            <Button asChild>
              <Link href="/times">Cadastrar time</Link>
            </Button>
          }
        />
      ) : (games.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={when === "proximos" ? "Nenhum jogo marcado" : "Nenhum resultado ainda"}
          description={
            when === "proximos"
              ? manage
                ? "Marque o próximo jogo para o elenco confirmar presença."
                : "Quando a comissão marcar um jogo, ele aparece aqui."
              : "Os jogos já disputados aparecem aqui com o placar."
          }
          action={
            manage && when === "proximos" ? (
              <Button onClick={openNew}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Marcar jogo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {games.data!.map((g) => (
            <GameRow
              key={g.id}
              game={g}
              actions={
                manage
                  ? {
                      onResult: () => setResultFor(g),
                      onEdit: () => {
                        setEditing(g);
                        setFormOpen(true);
                      },
                      onCancel: () => cancel.mutate(g),
                      onDelete: () => setDeleting(g),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <CalendarSubscribe />

      {manage ? (
        <>
          <GameFormDialog open={formOpen} onOpenChange={setFormOpen} teams={teams.data ?? []} game={editing} />
          <ResultDialog game={resultFor} onOpenChange={(open) => !open && setResultFor(null)} />
          {deleting ? (
            <DeleteGameDialog game={deleting} onCancel={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting)} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Confirmação controlada (aberta a partir do menu do jogo) */
function DeleteGameDialog({
  game,
  onCancel,
  onConfirm,
}: {
  game: GameDTO;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const opponent = game.opponentTeam?.name ?? game.opponentName ?? "adversário";
  return (
    <ConfirmAction
      open
      onOpenChange={(open) => !open && onCancel()}
      title="Excluir este jogo?"
      description={`${game.team.name} x ${opponent} será apagado junto com as confirmações de presença. Para manter o histórico, prefira cancelar o jogo.`}
      confirmLabel="Excluir jogo"
      onConfirm={onConfirm}
    />
  );
}
