import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarPlus, ChevronRight, Megaphone, Pin, ScrollText } from "lucide-react";
import type { OverviewDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/games/Scoreboard";
import { GameRow } from "@/components/games/GameRow";
import { StatusPill } from "@/components/StatusPill";
import { UserAvatar } from "@/components/UserAvatar";
import { SectionTitle } from "@/components/PageHeader";
import { LoadingRows } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtMonth, money, parseDay } from "@/lib/format";
import { NoticeComposer } from "./notices";

export default function HomePage() {
  const { user } = useAuth();
  const { club, clubPath, key, can } = useActiveClub();
  const { data, isLoading } = useQuery({
    queryKey: key("overview"),
    queryFn: () => api.get<OverviewDTO>(clubPath("/overview")),
  });

  const first = user?.name.split(" ")[0] ?? "";

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-muted-foreground">Olá, {first}</p>
        <h1 className="line-clamp-2 text-4xl font-bold uppercase leading-[1.02] tracking-wide md:text-5xl">{club.name}</h1>
      </header>
      <div>

      {isLoading || !data ? (
        <LoadingRows rows={3} />
      ) : (
        <>
          {data.nextGame ? (
            <Scoreboard game={data.nextGame} />
          ) : (
            <div className="stadium flex flex-col items-center rounded-2xl border border-white/10 px-6 pb-12 pt-10 text-center text-white">
              <p className="font-display text-2xl font-semibold">Nenhum jogo marcado</p>
              <p className="mt-1 text-sm text-white/75">
                {can("squad.manage")
                  ? "Marque o próximo jogo para o elenco confirmar presença."
                  : "Quando a comissão marcar o próximo jogo, ele aparece aqui."}
              </p>
              {can("squad.manage") ? (
                <Button asChild variant="secondary" className="mt-4">
                  <Link href="/jogos">
                    <CalendarPlus className="mr-2 h-4 w-4" /> Marcar jogo
                  </Link>
                </Button>
              ) : null}
            </div>
          )}

          {data.overdue && data.overdue.memberCount > 0 ? (
            <Link
              href="/inadimplencia"
              className="mt-4 flex items-center gap-3 rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 hover:bg-danger/10"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-danger" aria-hidden />
              <span className="flex-1 text-sm">
                <strong>
                  {data.overdue.memberCount} associado{data.overdue.memberCount === 1 ? "" : "s"} em atraso
                </strong>
                , total de {money(data.overdue.totalAmount)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Link>
          ) : null}

          {/* Mensalidade + campanha */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href="/mensalidades"
              className="ticket group flex min-h-[8.5rem] overflow-hidden rounded-xl shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex min-w-0 flex-1 flex-col justify-between py-4 pl-6 pr-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold">Mensalidade</span>
                  <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div>
                  <StatusPill status={data.dues.status} className="bg-white/70 !text-ticket-foreground !ring-black/10" />
                  <p className="mt-2 text-sm">
                    {data.dues.next ? (
                      <>
                        {fmtMonth(data.dues.next.referenceMonth)}: <strong>{money(data.dues.next.amount)}</strong>, vence{" "}
                        {fmtDate(parseDay(data.dues.next.dueDate), "dd/MM")}
                        {data.dues.openCount > 1 ? ` (+${data.dues.openCount - 1} em aberto)` : ""}
                      </>
                    ) : data.dues.status === "pago" ? (
                      "Tudo pago. Obrigado!"
                    ) : (
                      "Nenhuma cobrança gerada ainda."
                    )}
                  </p>
                </div>
              </div>
              {/* Canhoto com picote e código de barras */}
              <div className="flex w-16 shrink-0 items-center justify-center border-l-2 border-dashed border-ticket-foreground/30 pr-3">
                <span className="barcode h-[70%] w-9 opacity-80" aria-hidden />
              </div>
            </Link>

            <div className="rounded-xl border bg-card p-4">
              <span className="font-display text-lg font-semibold">Campanha</span>
              <dl className="mt-2 grid grid-cols-3 text-center">
                <Gauge label="Vitórias" value={data.record.wins} total={data.record.played} color="hsl(var(--status-ok))" />
                <Gauge label="Empates" value={data.record.draws} total={data.record.played} color="hsl(var(--muted-foreground))" />
                <Gauge label="Derrotas" value={data.record.losses} total={data.record.played} color="hsl(var(--status-danger))" />
              </dl>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {data.record.goalsFor} gols marcados, {data.record.goalsAgainst} sofridos
              </p>
            </div>
          </div>

          {data.lastGame ? (
            <>
              <SectionTitle
                action={
                  <Link href="/jogos" className="text-sm font-medium text-primary hover:underline">
                    Ver jogos
                  </Link>
                }
              >
                Último resultado
              </SectionTitle>
              <GameRow game={data.lastGame} />
            </>
          ) : null}

          <Link
            href="/regras"
            className="mt-4 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:border-gold/60"
          >
            <ScrollText className="h-5 w-5 shrink-0 text-gold" aria-hidden />
            <span className="flex-1 text-sm font-medium">Regras da associação</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>

          <SectionTitle action={can("notices.manage") ? <NoticeComposer /> : undefined}>Avisos</SectionTitle>
          {data.notices.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              <Megaphone className="mx-auto mb-2 h-5 w-5" aria-hidden />
              Nenhum aviso da diretoria por enquanto.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {data.notices.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {n.pinned ? <Pin className="h-3.5 w-3.5 text-primary" aria-label="Fixado" /> : null}
                    {n.title}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {n.authorName ?? "Diretoria"}, {fmtDate(n.createdAt, "dd/MM 'às' HH:mm")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {data.topScorers.length > 0 ? (
            <>
              <SectionTitle
                action={
                  <Link href="/ranking" className="text-sm font-medium text-primary hover:underline">
                    Ver ranking
                  </Link>
                }
              >
                Artilharia
              </SectionTitle>
              <ol className="divide-y rounded-lg border bg-card">
                {data.topScorers.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="scoreline w-5 text-center text-xl text-muted-foreground">{i + 1}</span>
                    <UserAvatar name={p.name} url={p.avatarUrl} className="h-8 w-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.nickname || p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.position ?? "Posição não definida"}
                        {p.assists > 0 ? `, ${p.assists} assistência${p.assists === 1 ? "" : "s"}` : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="scoreline block text-2xl">{p.goals}</span>
                      <span className="text-xs text-muted-foreground">gols</span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </>
      )}
      </div>
    </div>
  );
}

/** Mostrador semicircular: a fatia dos jogos com esse resultado */
function Gauge({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const r = 26;
  const half = Math.PI * r;
  const share = total > 0 ? value / total : 0;
  return (
    <div className="flex flex-col items-center">
      <dt className="sr-only">{label}</dt>
      <dd className="relative h-[42px] w-[68px]">
        <svg viewBox="0 0 68 40" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M8 34a26 26 0 0 1 52 0" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" strokeLinecap="round" />
          <path
            d="M8 34a26 26 0 0 1 52 0"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${half * share} ${half}`}
          />
          {Array.from({ length: 7 }, (_, i) => {
            const a = Math.PI - (i * Math.PI) / 6;
            return (
              <line
                key={i}
                x1={34 + Math.cos(a) * 31}
                y1={34 - Math.sin(a) * 31}
                x2={34 + Math.cos(a) * 33.5}
                y2={34 - Math.sin(a) * 33.5}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                opacity="0.6"
              />
            );
          })}
        </svg>
        <span className="scoreline absolute inset-x-0 bottom-0 text-center text-2xl" style={{ color }}>
          {value}
        </span>
      </dd>
      <dd className="mt-1 text-xs text-muted-foreground" aria-hidden>
        {label}
      </dd>
    </div>
  );
}
