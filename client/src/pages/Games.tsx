import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Clock, Plus, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Game } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const createGameMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/games", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setIsAddOpen(false);
      toast({
        title: "Jogo criado!",
        description: "O jogo foi agendado com sucesso.",
      });
    },
    onError: (error: any) => {
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

  const handleCreateGame = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createGameMutation.mutate({
      homeTeamId: parseInt(formData.get("homeTeamId") as string),
      awayTeamId: parseInt(formData.get("awayTeamId") as string),
      gameDate: new Date(formData.get("gameDate") as string).toISOString(),
      location: formData.get("location") as string || undefined,
    });
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || gamesLoading) {
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Agendado", variant: "default" },
      live: { label: "Ao Vivo", variant: "destructive" },
      finished: { label: "Finalizado", variant: "secondary" },
    };
    
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const sortedGames = [...games].sort((a, b) => 
    new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-secondary to-black p-6 text-primary-foreground shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-7 h-7 text-primary" />
                Calendário de Jogos
              </h1>
              <p className="text-gray-300 mt-1">Acompanhe todos os jogos</p>
            </div>
            
            {isAdmin && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90" data-testid="button-add-game">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Jogo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 text-white border-gray-700">
                  <form onSubmit={handleCreateGame}>
                    <DialogHeader>
                      <DialogTitle>Agendar Novo Jogo</DialogTitle>
                      <DialogDescription className="text-gray-400">
                        Crie um novo jogo entre dois times
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="homeTeamId">Time da Casa (ID)</Label>
                        <Input
                          type="number"
                          name="homeTeamId"
                          required
                          className="bg-gray-700 border-gray-600"
                          data-testid="input-home-team"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="awayTeamId">Time Visitante (ID)</Label>
                        <Input
                          type="number"
                          name="awayTeamId"
                          required
                          className="bg-gray-700 border-gray-600"
                          data-testid="input-away-team"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="gameDate">Data e Hora</Label>
                        <Input
                          type="datetime-local"
                          name="gameDate"
                          required
                          className="bg-gray-700 border-gray-600"
                          data-testid="input-game-date"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="location">Local</Label>
                        <Input
                          type="text"
                          name="location"
                          placeholder="Estádio ou local do jogo"
                          className="bg-gray-700 border-gray-600"
                          data-testid="input-location"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="button-submit-game">
                        Agendar Jogo
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {games.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-semibold mb-2">Nenhum jogo agendado</p>
              <p className="text-sm text-muted-foreground">
                Os próximos jogos aparecerão aqui quando forem agendados
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedGames.map((game) => (
            <Card 
              key={game.id} 
              className="overflow-hidden border-primary/20 hover:border-primary/50 transition-all"
              data-testid={`card-game-${game.id}`}
            >
              <CardHeader className="bg-primary/5 pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Jogo #{game.id}</CardTitle>
                    {getStatusBadge(game.status)}
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteGameMutation.mutate(game.id)}
                      disabled={deleteGameMutation.isPending}
                      data-testid={`button-delete-game-${game.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between bg-background/50 p-4 rounded-lg">
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Casa</p>
                    <p className="font-bold text-xl">Time {game.homeTeamId}</p>
                    {game.homeScore !== null && (
                      <p className="text-3xl font-bold text-primary mt-2">{game.homeScore}</p>
                    )}
                  </div>
                  
                  <div className="px-4 text-2xl font-bold text-muted-foreground">VS</div>
                  
                  <div className="text-center flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Visitante</p>
                    <p className="font-bold text-xl">Time {game.awayTeamId}</p>
                    {game.awayScore !== null && (
                      <p className="text-3xl font-bold text-primary mt-2">{game.awayScore}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      {format(new Date(game.gameDate), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  {game.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{game.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Games;
