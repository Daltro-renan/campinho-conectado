/** Sessão do usuário: guarda o token e expõe o usuário logado. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, PublicUser } from "@shared/api";
import { api, setUnauthorizedHandler, tokenStore } from "./api";

type AuthContextValue = {
  user: PublicUser | null;
  isLoading: boolean;
  signIn: (res: AuthResponse) => void;
  signOut: () => void;
  setUser: (user: PublicUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStore.get());

  const { data: user, isLoading } = useQuery({
    queryKey: ["me", token],
    queryFn: () => api.get<PublicUser>("/auth/me"),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });

  const signOut = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem("campinho.clubId");
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => setUnauthorizedHandler(signOut), [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? (user ?? null) : null,
      isLoading: !!token && isLoading,
      signIn: ({ token: newToken, user: newUser }) => {
        tokenStore.set(newToken);
        queryClient.setQueryData(["me", newToken], newUser);
        setToken(newToken);
      },
      signOut,
      setUser: (u) => queryClient.setQueryData(["me", token], u),
    }),
    [token, user, isLoading, signOut, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
