import { Calendar, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const Games = () => {
  const upcomingGames = [
    {
      id: 1,
      opponent: "Rival FC",
      date: "22 Abr",
      time: "15:00",
      location: "Campo Central",
      type: "Campeonato",
    },
    {
      id: 2,
      opponent: "União FC",
      date: "29 Abr",
      time: "16:00",
      location: "Estádio Municipal",
      type: "Amistoso",
    },
    {
      id: 3,
      opponent: "Estrela FC",
      date: "06 Mai",
      time: "15:30",
      location: "Campo Central",
      type: "Campeonato",
    },
  ];

  const pastGames = [
    {
      id: 4,
      opponent: "Vitória FC",
      date: "15 Abr",
      result: "3-1",
      status: "win",
    },
    {
      id: 5,
      opponent: "Atlético FC",
      date: "08 Abr",
      result: "2-2",
      status: "draw",
    },
    {
      id: 6,
      opponent: "Flamengo FC",
      date: "01 Abr",
      result: "1-2",
      status: "loss",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">Jogos</h1>
          <p className="text-primary-foreground/80">Calendário e resultados</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Próximos Jogos */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Próximos Jogos
          </h2>
          <div className="space-y-3">
            {upcomingGames.map((game) => (
              <Card key={game.id} className="border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-lg">vs {game.opponent}</p>
                        <Badge variant="secondary" className="text-xs">
                          {game.type}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {game.date}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {game.time}
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {game.location}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">
                      Confirmar Presença
                    </Button>
                    <Button size="sm" variant="outline">
                      Ver Local
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Resultados Recentes */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Resultados Recentes
          </h2>
          <div className="space-y-2">
            {pastGames.map((game) => (
              <Card key={game.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">vs {game.opponent}</p>
                      <p className="text-sm text-muted-foreground">{game.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{game.result}</p>
                      <Badge
                        variant={
                          game.status === "win"
                            ? "default"
                            : game.status === "draw"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {game.status === "win"
                          ? "Vitória"
                          : game.status === "draw"
                          ? "Empate"
                          : "Derrota"}
                      </Badge>
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

export default Games;
