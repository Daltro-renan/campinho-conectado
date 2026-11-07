import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarPlus, ChevronRight, Megaphone, Pin } from "lucide-react";
import type { OverviewDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/games/Scoreboard";
import { GameRow } from "@/components/games/GameRow";
import { StatusPill } from "@/components/StatusPill";
import { UserAvatar } from "@/components/UserAvatar";
import { ClubTeamCrest } from "@/components/TeamCrest";
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
      {/* Faixa na cor da camisa: a cara do clube no topo */}
      <header className="club-band -mx-4 -mt-5 flex items-center gap-4 px-4 pb-16 pt-6 md:mx-0 md:-mt-2 md:rounded-2xl md:px-6">
        <ClubTeamCrest
          abbreviation={club.abbreviation}
          colorPrimary={club.colorSecondary}
          colorSecondary={club.colorPrimary}
          size={60}
        />
        <div className="min-w-0">
          <p className="text-sm opacity-80">Olá, {first}</p>
          <h1 className="line-clamp-2 text-4xl font-extrabold leading-[0.95] md:text-5xl">{club.name}</h1>
        </div>
      </header>
      <div className="relative -mt-11">

      {isLoading || !data ? (
        <LoadingRows rows={3} />
      ) : (
        <>
          {data.nextGame ? (
            <Scoreboard game={data.nextGame} />
          ) : (
            <div className="pitch-field flex flex-col items-center rounded-2xl px-6 py-10 text-center text-pitch-foreground">
              <p className="font-display text-2xl font-semibold">Nenhum jogo marcado</p>
              <p className="mt-1 text-sm text-pitch-foreground/75">
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
              className="group flex flex-col justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Sua mensalidade</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-3">
                <StatusPill status={data.dues.status} />
                <p className="mt-2 text-sm">
                  {data.dues.next ? (
                    <>
                      {fmtMonth(data.dues.next.referenceMonth)}: <strong>{money(data.dues.next.amount)}</strong>,
                      vence {fmtDate(parseDay(data.dues.next.dueDate), "dd/MM")}
                      {data.dues.openCount > 1 ? ` (+${data.dues.openCount - 1} em aberto)` : ""}
                    </>
                  ) : data.dues.status === "pago" ? (
                    "Tudo pago. Obrigado!"
                  ) : (
                    "Nenhuma cobrança gerada ainda."
                  )}
                </p>
              </div>
            </Link>

            <div className="rounded-lg border bg-card p-4">
              <span className="text-sm font-medium text-muted-foreground">Campanha do clube</span>
              <dl className="mt-3 grid grid-cols-3 text-center">
                <Stat label="Vitórias" value={data.record.wins} className="text-ok" />
                <Stat label="Empates" value={data.record.draws} />
                <Stat label="Derrotas" value={data.record.losses} className="text-danger" />
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

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className={`scoreline text-4xl ${className ?? ""}`}>{value}</dd>
      <dd className="mt-1 text-xs text-muted-foreground" aria-hidden>
        {label}
      </dd>
    </div>
  );
}
