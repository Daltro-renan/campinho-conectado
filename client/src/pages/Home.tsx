import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Users, Trophy } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";

const Home = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

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
      <div className="bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold" data-testid="text-greeting">Olá, {userName}! ⚽</h1>
            <Trophy className="w-8 h-8 text-accent" />
          </div>
          <p className="text-primary-foreground/80">Bem-vindo ao seu clube</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Card className="overflow-hidden border-primary/20">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Status da Mensalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Situação</p>
                <p className="text-lg font-bold text-primary" data-testid="text-status">Em dia ✓</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-pay">
                Pagar
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Próximo vencimento</p>
              <p className="font-semibold">15 de Abril, 2025</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" data-testid="card-games">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Jogos</p>
              <p className="text-sm text-muted-foreground">Ver agenda</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors" data-testid="card-team">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-semibold">Time</p>
              <p className="text-sm text-muted-foreground">Ver escalação</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Jogos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
              <div>
                <p className="font-semibold">Associação FC vs Unidos FC</p>
                <p className="text-sm text-muted-foreground">Sábado, 10:00</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Campo 1</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
              <div>
                <p className="font-semibold">Amigos FC vs Associação FC</p>
                <p className="text-sm text-muted-foreground">Domingo, 16:00</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Campo 2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
