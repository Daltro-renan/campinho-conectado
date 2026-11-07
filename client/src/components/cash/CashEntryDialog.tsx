import { useEffect, useState, type FormEvent } from "react";
import type { CashEntryDTO } from "@shared/api";
import { CASH_CATEGORIES } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Field";
import { Segmented } from "@/components/games/GameFormDialog";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { centsToInput, money, parseMoney } from "@/lib/format";

type CashType = "entrada" | "saida";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Registrar ou corrigir uma entrada/despesa do caixa */
export function CashEntryDialog({
  open,
  type,
  entry,
  onOpenChange,
}: {
  open: boolean;
  type: CashType;
  entry?: CashEntryDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { clubPath } = useActiveClub();
  const initial = () => ({
    type: (entry?.type ?? type) as CashType,
    amount: entry ? centsToInput(entry.amount) : "",
    category: entry?.category ?? "",
    description: entry?.description ?? "",
    date: entry?.date ?? today(),
  });
  const [form, setForm] = useState(initial);
  useEffect(() => {
    if (open) setForm(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, type]);

  const isOut = form.type === "saida";
  const cents = parseMoney(form.amount);
  const save = useClubMutation(
    () => {
      const body = { ...form, amount: cents };
      return entry?.id ? api.put(clubPath(`/cash/${entry.id}`), body) : api.post(clubPath("/cash"), body);
    },
    {
      success: entry ? "Lançamento corrigido" : isOut ? "Despesa registrada" : "Entrada registrada",
      onSuccess: () => onOpenChange(false),
    },
  );
  const valid = cents > 0 && form.category !== "" && form.description.trim().length >= 2 && form.date !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {entry ? "Corrigir lançamento" : isOut ? "Registrar despesa" : "Registrar entrada"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (valid) save.mutate(undefined);
          }}
        >
          <Segmented
            value={form.type}
            onChange={(t) => setForm({ ...form, type: t, category: "" })}
            options={[
              { value: "saida", label: "Despesa" },
              { value: "entrada", label: "Entrada" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)" htmlFor="cash-amount">
              <Input
                id="cash-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="font-display text-lg"
                required
                autoFocus
              />
            </Field>
            <Field label="Data" htmlFor="cash-date">
              <Input
                id="cash-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {CASH_CATEGORIES[form.type].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Descrição"
            htmlFor="cash-desc"
            hint={isOut ? "Ex.: Aluguel do campo, racha de sábado" : "Ex.: Patrocínio da Padaria Central"}
          >
            <Input
              id="cash-desc"
              maxLength={140}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" variant={isOut ? "destructive" : "default"} disabled={!valid || save.isPending}>
              {save.isPending
                ? "Salvando…"
                : `${entry ? "Salvar" : isOut ? "Registrar despesa" : "Registrar entrada"}${cents > 0 ? ` de ${money(cents)}` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
