import { useEffect, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { GameDTO, GameKind } from "@shared/api";
import { SIDES } from "@shared/validation";
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
import { SideCrest } from "./GameSides";

function initialState(game?: GameDTO | null) {
  return {
    kind: (game?.kind ?? "racha") as GameKind,
    teams: game?.teams?.length ? [...game.teams] : ["", "", ""],
    sideAName: game?.sideAName ?? "",
    sideBName: game?.sideBName ?? "",
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
      const { teams, ...rest } = form;
      const body = {
        ...rest,
        teams: form.kind === "torneio" ? teams.map((t, i) => t.trim() || `Time ${SIDES[i]}`) : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
      };
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
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo de jogo</legend>
            <Segmented
              value={form.kind}
              onChange={(kind) =>
                setForm({
                  ...form,
                  kind,
                  competition:
                    kind === "racha" ? "treino" : kind === "torneio" ? "campeonato" : form.competition === "treino" ? "amistoso" : form.competition,
                })
              }
              options={[
                { value: "racha", label: "Racha" },
                { value: "torneio", label: "Torneio" },
                { value: "externo", label: "Contra adversário" },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {form.kind === "racha"
                ? "Jogo entre os associados: você monta os dois times depois, jogador por jogador."
                : form.kind === "torneio"
                  ? "Vários times no mesmo dia (de 3 a 8). Cada partida conta no ranking, e a classificação sai sozinha."
                  : `${club.name} contra um time de fora.`}
            </p>
          </fieldset>

          {form.kind === "torneio" ? (
            <>
              <Field label="Nome do torneio" htmlFor="game-comp">
                <Input
                  id="game-comp"
                  placeholder="Ex.: Torneio de Fim de Ano"
                  value={form.competitionName}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, competitionName: e.target.value })}
                />
              </Field>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Times ({form.teams.length})</legend>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {form.teams.map((t, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <SideCrest club={club} side={SIDES[i]} size={28} />
                      <Input
                        value={t}
                        placeholder={`Time ${SIDES[i]}`}
                        maxLength={30}
                        aria-label={`Nome do time ${SIDES[i]}`}
                        onChange={(e) => {
                          const teams = [...form.teams];
                          teams[i] = e.target.value;
                          setForm({ ...form, teams });
                        }}
                      />
                      {form.teams.length > 3 && i === form.teams.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, teams: form.teams.slice(0, -1) })}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
                          aria-label="Remover último time"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {form.teams.length < 8 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, teams: [...form.teams, ""] })}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Adicionar time
                  </Button>
                ) : null}
              </fieldset>
            </>
          ) : form.kind === "racha" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome do Time A" htmlFor="side-a">
                <Input
                  id="side-a"
                  placeholder="Time A"
                  value={form.sideAName}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, sideAName: e.target.value })}
                />
              </Field>
              <Field label="Nome do Time B" htmlFor="side-b">
                <Input
                  id="side-b"
                  placeholder="Time B"
                  value={form.sideBName}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, sideBName: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <>
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
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Competição">
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

          {form.kind !== "torneio" && (form.competition === "campeonato" || form.competition === "copa") ? (
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
