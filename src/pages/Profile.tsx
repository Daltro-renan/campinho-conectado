import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, CreditCard, History, Settings } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
    } else {
      toast.success("Logout realizado com sucesso");
      navigate("/auth");
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary p-6 text-primary-foreground">
        <div className="max-w-lg mx-auto text-center">
          <Avatar className="w-20 h-20 mx-auto mb-4 bg-accent">
            <AvatarFallback className="text-background text-2xl font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-1">
            {user?.user_metadata?.full_name || "Associado"}
          </h1>
          <p className="text-primary-foreground/80">{user?.email}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Status Card */}
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

        {/* Menu Options */}
        <div className="space-y-2">
          <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Pagamentos</p>
                  <p className="text-sm text-muted-foreground">Gerenciar mensalidades</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                  <History className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Histórico</p>
                  <p className="text-sm text-muted-foreground">Ver atividades anteriores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/5 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Configurações</p>
                  <p className="text-sm text-muted-foreground">Ajustes da conta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logout Button */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
