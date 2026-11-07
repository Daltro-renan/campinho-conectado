import { useEffect, useState, type FormEvent } from "react";
import type { MemberDTO, TeamDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/Field";
import { TeamCrest } from "@/components/TeamCrest";
import { ColorField } from "@/components/ColorField";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";

const NO_COACH = "nenhum";
const CATEGORIES = ["Principal", "Aspirantes", "Veteranos", "Sub-20", "Sub-17", "Sub-15", "Sub-13", "Feminino"];

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: TeamDTO | null;
  members: MemberDTO[];
}) {
  const { club, clubPath } = useActiveClub();
  const blank = () => ({
    name: team?.name ?? "",
    abbreviation: team?.abbreviation ?? club.abbreviation,
    category: team?.category ?? "Principal",
    colorPrimary: team?.colorPrimary ?? club.colorPrimary,
    colorSecondary: team?.colorSecondary ?? club.colorSecondary,
    description: team?.description ?? "",
    coachUserId: team?.coachUserId ? String(team.coachUserId) : NO_COACH,
  });
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, team]);

  const save = useClubMutation(
    () => {
      const body = { ...form, coachUserId: form.coachUserId === NO_COACH ? null : Number(form.coachUserId) };
      return team ? api.patch(clubPath(`/teams/${team.id}`), body) : api.post(clubPath("/teams"), body);
    },
    { success: team ? "Time atualizado" : "Time cadastrado", onSuccess: () => onOpenChange(false) },
  );

  const coaches = members.filter((m) => m.role !== "jogador");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{team ? "Editar time" : "Novo time"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="flex items-center gap-4 rounded-lg bg-muted p-3">
            <TeamCrest
              abbreviation={form.abbreviation || "?"}
              colorPrimary={form.colorPrimary}
              colorSecondary={form.colorSecondary}
              size={48}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">{form.name || "Nome do time"}</p>
              <p className="text-sm text-muted-foreground">{form.category}</p>
            </div>
          </div>

          <Field label="Nome" htmlFor="team-name">
            <Input
              id="team-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={`${club.name} Principal`}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sigla" htmlFor="team-abbr" hint="2 a 4 letras">
              <Input
                id="team-abbr"
                value={form.abbreviation}
                maxLength={4}
                onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })}
                required
              />
            </Field>
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...CATEGORIES, form.category])].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Cor principal" value={form.colorPrimary} onChange={(v) => setForm({ ...form, colorPrimary: v })} />
            <ColorField label="Cor secundária" value={form.colorSecondary} onChange={(v) => setForm({ ...form, colorSecondary: v })} />
          </div>

          <Field label="Técnico" hint="Só aparecem associados com cargo de técnico, diretoria ou presidente">
            <Select value={form.coachUserId} onValueChange={(v) => setForm({ ...form, coachUserId: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COACH}>Sem técnico definido</SelectItem>
                {coaches.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Descrição" htmlFor="team-desc">
            <Textarea
              id="team-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : team ? "Salvar time" : "Cadastrar time"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
