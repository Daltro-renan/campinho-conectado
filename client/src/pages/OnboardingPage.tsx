import { useState, type FormEvent } from "react";
import { AppLogo } from "@/components/AppLogo";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { TeamCrest } from "@/components/TeamCrest";
import { ColorField } from "@/components/ColorField";
import { CrestEditor } from "@/components/CrestEditor";
import type { CrestShape } from "@shared/validation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useClub } from "@/lib/club";
import type { MyClub } from "@shared/api";

type Step = "escolha" | "criar" | "entrar";

/** Primeiro acesso: criar um clube (vira presidente) ou entrar com código de convite. */
export default function OnboardingPage() {
  const { user, signOut } = useAuth();
  const { clubs, selectClub } = useClub();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("escolha");
  const [code, setCode] = useState("");
  const [club, setClub] = useState({
    name: "",
    abbreviation: "",
    city: "",
    state: "",
    colorPrimary: "#0E4D2E",
    colorSecondary: "#F2C230",
    logoUrl: null as string | null,
    crestShape: "classico" as CrestShape,
  });

  const done = (created: MyClub, message: string) => {
    queryClient.setQueryData<MyClub[]>(["clubs"], (list = []) => [...list, created]);
    selectClub(created.id);
    toast.success(message);
    navigate("/");
  };

  const create = useMutation({
    mutationFn: () => api.post<MyClub>("/clubs", club),
    onSuccess: (c) => done(c, "Clube criado. Você é o presidente."),
    onError: (e: Error) => toast.error(e.message),
  });
  const join = useMutation({
    mutationFn: () => api.post<MyClub>("/clubs/join", { inviteCode: code }),
    onSuccess: (c) => done(c, `Bem-vindo ao ${c.name}!`),
    onError: (e: Error) => toast.error(e.message),
  });

  const first = user?.name.split(" ")[0] ?? "";

  return (
    <div className="min-h-screen">
      <header className="stadium stadium-dim px-6 pb-10 pt-8 text-pitch-foreground">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2.5 font-display text-lg font-semibold uppercase tracking-wide">
          <AppLogo size={36} /> Campinho Conectado
        </p>
            {clubs.length > 0 ? (
              <Button variant="ghost" size="sm" className="text-pitch-foreground hover:bg-white/10" onClick={() => navigate("/")}>
                Voltar ao app
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-pitch-foreground hover:bg-white/10" onClick={signOut}>
                Sair
              </Button>
            )}
          </div>
          <h1 className="mt-8 text-4xl font-bold md:text-5xl">
            {clubs.length > 0 ? "Outro clube" : `Bora começar, ${first}`}
          </h1>
          <p className="mt-2 text-pitch-foreground/80">
            Crie o clube da sua associação ou entre num clube que já usa o app.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-8">
        {step === "escolha" ? (
          <div className="grid gap-3">
            <ChoiceButton
              icon={Plus}
              title="Criar um clube"
              text="Você será o presidente e poderá convidar a diretoria, técnicos e jogadores."
              onClick={() => setStep("criar")}
            />
            <ChoiceButton
              icon={KeyRound}
              title="Tenho um código de convite"
              text="Peça o código para a diretoria do seu clube."
              onClick={() => setStep("entrar")}
            />
          </div>
        ) : null}

        {step === "entrar" ? (
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              join.mutate();
            }}
          >
            <BackButton onClick={() => setStep("escolha")} />
            <Field label="Código de convite" htmlFor="code" hint="São 6 letras e números, ex.: K7M2QX">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={12}
                className="font-display text-2xl tracking-[0.2em]"
                required
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={join.isPending || code.length < 4}>
              {join.isPending ? "Entrando…" : "Entrar no clube"}
            </Button>
          </form>
        ) : null}

        {step === "criar" ? (
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <BackButton onClick={() => setStep("escolha")} />
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <TeamCrest
                logoUrl={club.logoUrl}
                shape={club.crestShape}
                abbreviation={club.abbreviation || "?"}
                colorPrimary={club.colorPrimary}
                colorSecondary={club.colorSecondary}
                size={56}
              />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-semibold">{club.name || "Nome do clube"}</p>
                <p className="text-sm text-muted-foreground">
                  {[club.city, club.state].filter(Boolean).join(" – ") || "Cidade"}
                </p>
              </div>
            </div>
            <Field label="Nome do clube" htmlFor="club-name">
              <Input
                id="club-name"
                value={club.name}
                onChange={(e) => setClub({ ...club, name: e.target.value })}
                placeholder="Associação Futebol Inteligente"
                required
              />
            </Field>
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <Field label="Sigla" htmlFor="club-abbr" hint="2 a 4 letras">
                <Input
                  id="club-abbr"
                  value={club.abbreviation}
                  maxLength={4}
                  onChange={(e) => setClub({ ...club, abbreviation: e.target.value.toUpperCase() })}
                  placeholder="AFI"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Cor 1"
                  value={club.colorPrimary}
                  onChange={(v) => setClub({ ...club, colorPrimary: v })}
                />
                <ColorField
                  label="Cor 2"
                  value={club.colorSecondary}
                  onChange={(v) => setClub({ ...club, colorSecondary: v })}
                />
              </div>
            </div>
            <CrestEditor
              abbreviation={club.abbreviation}
              colorPrimary={club.colorPrimary}
              colorSecondary={club.colorSecondary}
              logoUrl={club.logoUrl}
              shape={club.crestShape}
              onChange={(next) => setClub({ ...club, ...next })}
            />
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="Cidade" htmlFor="club-city">
                <Input id="club-city" value={club.city} onChange={(e) => setClub({ ...club, city: e.target.value })} />
              </Field>
              <Field label="UF" htmlFor="club-uf">
                <Input
                  id="club-uf"
                  value={club.state}
                  maxLength={2}
                  onChange={(e) => setClub({ ...club, state: e.target.value.toUpperCase() })}
                />
              </Field>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
              {create.isPending ? "Criando…" : "Criar clube"}
            </Button>
          </form>
        ) : null}
      </main>
    </div>
  );
}

function ChoiceButton({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-4 rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary"
    >
      <span className="rounded-md bg-primary/10 p-2.5 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span>
        <span className="block font-display text-xl font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Voltar
    </button>
  );
}
