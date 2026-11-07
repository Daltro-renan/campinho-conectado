import { useEffect, useState, type FormEvent } from "react";
import type { MemberDTO } from "@shared/api";
import { PLAYER_POSITIONS, PLAYER_STATUSES } from "@shared/validation";
import { ROLE_LABELS } from "@shared/roles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/Field";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { capitalize } from "@/lib/format";

const NONE = "nenhuma";

/**
 * Ficha do jogador. O próprio associado edita apelido, posição e número;
 * a comissão técnica edita também situação, capitão e os números da temporada.
 */
export function PlayerDialog({
  member,
  staff,
  onOpenChange,
}: {
  member: MemberDTO | null;
  staff: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { clubPath } = useActiveClub();
  const toForm = (m: MemberDTO) => ({
    nickname: m.nickname ?? "",
    position: m.position ?? NONE,
    shirtNumber: m.shirtNumber != null ? String(m.shirtNumber) : "",
    playerStatus: m.playerStatus,
    isCaptain: m.isCaptain,
    gamesPlayed: String(m.gamesPlayed),
    goals: String(m.goals),
    assists: String(m.assists),
    yellowCards: String(m.yellowCards),
    redCards: String(m.redCards),
  });
  const [form, setForm] = useState(() => (member ? toForm(member) : null));
  useEffect(() => setForm(member ? toForm(member) : null), [member]);

  const save = useClubMutation(
    () => {
      if (!member || !form) return Promise.resolve();
      const base = {
        nickname: form.nickname,
        position: form.position === NONE ? null : form.position,
        shirtNumber: form.shirtNumber === "" ? null : Number(form.shirtNumber),
      };
      const body = staff
        ? {
            ...base,
            playerStatus: form.playerStatus,
            isCaptain: form.isCaptain,
            gamesPlayed: Number(form.gamesPlayed) || 0,
            goals: Number(form.goals) || 0,
            assists: Number(form.assists) || 0,
            yellowCards: Number(form.yellowCards) || 0,
            redCards: Number(form.redCards) || 0,
          }
        : base;
      return api.patch(clubPath(`/members/${member.id}/player`), body);
    },
    { success: "Ficha atualizada", onSuccess: () => onOpenChange(false) },
  );

  if (!member || !form) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={member.name} url={member.avatarUrl} className="h-12 w-12" />
            <div className="min-w-0 text-left">
              <DialogTitle className="truncate font-display text-2xl">{member.name}</DialogTitle>
              <DialogDescription>{ROLE_LABELS[member.role]}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Field label="Apelido" htmlFor="pl-nick" hint="Como é chamado no campo">
              <Input id="pl-nick" value={form.nickname} onChange={set("nickname")} />
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
          <Field label="Posição">
            <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Não definida</SelectItem>
                {PLAYER_POSITIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {staff ? (
            <>
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Situação">
                  <Select value={form.playerStatus} onValueChange={(v) => setForm({ ...form, playerStatus: v })}>
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
                <div className="flex h-10 items-center gap-3">
                  <Switch
                    id="pl-captain"
                    checked={form.isCaptain}
                    onCheckedChange={(isCaptain) => setForm({ ...form, isCaptain })}
                  />
                  <Label htmlFor="pl-captain">Capitão</Label>
                </div>
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
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar ficha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
