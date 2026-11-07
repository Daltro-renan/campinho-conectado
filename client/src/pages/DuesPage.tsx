import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Copy, MoreVertical, Plus, Receipt, Wallet } from "lucide-react";
import type { DueDTO, DuesSummary, FinanceOverview } from "@shared/api";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { StatusPill } from "@/components/StatusPill";
import { PayDueDialog } from "@/components/dues/PayDueDialog";
import { NewDueDialog } from "@/components/dues/NewDueDialog";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { currentMonth, fmtDate, fmtMonth, money, parseDay, shiftMonth } from "@/lib/format";

type MyDues = { summary: DuesSummary; items: DueDTO[]; pixKey: string | null };

export default function DuesPage() {
  const { can } = useActiveClub();
  const manage = can("finance.manage");

  return (
    <div>
      <PageHeader title="Mensalidades" />
      {manage ? (
        <Tabs defaultValue="minhas">
          <TabsList className="mb-5">
            <TabsTrigger value="minhas">Minhas</TabsTrigger>
            <TabsTrigger value="clube">Cobranças do clube</TabsTrigger>
          </TabsList>
          <TabsContent value="minhas">
            <MyDuesSection />
          </TabsContent>
          <TabsContent value="clube">
            <ClubDuesSection />
          </TabsContent>
        </Tabs>
      ) : (
        <MyDuesSection />
      )}
    </div>
  );
}

function MyDuesSection() {
  const { club, clubPath, key } = useActiveClub();
  const [paying, setPaying] = useState<DueDTO | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: key("dues", "me"),
    queryFn: () => api.get<MyDues>(clubPath("/dues/me")),
  });

  if (isLoading || !data) return <LoadingRows />;
  const { summary, items, pixKey } = data;

  const headline =
    summary.status === "pago"
      ? "Você está em dia"
      : summary.status === "vencido"
        ? "Você tem mensalidade vencida"
        : summary.status === "pendente"
          ? "Mensalidade em aberto"
          : "Nenhuma cobrança ainda";

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5">
        <StatusPill status={summary.status} />
        <p className="mt-3 font-display text-3xl font-semibold">{headline}</p>
        {summary.openCount > 0 ? (
          <p className="mt-1 text-muted-foreground">
            {summary.openCount === 1 ? "Valor em aberto: " : `${summary.openCount} mensalidades, total `}
            <strong className="text-foreground">{money(summary.openAmount)}</strong>
            {summary.next ? `. Vencimento: ${fmtDate(parseDay(summary.next.dueDate))}` : ""}
          </p>
        ) : null}
        {club.onlinePayments && summary.next ? (
          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={() => setPaying(summary.next)}>
            <Wallet className="mr-2 h-4 w-4" /> Pagar {money(summary.next.amount)} agora
          </Button>
        ) : null}
        {!club.onlinePayments && pixKey && summary.openCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Chave PIX do clube</p>
              <p className="truncate font-mono text-sm">{pixKey}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(pixKey).then(
                  () => toast.success("Chave PIX copiada"),
                  () => toast.error("Não foi possível copiar. Selecione e copie manualmente."),
                );
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copiar
            </Button>
          </div>
        ) : null}
        {summary.openCount > 0 && !club.onlinePayments ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Depois de pagar, avise a diretoria para darem baixa na mensalidade.
          </p>
        ) : null}
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sem histórico"
          description="Quando a diretoria gerar as mensalidades, elas aparecem aqui."
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-4 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{fmtMonth(d.referenceMonth)}</span>
                <span className="block text-xs text-muted-foreground">
                  {d.paidAt
                    ? `Paga em ${fmtDate(d.paidAt)}${d.method ? ` via ${PAYMENT_METHOD_LABELS[d.method as keyof typeof PAYMENT_METHOD_LABELS] ?? d.method}` : ""}`
                    : `Vence em ${fmtDate(parseDay(d.dueDate))}`}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums">{money(d.amount)}</span>
                <StatusPill status={d.status} labels={{ pago: "Paga" }} className="mt-1" />
              </span>
              {club.onlinePayments && d.status !== "pago" ? (
                <Button size="sm" variant="outline" onClick={() => setPaying(d)}>
                  Pagar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <PayDueDialog due={paying} onOpenChange={(open) => !open && setPaying(null)} />
    </div>
  );
}

