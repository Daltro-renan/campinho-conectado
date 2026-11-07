import { useEffect, useState, type FormEvent } from "react";
import type { GameDTO } from "@shared/api";
import { COMPETITIONS, COMPETITION_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { toDateTimeInput } from "@/lib/format";
import { cn } from "@/lib/utils";

function initialState(game?: GameDTO | null) {
  return {
    opponentName: game?.opponentName ?? "",
    isHome: game?.isHome ?? true,
    competition: game?.competition ?? "amistoso",
    competitionName: game?.competitionName ?? "",
    startsAt: game ? toDateTimeInput(game.startsAt) : "",
    location: game?.location ?? "",
    notes: game?.notes ?? "",
  };
}

/** Marcar ou editar um jogo do clube contra um adversário */
export function GameFormDialog({
  open,
  onOpenChange,
  game,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: GameDTO | null;
}) {
  const { club, clubPath } = useActiveClub();
  const [form, setForm] = useState(() => initialState(game));

  useEffect(() => {
    if (open) setForm(initialState(game));
  }, [open, game]);

  const save = useClubMutation(
    () => {
      const body = { ...form, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "" };
      return game ? api.patch(clubPath(`/games/${game.id}`), body) : api.post(clubPath("/games"), body);
    },
    { success: game ? "Jogo atualizado" : "Jogo marcado", onSuccess: () => onOpenChange(false) },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{game ? "Editar jogo" : "Marcar jogo"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
          className="space-y-4"
        >
          <Field label={`${club.name} x`} htmlFor="game-opponent">
            <Input
              id="game-opponent"
              placeholder="Nome do adversário, ex.: União FC"
              value={form.opponentName}
              onChange={(e) => setForm({ ...form, opponentName: e.target.value })}
              required
            />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Mando de campo</legend>
            <Segmented
              value={form.isHome ? "casa" : "fora"}
              onChange={(v) => setForm({ ...form, isHome: v === "casa" })}
              options={[
                { value: "casa", label: "Em casa" },
                { value: "fora", label: "Fora" },
              ]}
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select value={form.competition} onValueChange={(v) => setForm({ ...form, competition: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPETITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COMPETITION_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data e hora" htmlFor="game-date">
              <Input
                id="game-date"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                required
              />
            </Field>
          </div>

          {form.competition === "campeonato" || form.competition === "copa" ? (
            <Field label="Nome da competição" htmlFor="game-comp">
              <Input
                id="game-comp"
                placeholder="Ex.: Copa do Bairro 2026"
                value={form.competitionName}
                onChange={(e) => setForm({ ...form, competitionName: e.target.value })}
              />
            </Field>
          ) : null}

          <Field label="Local" htmlFor="game-location" hint="Aparece no mapa e no botão Como chegar">
            <Input
              id="game-location"
              placeholder="Ex.: Campo Central, Rua das Flores 100"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>

          <Field label="Observações" htmlFor="game-notes">
            <Textarea
              id="game-notes"
              rows={2}
              placeholder="Uniforme, horário de chegada…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : game ? "Salvar jogo" : "Marcar jogo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Botões lado a lado para escolher uma opção */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="grid rounded-md bg-muted p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
            value === o.value ? "bg-card shadow-sm" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
