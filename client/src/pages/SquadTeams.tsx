import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, UserPlus, UserMinus, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SquadTeam, Player, Team } from "@shared/schema";
import BottomNav from "@/components/BottomNav";

const squadTeamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  associationId: z.number(),
  coachId: z.number().optional(),
});

type SquadTeamForm = z.infer<typeof squadTeamSchema>;

export default function SquadTeams() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);

  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";
  const isTecnico = user?.role === "tecnico";

  const { data: associations = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: squadTeams = [], isLoading } = useQuery<SquadTeam[]>({
    queryKey: ["/api/squad-teams"],
  });

  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: teamPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/squad-teams", selectedTeam, "players"],
    enabled: selectedTeam !== null,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: SquadTeamForm) =>
      apiRequest("/api/squad-teams", "POST", {
        ...data,
        createdBy: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams"] });
      setIsCreateOpen(false);
      toast({
        title: "Time criado!",
        description: "Time de categoria criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/squad-teams/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams"] });
      toast({
        title: "Time excluído!",
        description: "Time removido com sucesso.",
      });
    },
  });

  const addPlayerMutation = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: number; playerId: number }) =>
      apiRequest(`/api/squad-teams/${teamId}/players/${playerId}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams", selectedTeam, "players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setIsPlayerDialogOpen(false);
      toast({
        title: "Jogador adicionado!",
        description: "Jogador adicionado ao time com sucesso.",
      });
    },
  });

  const removePlayerMutation = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: number; playerId: number }) =>
      apiRequest(`/api/squad-teams/${teamId}/players/${playerId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams", selectedTeam, "players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Jogador removido!",
        description: "Jogador removido do time com sucesso.",
      });
    },
  });

  const form = useForm<SquadTeamForm>({
    resolver: zodResolver(squadTeamSchema),
    defaultValues: {
      name: "",
      category: "",
      associationId: associations[0]?.id || 1,
    },
  });

  const onSubmit = (data: SquadTeamForm) => {
    createTeamMutation.mutate(data);
  };

  const availablePlayers = allPlayers.filter(
    (player) => !player.squadTeamId || player.squadTeamId !== selectedTeam
  );

  const selectedSquadTeam = squadTeams.find((team) => team.id === selectedTeam);
  const canManageTeam = isAdmin || (isTecnico && selectedSquadTeam?.coachId === user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/50 border-b border-primary/20">
        <div className="max-w-lg mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-white">Times de Categoria</h1>
          </div>
          {isAdmin && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="button-create-team">
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Time
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 text-white border-primary/20">
                <DialogHeader>
                  <DialogTitle>Criar Time de Categoria</DialogTitle>
                  <DialogDescription>Adicione um novo time (Sub-17, Sub-20, etc)</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Time</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Sub-17"
                              data-testid="input-team-name"
                              className="bg-gray-800 border-primary/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Sub-17, Juvenil, Profissional"
                              data-testid="input-team-category"
                              className="bg-gray-800 border-primary/20"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="associationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associação</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-association" className="bg-gray-800 border-primary/20">
                                <SelectValue placeholder="Selecione a associação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {associations.map((assoc) => (
                                <SelectItem key={assoc.id} value={assoc.id.toString()}>
                                  {assoc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="button-submit-team">
                        Criar Time
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {isLoading ? (
          <Card className="bg-gray-900/50 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">Carregando times...</p>
            </CardContent>
          </Card>
        ) : squadTeams.length === 0 ? (
          <Card className="bg-gray-900/50 border-primary/20">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-semibold text-gray-300 mb-2">Nenhum time cadastrado</p>
              <p className="text-sm text-gray-500">Crie times de categoria para organizar seus jogadores</p>
            </CardContent>
          </Card>
        ) : (
          squadTeams.map((team) => (
            <Card key={team.id} className="bg-gray-900/50 border-primary/20 hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white">{team.name}</CardTitle>
                    <CardDescription className="text-gray-400">{team.category}</CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTeamMutation.mutate(team.id)}
                      disabled={deleteTeamMutation.isPending}
                      data-testid={`button-delete-team-${team.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedTeam(team.id);
                  }}
                  data-testid={`button-view-team-${team.id}`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Ver Jogadores
                </Button>
              </CardContent>
            </Card>
          ))
        )}

        {selectedTeam && (
          <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
            <DialogContent className="bg-gray-900 text-white border-primary/20 max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedSquadTeam?.name} - Jogadores</DialogTitle>
                <DialogDescription>{selectedSquadTeam?.category}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {canManageTeam && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsPlayerDialogOpen(true)}
                    data-testid="button-add-player"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Adicionar Jogador
                  </Button>
                )}
                {teamPlayers.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Nenhum jogador neste time</p>
                ) : (
                  teamPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    >
                      <div>
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-sm text-gray-400">{player.position}</p>
                      </div>
                      {canManageTeam && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            removePlayerMutation.mutate({ teamId: selectedTeam, playerId: player.id })
                          }
                          data-testid={`button-remove-player-${player.id}`}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isPlayerDialogOpen && selectedTeam && (
          <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
            <DialogContent className="bg-gray-900 text-white border-primary/20">
              <DialogHeader>
                <DialogTitle>Adicionar Jogador</DialogTitle>
                <DialogDescription>Selecione um jogador para adicionar ao time</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Todos os jogadores já estão em times</p>
                ) : (
                  availablePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer"
                      onClick={() => addPlayerMutation.mutate({ teamId: selectedTeam, playerId: player.id })}
                      data-testid={`player-option-${player.id}`}
                    >
                      <div>
                        <p className="font-semibold text-white">{player.name}</p>
                        <p className="text-sm text-gray-400">{player.position}</p>
                      </div>
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
