import { useEffect, useState, type FormEvent } from "react";
import type { GameDTO, TeamDTO } from "@shared/api";
import { COMPETITIONS, COMPETITION_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { toDateTimeInput } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamDTO[];
  game?: GameDTO | null;
};

function initialState(teams: TeamDTO[], game?: GameDTO | null) {
  return {
    teamId: game ? String(game.teamId) : teams[0] ? String(teams[0].id) : "",
    opponentKind: game?.opponentTeamId ? ("interno" as const) : ("externo" as const),
    opponentTeamId: game?.opponentTeamId ? String(game.opponentTeamId) : "",
    opponentName: game?.opponentName ?? "",
    isHome: game?.isHome ?? true,
    competition: game?.competition ?? "amistoso",
    competitionName: game?.competitionName ?? "",
    startsAt: game ? toDateTimeInput(game.startsAt) : "",
    location: game?.location ?? "",
    notes: game?.notes ?? "",
  };
}

/** Criar ou editar um jogo. O adversário pode ser um time do clube ou de fora. */
export function GameFormDialog({ open, onOpenChange, teams, game }: Props) {
  const { clubPath } = useClub();
  const [form, setForm] = useState(() => initialState(teams, game));

  useEffect(() => {
    if (open) setForm(initialState(teams, game));
  }, [open, game, teams]);

  const save = useClubMutation(
    () => {
      const body = {
        teamId: Number(form.teamId),
        opponentTeamId: form.opponentKind === "interno" ? Number(form.opponentTeamId) || null : null,
        opponentName: form.opponentKind === "externo" ? form.opponentName : null,
        isHome: form.isHome,
        competition: form.competition,
        competitionName: form.competitionName,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
        location: form.location,
        notes: form.notes,
      };
      return game ? api.patch(clubPath(`/games/${game.id}`), body) : api.post(clubPath("/games"), body);
    },
    { success: game ? "Jogo atualizado" : "Jogo marcado", onSuccess: () => onOpenChange(false) },
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(undefined);
  };

  const otherTeams = teams.filter((t) => String(t.id) !== form.teamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{game ? "Editar jogo" : "Marcar jogo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nosso time">
            <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o time" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Adversário</legend>
            <Segmented
              value={form.opponentKind}
              onChange={(v) => setForm({ ...form, opponentKind: v })}
              options={[
                { value: "externo", label: "Time de fora" },
                { value: "interno", label: "Time do clube", disabled: otherTeams.length === 0 },
              ]}
            />
            {form.opponentKind === "externo" ? (
              <Input
                aria-label="Nome do adversário"
                placeholder="Ex.: União FC"
                value={form.opponentName}
                onChange={(e) => setForm({ ...form, opponentName: e.target.value })}
              />
            ) : (
              <Select value={form.opponentTeamId} onValueChange={(v) => setForm({ ...form, opponentTeamId: v })}>
                <SelectTrigger aria-label="Time adversário">
                  <SelectValue placeholder="Escolha o adversário" />
                </SelectTrigger>
                <SelectContent>
                  {otherTeams.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </fieldset>

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

          <Field label="Local" htmlFor="game-location">
            <Input
              id="game-location"
              placeholder="Ex.: Campo Central"
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