function ClubDuesSection() {
  const { club, clubPath, key } = useActiveClub();
  const [month, setMonth] = useState(currentMonth);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: key("dues", "club", month),
    queryFn: () => api.get<{ overview: FinanceOverview; items: DueDTO[] }>(clubPath(`/dues?month=${month}`)),
  });

  const generate = useClubMutation(
    () => api.post<{ created: number }>(clubPath("/dues/generate"), { referenceMonth: month }),
    {
      onSuccess: (r) =>
        r.created > 0
          ? toast.success(`${r.created} mensalidade${r.created === 1 ? "" : "s"} gerada${r.created === 1 ? "" : "s"}`)
          : toast.info("Todos os associados (não isentos) já têm a mensalidade deste mês. Para refazer uma excluída, use Nova cobrança."),
    },
  );
  const mark = useClubMutation(
    (vars: { due: DueDTO; paid: boolean; method?: string }) =>
      api.patch(clubPath(`/dues/${vars.due.id}`), { paid: vars.paid, method: vars.method ?? null }),
    { success: undefined },
  );
  const remove = useClubMutation((due: DueDTO) => api.delete(clubPath(`/dues/${due.id}`)), {
    success: "Cobrança excluída. Para cobrar de novo, use Nova cobrança.",
  });

  const o = data?.overview;
  const progress = o && o.expected > 0 ? Math.round((o.received / o.expected) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="font-display text-2xl font-semibold" aria-live="polite">
          {fmtMonth(month)}
        </p>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {club.monthlyFee <= 0 ? (
        <div className="rounded-lg border border-warn/60 bg-warn/10 px-4 py-3 text-sm">
          Defina o valor da mensalidade e o dia de vencimento em{" "}
          <Link href="/clube" className="font-semibold underline underline-offset-2">
            Clube
          </Link>
          . A partir daí, as cobranças são geradas automaticamente todo mês.
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Geradas automaticamente todo mês: {money(club.monthlyFee)}, vencimento dia {club.dueDay}.{" "}
          <Link href="/inadimplencia" className="font-medium text-primary hover:underline">
            Ver inadimplentes
          </Link>
        </p>
      )}

      {isLoading || !data || !o ? (
        <LoadingRows />
      ) : (
        <>
          <section className="rounded-lg border bg-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="scoreline text-4xl">{money(o.received)}</p>
              </div>
              <p className="text-sm text-muted-foreground">de {money(o.expected)} previstos</p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Arrecadação do mês"
            >
              <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-sm">
              <span className="font-semibold text-ok">{o.paidCount} pagas</span>
              {", "}
              <span className="font-semibold">{o.openCount - o.overdueCount} pendentes</span>
              {", "}
              <span className="font-semibold text-danger">{o.overdueCount} vencidas</span>
            </p>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            {club.monthlyFee > 0 ? (
              <Button variant="outline" disabled={generate.isPending} onClick={() => generate.mutate(undefined)}>
                <Wallet className="mr-2 h-4 w-4" />
                {generate.isPending ? "Gerando…" : `Gerar mensalidades de ${fmtMonth(month).split(" ")[0]}`}
              </Button>
            ) : null}
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova cobrança
            </Button>
          </div>
          {club.monthlyFee > 0 ? (
            <p className="-mt-3 text-xs text-muted-foreground">
              Gerar cria {money(club.monthlyFee)} só para quem ainda não tem cobrança no mês. Nova cobrança é para um
              associado só, com valor e vencimento à sua escolha.
            </p>
          ) : null}

          {data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Nenhuma cobrança neste mês"
              description={
                month > currentMonth()
                  ? "As mensalidades deste mês serão geradas automaticamente quando ele começar."
                  : "As mensalidades são geradas automaticamente todo mês para os associados não isentos."
              }
            />
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {data.items.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.memberName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {money(d.amount)},{" "}
                      {d.paidAt ? `paga em ${fmtDate(d.paidAt, "dd/MM")}` : `vence ${fmtDate(parseDay(d.dueDate), "dd/MM")}`}
                    </span>
                  </span>
                  <StatusPill status={d.status} labels={{ pago: "Paga" }} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações para ${d.memberName}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {d.paidAt ? (
                        <DropdownMenuItem onSelect={() => mark.mutate({ due: d, paid: false })}>
                          Desfazer baixa
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            Dar baixa como pago via
                          </DropdownMenuLabel>
                          {PAYMENT_METHODS.map((m) => (
                            <DropdownMenuItem
                              key={m}
                              onSelect={() =>
                                mark.mutate(
                                  { due: d, paid: true, method: m },
                                  { onSuccess: () => toast.success(`Baixa registrada para ${d.memberName}`) },
                                )
                              }
                            >
                              {PAYMENT_METHOD_LABELS[m]}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => remove.mutate(d)}
                      >
                        Excluir cobrança
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <NewDueDialog open={creating} month={month} onOpenChange={setCreating} />
    </div>
  );
}

