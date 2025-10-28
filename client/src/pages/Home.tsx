import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, Trophy, AlertCircle, CheckCircle, Clock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import type { Game, Player, Team, Payment } from "@shared/schema";
import { format, isPast, isToday, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

const Home = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  // Buscar player do usuário atual
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: !!user,
  });

  // Buscar todos os times
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

  // Buscar todos os jogos
  const { data: allGames = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    enabled: !!user,
  });

  // Buscar pagamentos
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
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

  // Encontrar o player do usuário atual
  const userPlayer = players.find(p => p.userId === user.id);
  
  // Encontrar o time principal do usuário
  const userTeam = userPlayer ? teams.find(t => t.id === userPlayer.teamId) : null;

  // Encontrar o próximo jogo (apenas 1, ordenado por data)
  const now = new Date();
  const upcomingGames = allGames
    .filter(game => game.gameDate && isFuture(new Date(game.gameDate)))
    .sort((a, b) => new Date(a.gameDate!).getTime() - new Date(b.gameDate!).getTime());
  
  const nextGame = upcomingGames[0];

  // Encontrar os times do próximo jogo
  const homeTeam = nextGame ? teams.find(t => t.id === nextGame.homeTeamId) : null;
  const awayTeam = nextGame ? teams.find(t => t.id === nextGame.awayTeamId) : null;

  // Calcular status de mensalidade
  const userPayments = userPlayer 
    ? payments.filter(p => p.playerId === userPlayer.id)
    : [];

  // Encontrar próximo pagamento pendente ou vencido
  const pendingPayments = userPayments.filter(p => p.status === "pending" || p.status === "overdue");
  const nextPayment = pendingPayments.sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )[0];

  // Calcular status
  let paymentStatus = "Em dia";
  let paymentIcon = CheckCircle;
  let paymentColor = "text-green-500";
  let nextDueDate = "Nenhum pagamento pendente";

  if (nextPayment) {
    const dueDate = new Date(nextPayment.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) {
      paymentStatus = "Vencido";
      paymentIcon = AlertCircle;
      paymentColor = "text-red-500";
      nextDueDate = format(dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
    } else {
      paymentStatus = "Pendente";
      paymentIcon = Clock;
      paymentColor = "text-yellow-500";
      nextDueDate = format(dueDate, "dd 'de' MMMM, yyyy", { locale: ptBR });
    }
  }

  const PaymentIcon = paymentIcon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-secondary to-black p-6 text-primary-foreground shadow-lg border-b border-primary/20">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white" data-testid="text-greeting">
              Olá, {userName}! ⚽
            </h1>
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <p className="text-gray-300">Bem-vindo ao Campinho Conectado</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Três Cards Principais - Atalhos Navegáveis */}
        <div className="grid gap-4">
          {/* Card 1: Próximo Jogo */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all duration-200 bg-gray-900/50 border-primary/20"
            onClick={() => setLocation("/games")}
            data-testid="card-next-game"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Calendar className="w-5 h-5 text-primary" />
                Próximo Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextGame && homeTeam && awayTeam ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      {homeTeam.logo ? (
                        <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="font-semibold text-white">{homeTeam.abbreviation || homeTeam.name}</span>
                    </div>
                    <span className="text-primary font-bold">VS</span>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="font-semibold text-white">{awayTeam.abbreviation || awayTeam.name}</span>
                      {awayTeam.logo ? (
                        <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-800 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>{format(new Date(nextGame.gameDate!), "EEEE, dd/MM", { locale: ptBR })}</span>
                      <span>{format(new Date(nextGame.gameDate!), "HH:mm", { locale: ptBR })}</span>
                    </div>
                    {nextGame.location && (
                      <div className="text-xs mt-1 text-gray-500">{nextGame.location}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum jogo agendado</p>
                  <p className="text-xs mt-1 text-gray-500">Clique para ver a agenda completa</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Time Principal */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all duration-200 bg-gray-900/50 border-primary/20"
            onClick={() => setLocation("/team")}
            data-testid="card-main-team"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Users className="w-5 h-5 text-primary" />
                Meu Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userTeam ? (
                <div className="flex items-center gap-3">
                  {userTeam.logo ? (
                    <img 
                      src={userTeam.logo} 
                      alt={userTeam.name} 
                      className="w-16 h-16 object-contain rounded bg-white/5 p-2"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-white text-lg">{userTeam.name}</p>
                    {userTeam.abbreviation && (
                      <p className="text-sm text-gray-400">{userTeam.abbreviation}</p>
                    )}
                    {(userTeam.city || userTeam.state) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {userTeam.city}{userTeam.city && userTeam.state && ', '}{userTeam.state}
                      </p>
                    )}
                  </div>
                  {(userTeam.colorPrimary || userTeam.colorSecondary) && (
                    <div className="flex gap-1">
                      {userTeam.colorPrimary && (
                        <div 
                          className="w-6 h-6 rounded border border-gray-700"
                          style={{ backgroundColor: userTeam.colorPrimary }}
                        />
                      )}
                      {userTeam.colorSecondary && (
                        <div 
                          className="w-6 h-6 rounded border border-gray-700"
                          style={{ backgroundColor: userTeam.colorSecondary }}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Você ainda não está em um time</p>
                  <p className="text-xs mt-1 text-gray-500">Clique para ver os times</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Situação de Mensalidade */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all duration-200 bg-gray-900/50 border-primary/20"
            onClick={() => setLocation("/payments")}
            data-testid="card-payment-status"
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <DollarSign className="w-5 h-5 text-primary" />
                Situação de Mensalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PaymentIcon className={`w-10 h-10 ${paymentColor}`} />
                  <div>
                    <p className="font-bold text-lg text-white">{paymentStatus}</p>
                    <p className="text-xs text-gray-400">Status atual</p>
                  </div>
                </div>
                {nextPayment && (
                  <Badge 
                    variant={paymentStatus === "Vencido" ? "destructive" : paymentStatus === "Pendente" ? "default" : "secondary"}
                    className={paymentStatus === "Pendente" ? "bg-yellow-600" : ""}
                  >
                    {paymentStatus === "Vencido" ? "URGENTE" : paymentStatus === "Pendente" ? "A PAGAR" : "OK"}
                  </Badge>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-400">Próximo vencimento</p>
                <p className="font-semibold text-white">{nextDueDate}</p>
                {nextPayment && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valor: R$ {(nextPayment.amount / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas Rápidas */}
        {userTeam && (
          <Card className="bg-gray-900/50 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg text-white">Estatísticas do Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-500">{userTeam.wins || 0}</p>
                  <p className="text-xs text-gray-400">Vitórias</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{userTeam.draws || 0}</p>
                  <p className="text-xs text-gray-400">Empates</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{userTeam.losses || 0}</p>
                  <p className="text-xs text-gray-400">Derrotas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
