/**
 * Clube ativo: o usuário pode participar de vários clubes e escolhe em qual está.
 * Todas as telas do app trabalham sobre o clube ativo.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MyClub } from "@shared/api";
import { can as roleCan, type Capability, type Role } from "@shared/roles";
import { api } from "./api";

const KEY = "campinho.clubId";

type ClubContextValue = {
  clubs: MyClub[];
  club: MyClub | null;
  role: Role | null;
  isLoading: boolean;
  can: (capability: Capability) => boolean;
  selectClub: (id: number) => void;
  /** Caminho da API dentro do clube ativo: clubPath("/games") → "/clubs/3/games" */
  clubPath: (path?: string) => string;
  /** Chave base do React Query para dados do clube ativo */
  key: (...parts: unknown[]) => unknown[];
};

const ClubContext = createContext<ClubContextValue | null>(null);

export function ClubProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const saved = Number(localStorage.getItem(KEY));
    return Number.isInteger(saved) && saved > 0 ? saved : null;
  });

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["clubs"],
    queryFn: () => api.get<MyClub[]>("/clubs"),
  });

  const value = useMemo<ClubContextValue>(() => {
    const club = clubs.find((c) => c.id === selectedId) ?? clubs[0] ?? null;
    const id = club?.id ?? 0;
    return {
      clubs,
      club,
      role: club?.role ?? null,
      isLoading,
      can: (capability) => roleCan(club?.role, capability),
      selectClub: (newId) => {
        localStorage.setItem(KEY, String(newId));
        setSelectedId(newId);
        queryClient.removeQueries({ queryKey: ["club"] });
      },
      clubPath: (path = "") => `/clubs/${id}${path}`,
      key: (...parts) => ["club", id, ...parts],
    };
  }, [clubs, selectedId, isLoading, queryClient]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub precisa estar dentro de ClubProvider");
  return ctx;
}

/** Igual a useClub, mas garante que há um clube selecionado (usar dentro das telas do app). */
export function useActiveClub() {
  const ctx = useClub();
  if (!ctx.club || !ctx.role) throw new Error("Nenhum clube selecionado");
  return { ...ctx, club: ctx.club, role: ctx.role };
}
