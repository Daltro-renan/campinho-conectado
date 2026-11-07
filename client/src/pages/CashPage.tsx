import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, MoreVertical } from "lucide-react";
import type { CashEntryDTO, CashReport } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { CashEntryDialog } from "@/components/cash/CashEntryDialog";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { centsToInput, currentMonth, fmtDate, fmtMonth, money, parseDay, parseMoney, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "todos" | "entrada" | "saida";

/**
 * Caixa do clube, aberto a todos os associados: saldo, entradas e despesas do mês.
 * A diretoria lança; as mensalidades pagas entram sozinhas.
 */
export default function CashPage() {
  const { club, clubPath, key, can } = useActiveClub();
  const staff = can("finance.manage");
  const [month, setMonth] = useState(currentMonth);
  const [filter, setFilter] = useState<Filter>("todos");
  const [dialog, setDialog] = useState<{ type: "entrada" | "saida"; entry?: CashEntryDTO } | null>(null);
  const [openingOpen, setOpeningOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: key("cash", month),
    queryFn: () => api.get<CashReport>(clubPath(`/cash?month=${month}`)),
  });
  const remove = useClubMutation((id: number) => api.delete(clubPath(`/cash/${id}`)), { success: "Lançamento excluído" });

  const isCurrent = month === currentMonth();
  const list = (data?.entries ?? []).filter((e) => filter === "todos" || e.type === filter);
  const expenses = (data?.byCategory ?? []).filter((c) => c.type === "saida");
  const incomes = (data?.byCategory ?? []).filter((c) => c.type === "entrada");

  return (
    <div>
      <PageHeader
        title="Caixa"
        description={`Dinheiro do ${club.name}, aberto para todos os associados. Só a diretoria registra os lançamentos.`}
      />

      {/* Saldo */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/30 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Saldo em caixa hoje</p>
            <p
              className={cn(
                "scoreline mt-1 text-5xl",
                (data?.balance ?? 0) < 0 ? "text-danger" : "text-foreground",
              )}
            >
              {data ? money(data.balance) : "–"}
            </p>
          </div>
          <Landmark className="h-8 w-8 text-gold" aria-hidden />
        </div>
        {data && data.opening !== 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Inclui saldo inicial de {money(data.opening)}.</p>
        ) : null}
        {staff ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => setDialog({ type: "saida" })}>
              <ArrowUpRight className="mr-1.5 h-4 w-4" /> Registrar despesa
            </Button>
            <Button onClick={() => setDialog({ type: "entrada" })}>
              <ArrowDownLeft className="mr-1.5 h-4 w-4" /> Registrar entrada
            </Button>
          </div>
        ) : null}
      </section>

      {/* Mês */}
      <div className="mb-3 mt-6 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="font-display text-2xl font-semibold capitalize" aria-live="polite">
          {fmtMonth(month)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          disabled={isCurrent}
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading || !data ? (
        <LoadingRows rows={4} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowDownLeft className="h-4 w-4 text-ok" aria-hidden /> Entradas
              </dt>
              <dd className="scoreline mt-1 text-3xl text-ok">{money(data.monthIn)}</dd>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ArrowUpRight className="h-4 w-4 text-danger" aria-hidden /> Despesas
              </dt>
              <dd className="scoreline mt-1 text-3xl text-danger">{money(data.monthOut)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-muted-foreground">
            Resultado do mês:{" "}
            <strong className={data.monthIn - data.monthOut < 0 ? "text-danger" : "text-ok"}>
              {data.monthIn - data.monthOut >= 0 ? "+" : "−"}
              {money(Math.abs(data.monthIn - data.monthOut))}
            </strong>
            {isCurrent ? "" : `, saldo no fim do mês ${money(data.monthEndBalance)}`}
          </p>

          {/* Despesas por categoria */}
          {expenses.length > 0 ? (
            <>
              <SectionTitle>Para onde foi o dinheiro</SectionTitle>
              <CategoryBars items={expenses} total={data.monthOut} tone="bg-danger" />
            </>
          ) : null}
          {incomes.length > 0 ? (
            <>
              <SectionTitle>De onde veio</SectionTitle>
              <CategoryBars items={incomes} total={data.monthIn} tone="bg-ok" />
            </>
          ) : null}

          <SectionTitle>Lançamentos</SectionTitle>
          <div className="mb-3 grid grid-cols-3 rounded-full border bg-card p-1" role="group" aria-label="Filtrar lançamentos">
            {(
              [
                ["todos", "Todos"],
                ["saida", "Despesas"],
                ["entrada", "Entradas"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full py-1.5 text-sm font-semibold transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={Landmark}
              title={filter === "saida" ? "Nenhuma despesa neste mês" : filter === "entrada" ? "Nenhuma entrada neste mês" : "Nada lançado neste mês"}
              description={
                staff
                  ? "Registre aluguel de campo, arbitragem, material e o que mais o clube pagar ou receber."
                  : "Quando a diretoria registrar entradas e despesas, elas aparecem aqui."
              }
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {list.map((e) => (
                <EntryRow
                  key={e.id ?? `m-${e.date}`}
                  entry={e}
                  staff={staff}
                  onEdit={() => setDialog({ type: e.type, entry: e })}
                  onDelete={() => e.id && remove.mutate(e.id)}
                />
              ))}
            </ul>
          )}

          {staff ? (
            <button
              type="button"
              onClick={() => setOpeningOpen(true)}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              {data.opening ? `Saldo inicial: ${money(data.opening)} (alterar)` : "O clube já tinha dinheiro antes do app? Informe o saldo inicial"}
            </button>
          ) : null}
        </>
      )}

      <CashEntryDialog
        open={!!dialog}
        type={dialog?.type ?? "saida"}
        entry={dialog?.entry}
        onOpenChange={(o) => !o && setDialog(null)}
      />
      <OpeningDialog open={openingOpen} current={data?.opening ?? 0} onOpenChange={setOpeningOpen} />
    </div>
  );
}

function CategoryBars({
  items,
  total,
  tone,
}: {
  items: { category: string; amount: number }[];
  total: number;
  tone: string;
}) {
  return (
    <ul className="space-y-2.5 rounded-xl border bg-card p-4">
      {items.map((c) => {
        const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
        return (
          <li key={c.category}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{c.category}</span>
              <span>
                <strong>{money(c.amount)}</strong>
                <span className="ml-1.5 text-xs text-muted-foreground">{pct}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", tone)} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EntryRow({
  entry: e,
  staff,
  onEdit,
  onDelete,
}: {
  entry: CashEntryDTO;
  staff: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const out = e.type === "saida";
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          out ? "bg-danger/15 text-danger" : "bg-ok/15 text-ok",
        )}
        aria-hidden
      >
        {out ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{e.description}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {e.category}, {fmtDate(parseDay(e.date), "dd/MM")}
          {e.source === "mensalidades"
            ? ", automático"
            : e.createdByName
              ? `, lançado por ${e.createdByName.split(" ")[0]}${e.updatedAt ? " (corrigido)" : ""}`
              : ""}
        </span>
      </span>
      <span className={cn("scoreline shrink-0 text-lg", out ? "text-danger" : "text-ok")}>
        {out ? "−" : "+"}
        {money(e.amount)}
      </span>
      {staff && e.id ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8" aria-label={`Ações de ${e.description}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Corrigir</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}

function OpeningDialog({
  open,
  current,
  onOpenChange,
}: {
  open: boolean;
  current: number;
  onOpenChange: (open: boolean) => void;
}) {
  const { clubPath } = useActiveClub();
  const [value, setValue] = useState("");
  const save = useClubMutation(() => api.put(clubPath("/cash-opening"), { amount: parseMoney(value) }), {
    success: "Saldo inicial salvo",
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(current ? centsToInput(current) : "");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Saldo inicial</DialogTitle>
          <DialogDescription>Quanto o clube tinha em caixa antes de começar a usar o app.</DialogDescription>
        </DialogHeader>
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-display text-2xl"
          aria-label="Saldo inicial em reais"
          autoFocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate(undefined)}>
            {save.isPending ? "Salvando…" : "Salvar saldo inicial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

