import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import type { Game } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Games = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    enabled: !!user,
  });

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-7 h-7 text-primary" />
            Calendário de Jogos
          </h1>
          <p className="text-gray-300 mt-1">Acompanhe todos os jogos</p>
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
                  <CardTitle className="text-lg">Jogo #{game.id}</CardTitle>
                  {getStatusBadge(game.status)}
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
