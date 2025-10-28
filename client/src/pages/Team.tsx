import { Trophy, Target, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const Team = () => {
  const stats = [
    { label: "Vitórias", value: "8", icon: Trophy, color: "text-primary" },
    { label: "Gols Marcados", value: "24", icon: Target, color: "text-accent" },
    { label: "Títulos", value: "3", icon: Award, color: "text-destructive" },
  ];

  const topPlayers = [
    { name: "João Silva", position: "Atacante", goals: 12, assists: 5 },
    { name: "Carlos Santos", position: "Meio-Campo", goals: 6, assists: 8 },
    { name: "Pedro Alves", position: "Zagueiro", goals: 3, assists: 2 },
    { name: "Lucas Mendes", position: "Atacante", goals: 8, assists: 4 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">Nosso Time</h1>
          <p className="text-primary-foreground/80">Estatísticas e jogadores</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Stats do Time */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="pt-6 text-center">
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informações do Time */}
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle>Associação FC</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fundação</span>
                <span className="font-semibold">2018</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jogadores</span>
                <span className="font-semibold">42 ativos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campeonato Atual</span>
                <Badge className="bg-primary">2º Lugar</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Próximo Jogo</span>
                <span className="font-semibold">22 Abr • 15:00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Jogadores */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Destaques da Temporada
          </h2>
          <div className="space-y-3">
            {topPlayers.map((player, index) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 bg-primary">
                      <AvatarFallback className="text-primary-foreground font-bold">
                        {player.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{player.name}</p>
                      <p className="text-sm text-muted-foreground">{player.position}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="font-bold text-primary">{player.goals}</p>
                          <p className="text-xs text-muted-foreground">Gols</p>
                        </div>
                        <div>
                          <p className="font-bold text-accent">{player.assists}</p>
                          <p className="text-xs text-muted-foreground">Assist.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Team;
