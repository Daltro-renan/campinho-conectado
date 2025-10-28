import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Plus, Trash2, Trophy } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Game, Team } from "@shared/schema";
import { format, isFuture, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

const gameFormSchema = z.object({
  homeTeamId: z.string().min(1, "Selecione o time da casa"),
  awayTeamId: z.string().min(1, "Selecione o time visitante"),
  gameDate: z.string().min(1, "Data e hora são obrigatórias"),
  location: z.string().optional(),
}).refine((data) => data.homeTeamId !== data.awayTeamId, {
  message: "Os times devem ser diferentes",
  path: ["awayTeamId"],
});

type GameFormData = z.infer<typeof gameFormSchema>;

const Games = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    enabled: !!user,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  const form = useForm<GameFormData>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      homeTeamId: "",
      awayTeamId: "",
      gameDate: "",
      location: "",
    },
  });

  const createGameMutation = useMutation({
    mutationFn: async (data: GameFormData) => 
      apiRequest("/api/games", "POST", {
        clubId: 1,
        homeTeamId: parseInt(data.homeTeamId),
        awayTeamId: parseInt(data.awayTeamId),
        gameDate: new Date(data.gameDate).toISOString(),
        location: data.location || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setIsAddOpen(false);
      form.reset();
      toast({
        title: "Jogo criado!",
        description: "O jogo foi agendado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar jogo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGameMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/games/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: "Jogo excluído",
        description: "O jogo foi removido com sucesso.",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || gamesLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando jogos...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getStatusBadge = (gameDate: Date) => {
    const now = new Date();
    if (isFuture(gameDate)) {
      return <Badge className="bg-blue-600">Agendado</Badge>;
    } else if (isToday(gameDate)) {
      return <Badge variant="destructive">Hoje</Badge>;
    } else {
      return <Badge variant="secondary">Finalizado</Badge>;
    }
  };

  // Ordenar jogos: próximos primeiro, depois passados
  const now = new Date();
  const upcomingGames = games
    .filter(g => isFuture(new Date(g.gameDate)))
    .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());
  
  const pastGames = games
    .filter(g => !isFuture(new Date(g.gameDate)))
    .sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

  const sortedGames = [...upcomingGames, ...pastGames];

  const getTeam = (teamId: number) => teams.find(t => t.id === teamId);

  const onSubmit = (data: GameFormData) => {
    createGameMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="bg-gradient-to-br from-secondary to-black p-6 text-primary-foreground shadow-lg border-b border-primary/20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                <Calendar className="w-7 h-7 text-primary" />
                Calendário de Jogos
              </h1>
              <p className="text-gray-300 mt-1">Acompanhe todos os jogos</p>
            </div>
            
            {isAdmin && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-primary hover:bg-primary/90" 
                    data-testid="button-add-game"
                    onClick={() => setIsAddOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Jogo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 text-white border-primary/20">
                  <DialogHeader>
                    <DialogTitle>Agendar Novo Jogo</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Selecione os times e defina data e local do jogo
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="homeTeamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time da Casa</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-800 border-primary/20 text-white" data-testid="select-home-team">
                                  <SelectValue placeholder="Selecione o time da casa" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-gray-800 border-primary/20">
                                {teams.map((team) => (
                                  <SelectItem 
                                    key={team.id} 
                                    value={team.id.toString()}
                                    className="text-white hover:bg-primary/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {team.logo ? (
                                        <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                                      ) : (
                                        <Trophy className="w-4 h-4 text-primary" />
                                      )}
                                      {team.name} {team.abbreviation && `(${team.abbreviation})`}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="awayTeamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time Visitante</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-gray-800 border-primary/20 text-white" data-testid="select-away-team">
                                  <SelectValue placeholder="Selecione o time visitante" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-gray-800 border-primary/20">
                                {teams.map((team) => (
                                  <SelectItem 
                                    key={team.id} 
                                    value={team.id.toString()}
                                    className="text-white hover:bg-primary/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {team.logo ? (
                                        <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                                      ) : (
                                        <Trophy className="w-4 h-4 text-primary" />
                                      )}
                                      {team.name} {team.abbreviation && `(${team.abbreviation})`}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gameDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Hora</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="datetime-local"
                                className="bg-gray-800 border-primary/20 text-white"
                                data-testid="input-game-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Local</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Estádio ou local do jogo"
                                className="bg-gray-800 border-primary/20 text-white"
                                data-testid="input-location"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button 
                          type="submit" 
                          className="bg-primary hover:bg-primary/90" 
                          data-testid="button-submit-game"
                          disabled={createGameMutation.isPending}
                        >
                          {createGameMutation.isPending ? "Agendando..." : "Agendar Jogo"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {teams.length === 0 ? (
          <Card className="text-center py-12 bg-gray-900/50 border-primary/20">
            <CardContent>
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-semibold mb-2 text-white">Nenhum time cadastrado</p>
              <p className="text-sm text-gray-400">
                Cadastre times primeiro para poder criar jogos
              </p>
              <Button 
                className="mt-4 bg-primary hover:bg-primary/90"
                onClick={() => setLocation("/team")}
              >
                Ir para Times
              </Button>
            </CardContent>
          </Card>
        ) : games.length === 0 ? (
          <Card className="text-center py-12 bg-gray-900/50 border-primary/20">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-lg font-semibold mb-2 text-white">Nenhum jogo agendado</p>
              <p className="text-sm text-gray-400">
                {isAdmin 
                  ? "Clique em 'Novo Jogo' para agendar o primeiro jogo" 
                  : "Os próximos jogos aparecerão aqui quando forem agendados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcomingGames.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Próximos Jogos
                </h2>
              </div>
            )}
            {sortedGames.map((game) => {
              const homeTeam = getTeam(game.homeTeamId);
              const awayTeam = getTeam(game.awayTeamId);
              const gameDate = new Date(game.gameDate);
              const isPastGame = isPast(gameDate) && !isToday(gameDate);

              return (
                <Card 
                  key={game.id} 
                  className={`overflow-hidden border-primary/20 hover:border-primary/50 transition-all bg-gray-900/50 ${isPastGame ? 'opacity-75' : ''}`}
                  data-testid={`card-game-${game.id}`}
                >
                  <CardHeader className="bg-primary/5 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(gameDate)}
                      </div>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este jogo?")) {
                              deleteGameMutation.mutate(game.id);
                            }
                          }}
                          disabled={deleteGameMutation.isPending}
                          data-testid={`button-delete-game-${game.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      {/* Time da Casa */}
                      <div className="flex items-center gap-2 flex-1">
                        {homeTeam?.logo ? (
                          <img 
                            src={homeTeam.logo} 
                            alt={homeTeam.name} 
                            className="w-12 h-12 object-contain rounded bg-white/5 p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white">{homeTeam?.name || `Time ${game.homeTeamId}`}</p>
                          {homeTeam?.abbreviation && (
                            <p className="text-xs text-gray-400">{homeTeam.abbreviation}</p>
                          )}
                          {game.homeScore !== null && (
                            <p className="text-2xl font-bold text-primary mt-1">{game.homeScore}</p>
                          )}
                        </div>
                      </div>

                      <div className="px-4">
                        <span className="text-xl font-bold text-primary">VS</span>
                      </div>

                      {/* Time Visitante */}
                      <div className="flex items-center gap-2 flex-1 flex-row-reverse">
                        {awayTeam?.logo ? (
                          <img 
                            src={awayTeam.logo} 
                            alt={awayTeam.name} 
                            className="w-12 h-12 object-contain rounded bg-white/5 p-1"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-primary" />
                          </div>
                        )}
                        <div className="text-right">
                          <p className="font-bold text-white">{awayTeam?.name || `Time ${game.awayTeamId}`}</p>
                          {awayTeam?.abbreviation && (
                            <p className="text-xs text-gray-400">{awayTeam.abbreviation}</p>
                          )}
                          {game.awayScore !== null && (
                            <p className="text-2xl font-bold text-primary mt-1">{game.awayScore}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-gray-800">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {format(gameDate, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      {game.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{game.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Games;
