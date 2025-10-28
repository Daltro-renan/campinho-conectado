import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Target, Award, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import type { Player, Team } from "@shared/schema";

const TeamPage = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: !!user,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || playersLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando time...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const mainTeam = teams[0];
  const totalGoals = players.reduce((sum, player) => sum + (player.goals || 0), 0);
  const totalAssists = players.reduce((sum, player) => sum + (player.assists || 0), 0);
  const totalGames = mainTeam ? (mainTeam.wins || 0) + (mainTeam.draws || 0) + (mainTeam.losses || 0) : 0;

  const stats = [
    { label: "Vitórias", value: mainTeam?.wins?.toString() || "0", icon: Trophy, color: "text-primary" },
    { label: "Gols", value: totalGoals.toString(), icon: Target, color: "text-primary" },
    { label: "Jogos", value: totalGames.toString(), icon: Award, color: "text-primary" },
  ];

  const topPlayers = [...players]
    .sort((a, b) => (b.goals || 0) - (a.goals || 0))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-secondary to-black p-6 text-primary-foreground shadow-lg">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-primary" />
            {mainTeam?.name || "Nosso Time"}
          </h1>
          <p className="text-gray-300 mt-1">Estatísticas e jogadores</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-primary/20">
                <CardContent className="pt-6 text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {mainTeam && (
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader className="bg-primary/5">
              <CardTitle>{mainTeam.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {mainTeam.founded && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fundação</span>
                    <span className="font-semibold">{mainTeam.founded}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jogadores</span>
                  <span className="font-semibold">{players.length} cadastrados</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balanço</span>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-primary">
                      {mainTeam.wins}V
                    </Badge>
                    <Badge variant="secondary">{mainTeam.draws}E</Badge>
                    <Badge variant="destructive">{mainTeam.losses}D</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Jogadores do Elenco
          </h2>
          
          {players.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <UsersIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-lg font-semibold mb-2">Nenhum jogador cadastrado</p>
                <p className="text-sm text-muted-foreground">
                  Os jogadores aparecerão aqui quando forem adicionados ao time
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {topPlayers.map((player) => (
                <Card key={player.id} className="border-primary/20 hover:border-primary/50 transition-all">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 bg-primary/10 border-2 border-primary/30">
                        <AvatarFallback className="text-primary font-bold bg-primary/5">
                          {player.jerseyNumber || player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{player.name}</p>
                        <p className="text-sm text-muted-foreground">{player.position}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-4 text-sm">
                          <div>
                            <p className="font-bold text-primary">{player.goals || 0}</p>
                            <p className="text-xs text-muted-foreground">Gols</p>
                          </div>
                          <div>
                            <p className="font-bold text-primary">{player.assists || 0}</p>
                            <p className="text-xs text-muted-foreground">Assist.</p>
                          </div>
                          <div>
                            <p className="font-bold text-muted-foreground">{player.gamesPlayed || 0}</p>
                            <p className="text-xs text-muted-foreground">Jogos</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeamPage;
