import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fetchConfig, googleIdToken, GoogleCancelled, prepareGoogle } from "@/lib/google-auth";

/** Logotipo oficial do Google ("G" colorido), exigido nas diretrizes do botão */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function GoogleButton() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: fetchConfig, staleTime: Infinity });
  const clientId = config?.googleClientId;

  useEffect(() => {
    if (clientId) prepareGoogle(clientId).catch(() => undefined);
  }, [clientId]);

  if (!clientId) return null;

  const login = async () => {
    setBusy(true);
    try {
      const idToken = await googleIdToken(clientId);
      const res = await api.post<AuthResponse>("/auth/google", { idToken });
      window.history.replaceState(null, "", "/");
      signIn(res);
    } catch (e) {
      if (!(e instanceof GoogleCancelled)) toast.error((e as Error).message || "Não foi possível entrar com o Google");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="w-full gap-3" onClick={login} disabled={busy}>
        <GoogleLogo />
        {busy ? "Conectando…" : "Entrar com Google"}
      </Button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou com e-mail
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
