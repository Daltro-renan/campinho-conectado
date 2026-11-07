import type { CSSProperties, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  CalendarDays,
  Landmark,
  Home,
  MessageCircle,
  ScrollText,
  Shirt,
  Trophy,
  User,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useActiveClub } from "@/lib/club";
import { ClubSwitcher } from "./ClubSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/format";

type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean; finance?: boolean };

const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: Home, mobile: true },
  { href: "/jogos", label: "Jogos", icon: CalendarDays, mobile: true },
  { href: "/elenco", label: "Elenco", icon: Shirt, mobile: true },
  { href: "/ranking", label: "Ranking", icon: Trophy, mobile: true },
  { href: "/mensalidades", label: "Mensalidades", icon: Wallet },
  { href: "/caixa", label: "Caixa", icon: Landmark },
  { href: "/inadimplencia", label: "Inadimplência", icon: AlertTriangle, finance: true },
  { href: "/chat", label: "Chat", icon: MessageCircle, mobile: true },
  { href: "/regras", label: "Regras", icon: ScrollText },
  { href: "/clube", label: "Clube", icon: Users },
  { href: "/perfil", label: "Perfil", icon: User },
];

function isActive(location: string, href: string) {
  return href === "/" ? location === "/" : location === href || location.startsWith(`${href}/`);
}

/**
 * Estrutura das telas logadas:
 * - computador: menu lateral verde com o clube no topo;
 * - celular: barra superior com o clube e navegação fixa embaixo.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { club, can } = useActiveClub();
  const clubVars = { "--club": club.colorPrimary, "--club-fg": readableOn(club.colorPrimary) } as CSSProperties;
  const nav = NAV.filter((i) => !i.finance || can("finance.manage"));

  return (
    <div className="min-h-screen md:flex" style={clubVars}>
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-2 pt-5">
          <AppLogo size={30} />
          <span className="font-display text-lg font-semibold uppercase leading-none tracking-wide text-white">
            Campinho
            <span className="block text-xs font-medium tracking-[0.2em] text-gold">Conectado</span>
          </span>
        </div>
        <div className="border-b border-sidebar-border p-3">
          <ClubSwitcher />
        </div>
        <nav className="flex-1 space-y-0.5 p-3" aria-label="Principal">
          {nav.map((item) => {
            const active = isActive(location, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {user ? (
          <Link
            href="/perfil"
            className="flex items-center gap-3 border-t border-sidebar-border p-4 hover:bg-sidebar-accent"
          >
            <UserAvatar name={user.name} url={user.avatarUrl} className="h-8 w-8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="block truncate text-xs text-sidebar-foreground/60">{user.email}</span>
            </span>
          </Link>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-30 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-border/60 bg-background/80 px-3 backdrop-blur-md md:hidden">
          <div className="min-w-0">
            <ClubSwitcher variant="topbar" />
          </div>
          <Link href="/" aria-label="Início">
            <AppLogo size={30} />
          </Link>
          <div className="flex items-center justify-end gap-1">
            <Link href="/mensalidades" aria-label="Mensalidades" className="rounded-md p-2 hover:bg-accent">
              <Wallet className="h-5 w-5" />
            </Link>
            {user ? (
              <Link href="/perfil" aria-label="Meu perfil" className="rounded-full p-0.5 ring-2 ring-gold/70 hover:ring-gold">
                <UserAvatar name={user.name} url={user.avatarUrl} className="h-8 w-8" />
              </Link>
            ) : null}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-10">
          {children}
        </main>
      </div>

      {/* Navegação inferior (celular) */}
      <nav
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-[hsl(var(--sidebar-background)/0.94)] text-sidebar-foreground backdrop-blur-md md:hidden"
        aria-label="Principal"
      >
        <div className="mx-auto flex h-16 max-w-lg">
          {nav.filter((i) => i.mobile).map((item) => {
            const active = isActive(location, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-white" : "text-sidebar-foreground/60",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--primary)/0.55)]",
                  )}
                  aria-hidden
                >
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
