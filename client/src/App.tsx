import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/lib/auth";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Games from "./pages/Games";
import Team from "./pages/Team";
import Profile from "./pages/Profile";
import Payments from "./pages/Payments";
import SquadTeams from "./pages/SquadTeams";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/games" component={Games} />
          <Route path="/team" component={Team} />
          <Route path="/payments" component={Payments} />
          <Route path="/squad-teams" component={SquadTeams} />
          <Route path="/chat" component={Chat} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
