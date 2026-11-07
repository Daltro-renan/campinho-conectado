import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { MemberDTO, PlayerGameDTO, RankingResponse } from "@shared/api";
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
import { AvatarPicker } from "@/components/AvatarPicker";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { capitalize, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const NONE = "nenhuma";

const OUTCOME_STYLE = { V: "bg-ok text-white", E: "bg-warn text-warn-foreground", D: "bg-danger text-white" } as const;

/**
 * Ficha do jogador: números da temporada e jogos de que participou (todos veem).
 * O próprio associado edita apelido, posição e número; a comissão técnica edita
 * também situação, capitão e números de jogos feitos fora do app.
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
  const { clubPath, key } = useActiveClub();
  const { user } = useAuth();
  const isMe = member?.userId === user?.id;
  const canEdit = staff || isMe;
  const [editOpen, setEditOpen] = useState(false);
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  useEffect(() => setEditOpen(false), [member]);

  const ranking = useQuery({
    queryKey: key("ranking", season),
    queryFn: () => api.get<RankingResponse>(clubPath(`/ranking?temporada=${season}`)),
    enabled: !!member,
  });
  const history = useQuery({
    queryKey: key("member-games", member?.id, season),
    queryFn: () => api.get<PlayerGameDTO[]>(clubPath(`/members/${member!.id}/games?temporada=${season}`)),
    enabled: !!member,
  });
  const stats = ranking.data?.entries.find((e) => e.memberId === member?.id);
  const seasons = ranking.data?.seasons ?? [new Date().getFullYear()];
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
          {isMe ? (
            <div className="space-y-3 text-left">
              <DialogTitle className="font-display text-2xl">Minha ficha</DialogTitle>
              <AvatarPicker size="md" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <UserAvatar name={member.name} url={member.avatarUrl} className="h-14 w-14 text-lg" />
              <div className="min-w-0 text-left">
                <DialogTitle className="truncate font-display text-2xl">{member.nickname || member.name}</DialogTitle>
                <DialogDescription>
                  {[member.position, member.shirtNumber != null ? `camisa ${member.shirtNumber}` : null, ROLE_LABELS[member.role]]
                    .filter(Boolean)
                    .join(", ")}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Números da temporada */}
        <section className="rounded-lg border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Números</span>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger className="h-8 w-[8.5rem] text-xs" aria-label="Temporada">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Temporada {y}
                  </SelectItem>
                ))}
                <SelectItem value="todas">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <dl className="grid grid-cols-4 divide-x py-3 text-center">
            {(
              [
                ["Jogos", stats?.games],
                ["Vitórias", stats?.wins],
                ["Gols", stats?.goals],
                ["Assist.", stats?.assists],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dd className="scoreline text-3xl">{value ?? "–"}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
          {stats && stats.games > 0 ? (
            <p className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
              {stats.wins}V {stats.draws}E {stats.losses}D,{" "}
              {Math.round(((stats.wins * 3 + stats.draws) / (stats.games * 3)) * 100)}% de aproveitamento
            </p>
          ) : null}
        </section>

        {/* Jogos de que participou */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">Jogos que participou</h3>
          {history.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (history.data?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum jogo finalizado nesta temporada.
            </p>
          ) : (
            <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border">
              {history.data!.map((g) => (
                <li key={g.gameId} className="flex items-center gap-3 px-3 py-2">
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded text-xs font-bold", OUTCOME_STYLE[g.outcome])}>
                    {g.outcome}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{g.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmtDate(g.startsAt)}
                      {g.kind === "racha" ? `, jogou no Time ${g.side}` : ""}
                      {g.goals ? `, ${g.goals} gol${g.goals > 1 ? "s" : ""}` : ""}
                      {g.assists ? `, ${g.assists} assist.` : ""}
                    </span>
                  </span>
                  <span className="scoreline text-lg">
                    {g.myScore}×{g.theirScore}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditOpen((v) => !v)}
            aria-expanded={editOpen}
            className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold hover:bg-accent/50"
          >
            {isMe ? "Editar minha ficha" : "Editar ficha"}
            <ChevronDown className={cn("h-4 w-4 transition-transform", editOpen && "rotate-180")} />
          </button>
        ) : null}

        {canEdit && editOpen ? (
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
                <legend className="mb-2 text-sm font-medium">Números de antes do app</legend>
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Somados no ranking "Todas". Jogos lançados pelo app já contam sozinhos.
                </p>
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
