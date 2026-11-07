import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronRight, Megaphone, Pin } from "lucide-react";
import type { OverviewDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Scoreboard } from "@/components/games/Scoreboard";
import { GameRow } from "@/components/games/GameRow";
import { StatusPill } from "@/components/StatusPill";
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
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Olá, {first}</p>
        <h1 className="text-3xl font-bold md:text-4xl">{club.name}</h1>
      </header>

      {isLoading || !data ? (
        <LoadingRows rows={3} />
      ) : (
        <>
          {data.nextGame ? (
            <Scoreboard game={data.nextGame} />
          ) : (
            <div className="pitch-markings flex flex-col items-center rounded-xl px-6 py-10 text-center text-pitch-foreground">
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
              <div className="rounded-lg border bg-card">
                <GameRow game={data.lastGame} />
              </div>
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
              <SectionTitle>Artilharia</SectionTitle>
              <ol className="divide-y rounded-lg border bg-card">
                {data.topScorers.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                    <span className="scoreline w-5 text-center text-xl text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.nickname || p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.position}
                        {p.teamName ? `, ${p.teamName}` : ""}
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
