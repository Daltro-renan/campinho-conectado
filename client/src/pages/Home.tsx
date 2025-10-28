import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, Trophy, Newspaper } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import type { Game, News } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Home = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const { data: upcomingGames = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games", "upcoming"],
    enabled: !!user,
  });

  const { data: newsItems = [], isLoading: newsLoading } = useQuery<News[]>({
    queryKey: ["/api/news", "published"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userName = user.fullName?.split(" ")[0] || "Associado";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-secondary to-black p-6 text-primary-foreground shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold" data-testid="text-greeting">
              Olá, {userName}! ⚽
            </h1>
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <p className="text-gray-300">Bem-vindo ao seu clube</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Membership Status Card */}
        <Card className="overflow-hidden border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="bg-primary/10">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Status da Mensalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Situação</p>
                <p className="text-lg font-bold text-primary" data-testid="text-status">
                  Em dia ✓
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="button-pay"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Pagar
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Próximo vencimento</p>
              <p className="font-semibold">15 de Novembro, 2025</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 transform hover:scale-105" 
            data-testid="card-games"
            onClick={() => setLocation("/games")}
          >
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Jogos</p>
              <p className="text-sm text-muted-foreground">Ver agenda</p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:bg-primary/5 hover:border-primary/50 transition-all duration-200 transform hover:scale-105" 
            data-testid="card-team"
            onClick={() => setLocation("/team")}
          >
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Time</p>
              <p className="text-sm text-muted-foreground">Ver escalação</p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Games */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximos Jogos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gamesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : upcomingGames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum jogo agendado</p>
              </div>
            ) : (
              upcomingGames.slice(0, 3).map((game) => (
                <div 
                  key={game.id}
                  className="flex items-center justify-between p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                >
                  <div>
                    <p className="font-semibold">Jogo #{game.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {game.gameDate && format(new Date(game.gameDate), "EEEE, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {game.location || "A definir"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Latest News */}
        {newsItems.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                Últimas Notícias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {newsItems.slice(0, 2).map((newsItem) => (
                <div 
                  key={newsItem.id}
                  className="p-3 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  <p className="font-semibold">{newsItem.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {newsItem.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {newsItem.createdAt && format(new Date(newsItem.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
