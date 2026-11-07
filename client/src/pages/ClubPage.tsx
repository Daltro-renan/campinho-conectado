import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, LogOut, RefreshCw, Share2, Trash2, UserMinus } from "lucide-react";
import type { MemberDTO, MyClub } from "@shared/api";
import { ROLE_LABELS, assignableRoles, canManageMember, type Role } from "@shared/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { LoadingRows } from "@/components/EmptyState";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Field } from "@/components/Field";
import { ColorField } from "@/components/ColorField";
import { CrestEditor } from "@/components/CrestEditor";
import type { CrestShape } from "@shared/validation";
import { TeamCrest } from "@/components/TeamCrest";
import { UserAvatar } from "@/components/UserAvatar";
import { MercadoPagoConnect } from "@/components/dues/MercadoPagoConnect";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useAuth } from "@/lib/auth";
import { useClubMutation } from "@/lib/mutation";
import { centsToInput, money, parseMoney } from "@/lib/format";

export default function ClubPage() {
  const { club, role, can } = useActiveClub();

  return (
    <div>
      <PageHeader title="Clube" description="Dados do clube, convites e associados." />
      {can("club.edit") ? <ClubForm /> : <ClubSummary club={club} />}
      {can("club.edit") ? <MercadoPagoConnect /> : null}
      {can("members.manage") && club.inviteCode ? <InviteSection club={club} /> : null}
      <MembersSection />
      <DangerZone isPresident={role === "presidente"} />
    </div>
  );
}

function ClubSummary({ club }: { club: MyClub }) {
  return (
    <section className="flex items-center gap-4 rounded-lg border bg-card p-5">
      <TeamCrest abbreviation={club.abbreviation} colorPrimary={club.colorPrimary} colorSecondary={club.colorSecondary} logoUrl={club.logoUrl} shape={club.crestShape} size={56} />
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold">{club.name}</p>
        <p className="text-sm text-muted-foreground">
          {[club.city, club.state].filter(Boolean).join(" – ")}
          {club.foundedYear ? `, fundado em ${club.foundedYear}` : ""}
        </p>
        {club.monthlyFee > 0 ? (
          <p className="mt-1 text-sm">
            Mensalidade de {money(club.monthlyFee)}, vence todo dia {club.dueDay}
          </p>
        ) : null}
        {club.description ? <p className="mt-2 text-sm text-muted-foreground">{club.description}</p> : null}
      </div>
    </section>
  );
}

