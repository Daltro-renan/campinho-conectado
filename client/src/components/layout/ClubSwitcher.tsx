import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TeamCrest } from "@/components/TeamCrest";
import { useActiveClub } from "@/lib/club";
import { ROLE_LABELS } from "@shared/roles";
import { cn } from "@/lib/utils";

/** Mostra o clube ativo e permite trocar de clube */
export function ClubSwitcher({ variant = "sidebar" }: { variant?: "sidebar" | "topbar" }) {
  const { club, clubs, selectClub } = useActiveClub();
  const [, navigate] = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex min-w-0 items-center gap-3 rounded-md text-left transition-colors",
          variant === "sidebar"
            ? "w-full p-2 hover:bg-sidebar-accent"
            : "max-w-[70vw] px-1 py-1 hover:bg-accent",
        )}
      >
        <TeamCrest
          abbreviation={club.abbreviation}
          colorPrimary={club.colorPrimary}
          colorSecondary={club.colorSecondary}
          size={variant === "sidebar" ? 34 : 28}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg font-semibold leading-tight">{club.name}</span>
          <span
            className={cn(
              "block truncate text-xs",
              variant === "sidebar" ? "text-sidebar-foreground/70" : "text-muted-foreground",
            )}
          >
            {ROLE_LABELS[club.role]}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Seus clubes</DropdownMenuLabel>
        {clubs.map((c) => (
          <DropdownMenuItem key={c.id} onSelect={() => selectClub(c.id)} className="gap-3">
            <TeamCrest
              abbreviation={c.abbreviation}
              colorPrimary={c.colorPrimary}
              colorSecondary={c.colorSecondary}
              size={22}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{ROLE_LABELS[c.role]}</span>
            </span>
            {c.id === club.id ? <Check className="h-4 w-4" aria-label="Clube atual" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/clube")} className="gap-2">
          <Settings className="h-4 w-4" /> Clube e associados
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/comecar")} className="gap-2">
          <Plus className="h-4 w-4" /> Criar ou entrar em outro clube
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
