import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MemberDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { centsToInput, money, parseMoney } from "@/lib/format";

/** Vencimento padrão: o dia de vencimento do clube dentro do mês (ou o último dia, se o mês for curto) */
function defaultDueDate(month: string, dueDay: number) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(dueDay, last)).padStart(2, "0")}`;
}

/** Cobrança para um associado só: mensalidade que faltou, refeita ou com valor diferente */
export function NewDueDialog({
  open,
  month,
  onOpenChange,
}: {
  open: boolean;
  month: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { club, clubPath, key } = useActiveClub();
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
    enabled: open,
  });

  const initial = () => ({
    userId: "",
    referenceMonth: month,
    amount: club.monthlyFee > 0 ? centsToInput(club.monthlyFee) : "",
    dueDate: defaultDueDate(month, club.dueDay),
    notes: "",
  });
  const [form, setForm] = useState(initial);
  useEffect(() => {
    if (open) setForm(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, month]);

  const save = useClubMutation(
    () =>
      api.post(clubPath("/dues"), {
        userId: Number(form.userId),
        referenceMonth: form.referenceMonth,
        amount: parseMoney(form.amount),
        dueDate: form.dueDate,
        notes: form.notes,
      }),
    { success: "Cobrança criada", onSuccess: () => onOpenChange(false) },
  );

  const sorted = [...(members.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const amountCents = parseMoney(form.amount);
  const valid = form.userId !== "" && amountCents > 0 && /^\d{4}-\d{2}$/.test(form.referenceMonth) && form.dueDate !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova cobrança</DialogTitle>
          <DialogDescription>
            Para um associado só. Se você excluiu a mensalidade dele neste mês, ela volta com estes dados.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (valid) save.mutate(undefined);
          }}
        >
          <Field label="Associado">
            <Select value={form.userId} onValueChange={(userId) => setForm({ ...form, userId })}>
              <SelectTrigger>
                <SelectValue placeholder={members.isLoading ? "Carregando…" : "Escolha o associado"} />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)}>
                    {m.name}
                    {m.feeExempt ? " (isento)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mês de referência" htmlFor="due-month">
              <Input
                id="due-month"
                type="month"
                value={form.referenceMonth}
                onChange={(e) =>
                  setForm({
                    ...form,
                    referenceMonth: e.target.value,
                    dueDate: e.target.value ? defaultDueDate(e.target.value, club.dueDay) : form.dueDate,
                  })
                }
                required
              />
            </Field>
            <Field label="Valor (R$)" htmlFor="due-amount">
              <Input
                id="due-amount"
                inputMode="decimal"
                placeholder="50,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Vencimento" htmlFor="due-date">
            <Input
              id="due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </Field>
          <Field label="Observação" htmlFor="due-notes" hint="Opcional, ex.: valor proporcional">
            <Input
              id="due-notes"
              maxLength={200}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? "Criando…" : amountCents > 0 ? `Criar cobrança de ${money(amountCents)}` : "Criar cobrança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
