import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, CreditCard, History, Settings, Trophy, User, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Player, Payment, Game } from "@shared/schema";

const Profile = () => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: !!user,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user,
  });

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
    enabled: !!user,
  });

  const handleSignOut = async () => {
    try {
      await apiRequest("/api/auth/logout", "POST");
      logout();
      toast.success("Logout realizado com sucesso");
      setLocation("/auth");
    } catch (error) {
      logout();
      toast.success("Logout realizado com sucesso");
      setLocation("/auth");
    }
  };

  if (!user) {
    return null;
  }

  const userInitials = user.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  // Encontrar player do usuário
  const userPlayer = players.find(p => p.userId === user.id);
  
  // Encontrar pagamentos do usuário
  const userPayments = userPlayer 
    ? payments.filter(p => p.playerId === userPlayer.id)
    : [];

  // Calcular status de pagamento
  const pendingPayments = userPayments.filter(p => p.status === "pending" || p.status === "overdue");
  const nextPayment = pendingPayments.sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )[0];

  let paymentStatus = "Em dia";
  let paymentIcon = CheckCircle;
  let paymentColor = "text-green-500";
  let statusBadgeVariant: "default" | "destructive" | "secondary" = "secondary";

  if (nextPayment) {
    const dueDate = new Date(nextPayment.dueDate);
    if (isPast(dueDate) && !isToday(dueDate)) {
      paymentStatus = "Vencido";
      paymentIcon = AlertCircle;
      paymentColor = "text-red-500";
      statusBadgeVariant = "destructive";
    } else {
      paymentStatus = "Pendente";
      paymentIcon = Clock;
      paymentColor = "text-yellow-500";
      statusBadgeVariant = "default";
    }
  }

  const PaymentIcon = paymentIcon;

  // Traduzir role para português
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      "presidente": "Presidente",
      "diretoria": "Diretoria",
      "tecnico": "Técnico",
      "jogador": "Jogador",
      "player": "Jogador",
    };
    return roleMap[role] || role;
  };

  // Contar jogos do player
  const userGamesCount = userPlayer ? userPlayer.gamesPlayed || 0 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="bg-gradient-to-br from-secondary to-black p-8 text-primary-foreground shadow-lg border-b border-primary/20">
        <div className="max-w-lg mx-auto text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/20">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.fullName || "Avatar"} />
            ) : (
              <AvatarFallback className="text-primary-foreground text-3xl font-bold bg-primary" data-testid="text-initials">
                {userInitials}
              </AvatarFallback>
            )}
          </Avatar>
          <h1 className="text-2xl font-bold mb-1 text-white" data-testid="text-username">
            {user.fullName || "Associado"}
          </h1>
          <Badge className="mb-2 bg-primary/20 text-primary border-primary/30">
            <User className="w-3 h-3 mr-1" />
            {getRoleLabel(user.role)}
          </Badge>
          <p className="text-gray-300" data-testid="text-email">{user.email}</p>
          <p className="text-sm text-gray-400 mt-2">
            Membro desde {format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status de Associado */}
        <Card className="border-primary/20 bg-gray-900/50 backdrop-blur overflow-hidden">
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-center flex items-center justify-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-primary" />
              Status de Associado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status de Mensalidade */}
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PaymentIcon className={`w-8 h-8 ${paymentColor}`} />
                  <div>
                    <p className="text-sm text-gray-400">Mensalidade</p>
                    <p className="font-bold text-white">{paymentStatus}</p>
                  </div>
                </div>
                <Badge variant={statusBadgeVariant}>
                  {paymentStatus === "Vencido" ? "URGENTE" : paymentStatus === "Pendente" ? "A PAGAR" : "OK"}
                </Badge>
              </div>

              {nextPayment && (
                <div className="text-sm text-gray-400 text-center">
                  Próximo vencimento: {" "}
                  <span className="font-semibold text-white">
                    {format(new Date(nextPayment.dueDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {/* Estatísticas do Jogador */}
              {userPlayer && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{userPlayer.goals || 0}</p>
                    <p className="text-xs text-gray-400">Gols</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{userPlayer.assists || 0}</p>
                    <p className="text-xs text-gray-400">Assistências</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{userGamesCount}</p>
                    <p className="text-xs text-gray-400">Jogos</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Opções da Conta */}
        <Card className="border-primary/20 bg-gray-900/50">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-white">Opções da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-white" 
              data-testid="button-payments"
              onClick={() => setLocation("/payments")}
            >
              <CreditCard className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p>Meus Pagamentos</p>
                <p className="text-xs text-gray-400">
                  {userPayments.length} pagamento{userPayments.length !== 1 ? 's' : ''} registrado{userPayments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-white" 
              data-testid="button-history"
              onClick={() => setLocation("/games")}
            >
              <History className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p>Histórico de Jogos</p>
                <p className="text-xs text-gray-400">
                  {games.length} jogo{games.length !== 1 ? 's' : ''} registrado{games.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary text-white" 
              data-testid="button-settings"
              disabled
            >
              <Settings className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p>Configurações</p>
                <p className="text-xs text-gray-400">Em breve</p>
              </div>
            </Button>

            <div className="pt-4 border-t border-gray-800">
              <Button
                variant="destructive"
                className="w-full justify-start gap-3 bg-destructive hover:bg-destructive/90"
                onClick={handleSignOut}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
                Sair da Conta
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-400 py-4">
          <p className="mb-1">Campinho Conectado</p>
          <p className="text-xs">Versão 2.0.0</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
