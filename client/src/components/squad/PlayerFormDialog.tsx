import { useEffect, useState, type FormEvent } from "react";
import type { MemberDTO, PlayerDTO, TeamDTO } from "@shared/api";
import { PLAYER_POSITIONS, PLAYER_STATUSES } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { capitalize } from "@/lib/format";

const NONE = "nenhum";

export function PlayerFormDialog({
  open,
  onOpenChange,
  player,
  teams,
  members,
  defaultTeamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player?: PlayerDTO | null;
  teams: TeamDTO[];
  members: MemberDTO[];
  defaultTeamId?: number;
}) {
  const { clubPath } = useClub();
  const blank = () => ({
    name: player?.name ?? "",
    nickname: player?.nickname ?? "",
    position: player?.position ?? "",
    shirtNumber: player?.shirtNumber != null ? String(player.shirtNumber) : "",
    teamId: player?.teamId ? String(player.teamId) : defaultTeamId ? String(defaultTeamId) : NONE,
    userId: player?.userId ? String(player.userId) : NONE,
    status: player?.status ?? "ativo",
    isCaptain: player?.isCaptain ?? false,
    goals: String(player?.goals ?? 0),
    assists: String(player?.assists ?? 0),
    yellowCards: String(player?.yellowCards ?? 0),
    redCards: String(player?.redCards ?? 0),
    gamesPlayed: String(player?.gamesPlayed ?? 0),
  });
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player]);

  const save = useClubMutation(
    () => {
      const body = {
        ...form,
        shirtNumber: form.shirtNumber === "" ? null : Number(form.shirtNumber),
        teamId: form.teamId === NONE ? null : Number(form.teamId),
        userId: form.userId === NONE ? null : Number(form.userId),
      };
      return player ? api.patch(clubPath(`/players/${player.id}`), body) : api.post(clubPath("/players"), body);
    },
    { success: player ? "Jogador atualizado" : "Jogador cadastrado", onSuccess: () => onOpenChange(false) },
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{player ? "Editar jogador" : "Novo jogador"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field label="Nome" htmlFor="pl-name">
              <Input id="pl-name" value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="Camisa" htmlFor="pl-number">
              <Input
                id="pl-number"
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={form.shirtNumber}
                onChange={set("shirtNumber")}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Apelido" htmlFor="pl-nick">
              <Input id="pl-nick" value={form.nickname} onChange={set("nickname")} />
            </Field>
            <Field label="Posição">
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time">
              <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem time</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Situação">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {capitalize(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Conta no app" hint="Vincule ao associado, se o jogador também usa o app">
            <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Não vincular</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-3">
            <Switch id="pl-captain" checked={form.isCaptain} onCheckedChange={(isCaptain) => setForm({ ...form, isCaptain })} />
            <Label htmlFor="pl-captain">Capitão</Label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Números na temporada</legend>
            <div className="grid grid-cols-5 gap-2">
              {(
                [
                  ["gamesPlayed", "Jogos"],
                  ["goals", "Gols"],
                  ["assists", "Assist."],
                  ["yellowCards", "Amarelos"],
                  ["redCards", "Vermelhos"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="space-y-1 text-center">
                  <span className="block text-xs text-muted-foreground">{label}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form[k]}
                    onChange={set(k)}
                    className="px-1 text-center font-display text-lg"
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={save.isPending || !form.position}>
              {save.isPending ? "Salvando…" : player ? "Salvar jogador" : "Cadastrar jogador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
