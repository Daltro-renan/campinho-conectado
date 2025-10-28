import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, CreditCard, History, Settings, Trophy } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Profile = () => {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-secondary to-black p-8 text-primary-foreground shadow-lg">
        <div className="max-w-lg mx-auto text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 bg-primary border-4 border-primary/20">
            <AvatarFallback className="text-primary-foreground text-3xl font-bold bg-primary" data-testid="text-initials">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-username">
            {user.fullName || "Associado"}
          </h1>
          <p className="text-gray-300" data-testid="text-email">{user.email}</p>
          <p className="text-sm text-gray-400 mt-2">
            Membro desde {format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="border-primary/20 bg-card/50 backdrop-blur overflow-hidden">
          <CardHeader className="bg-primary/10">
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Status de Associado
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <div className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold shadow-lg">
                ✓ Mensalidade em Dia
              </div>
              <p className="text-sm text-muted-foreground">
                Próximo vencimento: <span className="font-semibold">15 de Novembro, 2025</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle>Opções da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" 
              data-testid="button-payments"
            >
              <CreditCard className="w-5 h-5" />
              Meus Pagamentos
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" 
              data-testid="button-history"
            >
              <History className="w-5 h-5" />
              Histórico de Jogos
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 hover:bg-primary/10 hover:text-primary" 
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
              Configurações
            </Button>

            <div className="pt-4 border-t border-border">
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

        <div className="text-center text-sm text-muted-foreground py-4">
          <p className="mb-1">Campinho Conectado</p>
          <p className="text-xs">Versão 1.0.0</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
