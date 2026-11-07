import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, LogOut, Monitor, Moon, Sun, Trash2, Wallet } from "lucide-react";
import type { PublicUser } from "@shared/api";
import { ROLE_LABELS } from "@shared/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { Field } from "@/components/Field";
import { TeamCrest } from "@/components/TeamCrest";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClub } from "@/lib/club";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div>
      <PageHeader title="Perfil" />

      <section className="flex items-center gap-4">
        <UserAvatar name={user.name} url={user.avatarUrl} className="h-16 w-16 text-xl" />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold">{user.name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">No app desde {fmtDate(user.createdAt, "MMMM 'de' yyyy")}</p>
        </div>
      </section>

      <Link
        href="/mensalidades"
        className="mt-6 flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:border-primary"
      >
        <Wallet className="h-5 w-5 text-primary" aria-hidden />
        <span className="flex-1 font-medium">Minhas mensalidades</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Link>

      <MyClubs />
      <ProfileForm user={user} />
      <PasswordForm hasPassword={user.hasPassword} />
      <ThemePicker />

      <SectionTitle>Conta</SectionTitle>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair da conta
        </Button>
        <DeleteAccount hasPassword={user.hasPassword} email={user.email} />
      </div>
    </div>
  );
}

function MyClubs() {
  const { clubs, club, selectClub } = useClub();
  return (
    <>
      <SectionTitle
        action={
          <Link href="/comecar" className="text-sm font-medium text-primary hover:underline">
            Criar ou entrar em clube
          </Link>
        }
      >
        Meus clubes
      </SectionTitle>
      <ul className="divide-y rounded-lg border bg-card">
        {clubs.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => selectClub(c.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
            >
              <TeamCrest abbreviation={c.abbreviation} colorPrimary={c.colorPrimary} colorSecondary={c.colorSecondary} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABELS[c.role]}, {c.memberCount} associado{c.memberCount === 1 ? "" : "s"}
                </span>
              </span>
              {c.id === club?.id ? <span className="text-xs font-semibold text-primary">Atual</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" });
  useEffect(() => setForm({ name: user.name, phone: user.phone ?? "", avatarUrl: user.avatarUrl ?? "" }), [user]);

  const save = useMutation({
    mutationFn: () => api.patch<PublicUser>("/auth/me", form),
    onSuccess: (u) => {
      setUser(u);
      toast.success("Perfil atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SectionTitle>Seus dados</SectionTitle>
      <form
        className="space-y-4 rounded-lg border bg-card p-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Nome" htmlFor="p-name">
          <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Celular / WhatsApp" htmlFor="p-phone" hint="Visível só para a diretoria dos seus clubes">
          <Input
            id="p-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(75) 99999-9999"
          />
        </Field>
        <Field label="Foto (endereço da imagem)" htmlFor="p-avatar" hint="Cole o link de uma foto sua">
          <Input
            id="p-avatar"
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar perfil"}
          </Button>
        </div>
      </form>
    </>
  );
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "" });
  const change = useMutation({
    mutationFn: () => api.post("/auth/password", form),
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "" });
      if (user && !hasPassword) setUser({ ...user, hasPassword: true });
      toast.success(hasPassword ? "Senha alterada" : "Senha criada. Agora você também pode entrar com e-mail e senha.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <SectionTitle>Senha</SectionTitle>
      {!hasPassword ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Você entra com o Google. Se quiser, crie uma senha para entrar também com e-mail.
        </p>
      ) : null}
      <form
        className={cn(
          "grid gap-4 rounded-lg border bg-card p-5 sm:items-end",
          hasPassword ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]",
        )}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          change.mutate();
        }}
      >
        {hasPassword ? (
          <Field label="Senha atual" htmlFor="pw-current">
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
            />
          </Field>
        ) : null}
        <Field label="Nova senha" htmlFor="pw-new">
          <Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
          />
        </Field>
        <Button type="submit" variant="outline" disabled={change.isPending}>
          {hasPassword ? "Alterar senha" : "Criar senha"}
        </Button>
      </form>
    </>
  );
}

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Do aparelho", icon: Monitor },
];

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <SectionTitle>Aparência</SectionTitle>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={theme === t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border bg-card py-3 text-sm font-medium transition-colors",
              theme === t.value ? "border-primary ring-1 ring-primary" : "hover:bg-accent/50",
            )}
          >
            <t.icon className="h-5 w-5" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

function DeleteAccount({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const remove = useMutation({
    mutationFn: () => api.delete("/auth/me", hasPassword ? { password } : { confirmEmail: password }),
    onSuccess: () => {
      toast.success("Conta excluída");
      signOut();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Excluir conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Você sai de todos os clubes e seus dados são apagados. Clubes em que você é o único associado também
            serão excluídos. {hasPassword ? "Digite sua senha para confirmar." : `Digite seu e-mail (${email}) para confirmar.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          type={hasPassword ? "password" : "email"}
          autoComplete={hasPassword ? "current-password" : "off"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label={hasPassword ? "Sua senha" : "Seu e-mail"}
          placeholder={hasPassword ? "Sua senha" : "Seu e-mail"}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <Button variant="destructive" disabled={!password || remove.isPending} onClick={() => remove.mutate()}>
            Excluir conta
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