function ClubForm() {
  const { club, clubPath } = useActiveClub();
  const toForm = (c: MyClub) => ({
    name: c.name,
    abbreviation: c.abbreviation,
    city: c.city ?? "",
    state: c.state ?? "",
    foundedYear: c.foundedYear ? String(c.foundedYear) : "",
    description: c.description ?? "",
    colorPrimary: c.colorPrimary,
    colorSecondary: c.colorSecondary,
    monthlyFee: c.monthlyFee > 0 ? centsToInput(c.monthlyFee) : "",
    logoUrl: c.logoUrl ?? null,
    crestShape: (c.crestShape as CrestShape) ?? "classico",
    dueDay: String(c.dueDay),
    pixKey: c.pixKey ?? "",
  });
  const [form, setForm] = useState(() => toForm(club));
  useEffect(() => setForm(toForm(club)), [club]);

  const save = useClubMutation(
    () =>
      api.patch(clubPath(), {
        ...form,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
        monthlyFee: form.monthlyFee ? parseMoney(form.monthlyFee) : 0,
        dueDay: Number(form.dueDay) || 10,
      }),
    { success: "Dados do clube salvos", refreshClubs: true },
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-5"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate(undefined);
      }}
    >
      <CrestEditor
        abbreviation={form.abbreviation}
        colorPrimary={form.colorPrimary}
        colorSecondary={form.colorSecondary}
        logoUrl={form.logoUrl}
        shape={form.crestShape}
        onChange={(next) => setForm({ ...form, ...next })}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <Field label="Nome" htmlFor="c-name">
          <Input id="c-name" value={form.name} onChange={set("name")} required />
        </Field>
        <Field label="Sigla" htmlFor="c-abbr">
          <Input
            id="c-abbr"
            value={form.abbreviation}
            maxLength={4}
            onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })}
            required
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Cor principal" value={form.colorPrimary} onChange={(v) => setForm({ ...form, colorPrimary: v })} />
        <ColorField label="Cor secundária" value={form.colorSecondary} onChange={(v) => setForm({ ...form, colorSecondary: v })} />
      </div>
      <div className="grid grid-cols-[1fr_4.5rem_6rem] gap-3">
        <Field label="Cidade" htmlFor="c-city">
          <Input id="c-city" value={form.city} onChange={set("city")} />
        </Field>
        <Field label="UF" htmlFor="c-uf">
          <Input id="c-uf" maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Fundação" htmlFor="c-year">
          <Input id="c-year" inputMode="numeric" maxLength={4} value={form.foundedYear} onChange={set("foundedYear")} placeholder="2018" />
        </Field>
      </div>
      <Field label="Sobre o clube" htmlFor="c-desc">
        <Textarea id="c-desc" rows={2} value={form.description} onChange={set("description")} />
      </Field>

      <fieldset className="space-y-3 border-t pt-4">
        <legend className="sr-only">Mensalidade</legend>
        <p className="font-display text-lg font-semibold">Mensalidade</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" htmlFor="c-fee" hint="Deixe vazio se não cobra">
            <Input id="c-fee" inputMode="decimal" value={form.monthlyFee} onChange={set("monthlyFee")} placeholder="50,00" />
          </Field>
          <Field label="Dia do vencimento" htmlFor="c-due" hint="De 1 a 28">
            <Input id="c-due" type="number" min={1} max={28} value={form.dueDay} onChange={set("dueDay")} />
          </Field>
        </div>
        <Field label="Chave PIX" htmlFor="c-pix" hint="Aparece para os associados na tela de mensalidades">
          <Input id="c-pix" value={form.pixKey} onChange={set("pixKey")} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
        </Field>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar dados do clube"}
        </Button>
      </div>
    </form>
  );
}

function InviteSection({ club }: { club: MyClub }) {
  const { clubPath } = useActiveClub();
  const code = club.inviteCode!;
  const message = `Entre no ${club.name} no Campinho Conectado: crie sua conta em ${window.location.origin} e use o código ${code}.`;

  const rotate = useClubMutation(() => api.post(clubPath("/invite-code")), {
    success: "Novo código gerado. O anterior não funciona mais.",
    refreshClubs: true,
  });

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: club.name, text: message });
        return;
      } catch {
        /* usuário cancelou */
      }
    }
    await navigator.clipboard.writeText(message);
    toast.success("Convite copiado. Cole no WhatsApp do clube.");
  };

  return (
    <>
      <SectionTitle>Convidar associados</SectionTitle>
      <section className="rounded-lg border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Quem entrar com este código começa como jogador. Depois você pode mudar o cargo.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="scoreline select-all rounded-md bg-muted px-4 py-2 text-4xl tracking-[0.18em]">{code}</span>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={share}>
              <Share2 className="mr-1.5 h-4 w-4" /> Enviar convite
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(code).then(() => toast.success("Código copiado"))}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copiar código
            </Button>
            <ConfirmAction
              trigger={
                <Button size="sm" variant="ghost">
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Gerar novo
                </Button>
              }
              title="Gerar um novo código?"
              description="O código atual deixa de funcionar. Quem já entrou continua no clube."
              confirmLabel="Gerar novo código"
              onConfirm={() => rotate.mutate(undefined)}
            />
          </div>
        </div>
      </section>
    </>
  );
}

