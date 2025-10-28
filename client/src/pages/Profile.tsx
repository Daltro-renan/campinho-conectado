import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, CreditCard, History, Settings } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

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
      <div className="bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
        <div className="max-w-lg mx-auto text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4 bg-accent">
            <AvatarFallback className="text-background text-2xl font-bold" data-testid="text-initials">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-username">
            {user.fullName || "Associado"}
          </h1>
          <p className="text-primary-foreground/80" data-testid="text-email">{user.email}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-center">Status de Associado</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-center space-y-2">
              <div className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-full font-semibold">
                ✓ Mensalidade em Dia
              </div>
              <p className="text-sm text-muted-foreground">
                Próximo vencimento: 15 de Abril, 2025
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3" data-testid="button-payments">
              <CreditCard className="w-5 h-5" />
              Meus Pagamentos
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-3" data-testid="button-history">
              <History className="w-5 h-5" />
              Histórico de Jogos
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-3" data-testid="button-settings">
              <Settings className="w-5 h-5" />
              Configurações
            </Button>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full justify-start gap-3"
                onClick={handleSignOut}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>Membro desde {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
