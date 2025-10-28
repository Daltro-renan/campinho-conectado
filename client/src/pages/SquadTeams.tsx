import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, UserPlus, Trophy, Edit, CheckCircle, XCircle, Crown, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { SquadTeam, Player } from "@shared/schema";
import BottomNav from "@/components/BottomNav";

const squadTeamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  abbreviation: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  description: z.string().optional(),
  clubId: z.number(),
});

const playerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  position: z.string().min(1, "Posição é obrigatória"),
  jerseyNumber: z.coerce.number().int().positive().optional(),
  photo: z.string().url().optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  teamRole: z.enum(["capitao", "diretor_time", "jogador"]),
  squadTeamId: z.number(),
});

type SquadTeamForm = z.infer<typeof squadTeamSchema>;
type PlayerForm = z.infer<typeof playerSchema>;

export default function SquadTeams() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<SquadTeam | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<SquadTeam | null>(null);
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const isPresidente = user?.role === "presidente";
  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";
  const clubId = 1;

  const { data: squadTeams = [], isLoading } = useQuery<SquadTeam[]>({
    queryKey: ["/api/squad-teams"],
  });

  const { data: allPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const teamForm = useForm<SquadTeamForm>({
    resolver: zodResolver(squadTeamSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      category: "",
      description: "",
      clubId: 1,
    },
  });

  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      position: "",
      jerseyNumber: undefined,
      photo: "",
      status: "active",
      teamRole: "jogador",
      squadTeamId: 0,
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: SquadTeamForm) =>
      apiRequest("/api/squad-teams", "POST", {
        ...data,
        createdBy: user?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams"] });
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      teamForm.reset();
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

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SquadTeamForm> }) =>
      apiRequest(`/api/squad-teams/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/squad-teams"] });
      setIsTeamDialogOpen(false);
      setEditingTeam(null);
      teamForm.reset();
      toast({
        title: "Time atualizado!",
        description: "Informações do time atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar time",
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

  const createPlayerMutation = useMutation({
    mutationFn: async (data: PlayerForm) =>
      apiRequest("/api/players", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setIsPlayerDialogOpen(false);
      setEditingPlayer(null);
      playerForm.reset();
      toast({
        title: "Jogador criado!",
        description: "Jogador adicionado ao time com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar jogador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PlayerForm> }) =>
      apiRequest(`/api/players/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      setEditingPlayer(null);
      setIsPlayerDialogOpen(false);
      playerForm.reset();
      toast({
        title: "Jogador atualizado!",
        description: "Informações do jogador atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar jogador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/players/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Jogador excluído!",
        description: "Jogador removido do time com sucesso.",
      });
    },
  });

  const onSubmitTeam = (data: SquadTeamForm) => {
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const onSubmitPlayer = (data: PlayerForm) => {
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, data });
    } else {
      createPlayerMutation.mutate(data);
    }
  };

  const handleOpenTeamDialog = (team?: SquadTeam) => {
    if (team) {
      setEditingTeam(team);
      teamForm.reset({
        name: team.name,
        abbreviation: team.abbreviation || "",
        category: team.category,
        description: team.description || "",
        clubId: team.clubId,
      });
    } else {
      setEditingTeam(null);
      teamForm.reset({
        name: "",
        abbreviation: "",
        category: "",
        description: "",
        clubId: 1,
      });
    }
    setIsTeamDialogOpen(true);
  };

  const handleOpenPlayerDialog = (team: SquadTeam, player?: Player) => {
    setSelectedTeam(team);
    if (player) {
      setEditingPlayer(player);
      playerForm.reset({
        name: player.name,
        position: player.position,
        jerseyNumber: player.jerseyNumber || undefined,
        photo: player.photo || "",
        status: (player.status as "active" | "inactive") || "active",
        teamRole: (player.teamRole as "capitao" | "diretor_time" | "jogador") || "jogador",
        squadTeamId: team.id,
      });
    } else {
      setEditingPlayer(null);
      playerForm.reset({
        name: "",
        position: "",
        jerseyNumber: undefined,
        photo: "",
        status: "active",
        teamRole: "jogador",
        squadTeamId: team.id,
      });
    }
    setIsPlayerDialogOpen(true);
  };

  const getTeamPlayers = (teamId: number) => {
    return allPlayers.filter(p => p.squadTeamId === teamId);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "capitao":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "diretor_time":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "capitao":
        return "Capitão";
      case "diretor_time":
        return "Diretor do Time";
      default:
        return "Jogador";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "capitao":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "diretor_time":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/50 border-b border-primary/20">
        <div className="max-w-lg mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-white">Times</h1>
          </div>
          {isAdmin && (
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90" 
              onClick={() => handleOpenTeamDialog()}
              data-testid="button-create-team"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Time
            </Button>
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
          squadTeams.map((team) => {
            const teamPlayers = getTeamPlayers(team.id);
            const activePlayers = teamPlayers.filter(p => p.status === "active");
            
            return (
              <Card key={team.id} className="bg-gray-900/50 border-primary/20 hover:border-primary/50 transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-white">{team.name}</CardTitle>
                        {team.abbreviation && (
                          <Badge variant="outline" className="text-primary border-primary/30">
                            {team.abbreviation}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-gray-400">{team.category}</CardDescription>
                      {team.description && (
                        <p className="text-sm text-gray-500 mt-2">{team.description}</p>
                      )}
                      <div className="flex gap-3 mt-3 text-sm">
                        <span className="text-gray-400">
                          {teamPlayers.length} jogador{teamPlayers.length !== 1 ? "es" : ""}
                        </span>
                        <span className="text-green-500">
                          {activePlayers.length} ativo{activePlayers.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenTeamDialog(team)}
                          data-testid={`button-edit-team-${team.id}`}
                          className="border-primary/20 text-white hover:bg-primary/20"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este time?")) {
                              deleteTeamMutation.mutate(team.id);
                            }
                          }}
                          disabled={deleteTeamMutation.isPending}
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isAdmin && (
                    <Button
                      variant="default"
                      className="w-full bg-primary hover:bg-primary/90"
                      onClick={() => handleOpenPlayerDialog(team)}
                      data-testid={`button-add-player-${team.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Jogador
                    </Button>
                  )}
                  
                  {teamPlayers.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-2">Jogadores:</h3>
                      {teamPlayers.map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {player.jerseyNumber && (
                              <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                                <span className="text-primary font-bold text-sm">{player.jerseyNumber}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">{player.name}</p>
                                {player.status === "active" ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                              <p className="text-sm text-gray-400">{player.position}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getRoleBadgeColor(player.teamRole || "jogador")}>
                                  <span className="flex items-center gap-1">
                                    {getRoleIcon(player.teamRole || "jogador")}
                                    <span className="text-xs">{getRoleLabel(player.teamRole || "jogador")}</span>
                                  </span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenPlayerDialog(team, player)}
                                data-testid={`button-edit-player-${player.id}`}
                                className="border-primary/20 text-white hover:bg-primary/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Tem certeza que deseja excluir este jogador?")) {
                                    deletePlayerMutation.mutate(player.id);
                                  }
                                }}
                                data-testid={`button-delete-player-${player.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Dialog para Criar/Editar Time */}
        <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
          <DialogContent className="bg-gray-900 text-white border-primary/20">
            <DialogHeader>
              <DialogTitle>{editingTeam ? "Editar Time" : "Criar Time de Categoria"}</DialogTitle>
              <DialogDescription>
                {editingTeam ? "Edite as informações do time" : "Adicione um novo time (Sub-17, Sub-20, Adulto, etc)"}
              </DialogDescription>
            </DialogHeader>
            <Form {...teamForm}>
              <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-4">
                <FormField
                  control={teamForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Sub-17"
                          data-testid="input-team-name"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamForm.control}
                  name="abbreviation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sigla (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: S17"
                          data-testid="input-team-abbreviation"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Sub-15, Adulto, Feminino"
                          data-testid="input-team-category"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={teamForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição / Informações (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Informações adicionais sobre o time..."
                          data-testid="input-team-description"
                          className="bg-gray-800 border-primary/20 text-white"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <input type="hidden" {...teamForm.register("clubId")} value={1} />
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="button-submit-team">
                    {editingTeam ? "Salvar Alterações" : "Criar Time"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Dialog para Criar/Editar Jogador */}
        <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
          <DialogContent className="bg-gray-900 text-white border-primary/20">
            <DialogHeader>
              <DialogTitle>{editingPlayer ? "Editar Jogador" : "Adicionar Jogador"}</DialogTitle>
              <DialogDescription>
                {editingPlayer ? "Edite as informações do jogador" : "Preencha os dados do novo jogador"}
              </DialogDescription>
            </DialogHeader>
            <Form {...playerForm}>
              <form onSubmit={playerForm.handleSubmit(onSubmitPlayer)} className="space-y-4">
                <FormField
                  control={playerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Nome do jogador"
                          data-testid="input-player-name"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={playerForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posição</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: Atacante, Goleiro, Zagueiro"
                          data-testid="input-player-position"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={playerForm.control}
                  name="jerseyNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da Camisa (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Ex: 10"
                          data-testid="input-player-number"
                          className="bg-gray-800 border-primary/20 text-white"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={playerForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-primary/20 text-white" data-testid="select-player-status">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 text-white border-primary/20">
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={playerForm.control}
                  name="teamRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo no Time</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!isPresidente}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-gray-800 border-primary/20 text-white" data-testid="select-player-role">
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 text-white border-primary/20">
                          <SelectItem value="jogador">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              Jogador
                            </div>
                          </SelectItem>
                          <SelectItem value="capitao">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-yellow-500" />
                              Capitão
                            </div>
                          </SelectItem>
                          <SelectItem value="diretor_time">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-500" />
                              Diretor do Time
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {!isPresidente && (
                        <p className="text-xs text-gray-500">Apenas o Presidente pode atribuir cargos</p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={playerForm.control}
                  name="photo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Foto (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://exemplo.com/foto.jpg"
                          data-testid="input-player-photo"
                          className="bg-gray-800 border-primary/20 text-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <input type="hidden" {...playerForm.register("squadTeamId")} />
                <DialogFooter>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="button-submit-player">
                    {editingPlayer ? "Salvar Alterações" : "Adicionar Jogador"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}