function MembersSection() {
  const { clubPath, key, role, can } = useActiveClub();
  const { user } = useAuth();
  const membershipUserId = user?.id;
  const { data: members, isLoading } = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
  });

  const update = useClubMutation(
    (vars: { member: MemberDTO; role?: Role; feeExempt?: boolean }) =>
      api.patch(clubPath(`/members/${vars.member.id}`), { role: vars.role, feeExempt: vars.feeExempt }),
    { success: "Associado atualizado", refreshClubs: true },
  );
  const remove = useClubMutation((m: MemberDTO) => api.delete(clubPath(`/members/${m.id}`)), {
    success: "Associado removido do clube",
    refreshClubs: true,
  });

  const options = assignableRoles(role);

  return (
    <>
      <SectionTitle>
        Associados{members ? <span className="ml-2 text-base font-normal text-muted-foreground">{members.length}</span> : null}
      </SectionTitle>
      {isLoading || !members ? (
        <LoadingRows />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {members.map((m) => {
            const isMe = m.userId === membershipUserId;
            const manageable = !isMe && canManageMember(role, m.role);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <UserAvatar name={m.name} url={m.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {m.name}
                    {isMe ? <span className="font-normal text-muted-foreground"> (você)</span> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.email || ROLE_LABELS[m.role]}
                    {m.phone ? `, ${m.phone}` : ""}
                  </span>
                </span>

                {can("finance.manage") ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={m.feeExempt}
                      onCheckedChange={(feeExempt) => update.mutate({ member: m, feeExempt })}
                      aria-label={`${m.name} isento de mensalidade`}
                    />
                    Isento
                  </label>
                ) : null}

                {manageable && options.length > 0 ? (
                  <Select value={m.role} onValueChange={(v) => update.mutate({ member: m, role: v as Role })}>
                    <SelectTrigger className="h-9 w-36" aria-label={`Cargo de ${m.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="w-36 text-right text-sm font-medium">{ROLE_LABELS[m.role]}</span>
                )}

                {manageable ? (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Remover ${m.name}`}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    }
                    title={`Remover ${m.name} do clube?`}
                    description="A pessoa perde o acesso ao clube. As mensalidades dela também serão apagadas."
                    confirmLabel="Remover associado"
                    onConfirm={() => remove.mutate(m)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function DangerZone({ isPresident }: { isPresident: boolean }) {
  const { club, clubPath, selectClub, clubs } = useActiveClub();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const afterExit = () => {
    const next = clubs.find((c) => c.id !== club.id);
    queryClient.setQueryData<MyClub[]>(["clubs"], (list = []) => list.filter((c) => c.id !== club.id));
    if (next) selectClub(next.id);
    navigate(next ? "/" : "/comecar");
  };

  const leave = useClubMutation(() => api.post(clubPath("/leave")), {
    success: `Você saiu do ${club.name}`,
    onSuccess: afterExit,
  });
  const destroy = useClubMutation(() => api.delete(clubPath()), {
    success: "Clube excluído",
    onSuccess: afterExit,
  });

  return (
    <>
      <SectionTitle>Zona de risco</SectionTitle>
      <section className="space-y-3 rounded-lg border border-destructive/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Sair do clube</p>
            <p className="text-sm text-muted-foreground">
              {isPresident ? "Passe a presidência para outro associado antes de sair." : "Você pode voltar com um novo convite."}
            </p>
          </div>
          <ConfirmAction
            trigger={
              <Button variant="outline">
                <LogOut className="mr-2 h-4 w-4" /> Sair do clube
              </Button>
            }
            title={`Sair do ${club.name}?`}
            description="Você deixa de ver jogos, chat e mensalidades deste clube."
            confirmLabel="Sair do clube"
            onConfirm={() => leave.mutate(undefined)}
          />
        </div>
        {isPresident ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div>
              <p className="font-medium">Excluir clube</p>
              <p className="text-sm text-muted-foreground">Apaga times, jogos, mensalidades e mensagens. Não tem volta.</p>
            </div>
            <ConfirmAction
              trigger={
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir clube
                </Button>
              }
              title={`Excluir ${club.name} para sempre?`}
              description="Todos os dados do clube serão apagados para todos os associados."
              confirmLabel="Excluir clube"
              onConfirm={() => destroy.mutate(undefined)}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}
