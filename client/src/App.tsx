import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ClubProvider, useClub } from "@/lib/club";
import { ThemeProvider } from "@/lib/theme";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import HomePage from "@/pages/HomePage";
import GamesPage from "@/pages/GamesPage";
import SquadPage from "@/pages/SquadPage";
import OverduePage from "@/pages/OverduePage";
import DuesPage from "@/pages/DuesPage";
import ChatPage from "@/pages/ChatPage";
import ClubPage from "@/pages/ClubPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFoundPage from "@/pages/NotFoundPage";

function Splash() {
  return (
    <div className="pitch-stripes flex min-h-screen items-center justify-center" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-pitch-foreground/20 border-t-pitch-foreground" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}

/** Decide o que mostrar: login, criação do primeiro clube ou o app. */
function Gate() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Splash />;
  if (!user) return <AuthPage />;
  return (
    <ClubProvider>
      <LoggedIn />
    </ClubProvider>
  );
}

function LoggedIn() {
  const { club, isLoading } = useClub();
  if (isLoading) return <Splash />;

  return (
    <Switch>
      <Route path="/comecar" component={OnboardingPage} />
      {!club ? (
        <Route>
          <Redirect to="/comecar" />
        </Route>
      ) : (
        <Route>
          <AppShell>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/jogos" component={GamesPage} />
              <Route path="/elenco" component={SquadPage} />
              <Route path="/inadimplencia" component={OverduePage} />
              <Route path="/times">
                <Redirect to="/elenco" />
              </Route>
              <Route path="/times/*">
                <Redirect to="/elenco" />
              </Route>
              <Route path="/mensalidades" component={DuesPage} />
              <Route path="/chat" component={ChatPage} />
              <Route path="/clube" component={ClubPage} />
              <Route path="/perfil" component={ProfilePage} />
              <Route path="/entrar">
                <Redirect to="/" />
              </Route>
              <Route component={NotFoundPage} />
            </Switch>
          </AppShell>
        </Route>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Gate />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
