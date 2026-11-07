import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/Field";
import { GoogleButton } from "@/components/GoogleButton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuthResponse } from "@shared/api";
import { cn } from "@/lib/utils";

type Mode = "entrar" | "cadastrar";

export default function AuthPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("entrar");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      mode === "entrar"
        ? api.post<AuthResponse>("/auth/login", { email: form.email, password: form.password })
        : api.post<AuthResponse>("/auth/register", form),
    onSuccess: (res) => {
      // Depois do login a URL volta para o início
      window.history.replaceState(null, "", "/");
      signIn(res);
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      {/* Faixa do gramado com a marca */}
      <section className="pitch-stripes relative flex flex-col justify-between overflow-hidden px-6 py-8 text-pitch-foreground md:px-12 md:py-12">
        <p className="font-display text-lg font-semibold opacity-80">Campinho Conectado</p>
        <div className="my-10 md:my-0">
          <h1 className="font-display text-5xl font-bold leading-[0.95] md:text-7xl">
            Seu clube
            <br />
            em campo,
            <br />
            sem planilha.
          </h1>
          <p className="mt-5 max-w-sm text-base text-pitch-foreground/80">
            Jogos, elenco, mensalidades e o chat da diretoria num lugar só, para associações de
            futebol amador.
          </p>
        </div>
        <p className="hidden text-sm text-pitch-foreground/60 md:block">
          Feito para a várzea, o society e o campeonato do bairro.
        </p>
        {/* Grande área desenhada no canto, como a marcação do campo */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -bottom-px right-0 h-40 w-64 text-pitch-line md:h-56 md:w-96"
          viewBox="0 0 300 160"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M0 160V40h300" />
          <path d="M80 160V100h140v60" />
          <path d="M110 40a40 40 0 0 0 80 0" />
        </svg>
      </section>

      <section className="flex items-start justify-center px-6 py-10 md:items-center md:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist">
            {(["entrar", "cadastrar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={cn(
                  "rounded-md py-2 text-sm font-semibold transition-colors",
                  mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {m === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <GoogleButton />

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "cadastrar" ? (
              <Field label="Nome" htmlFor="name">
                <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} required />
              </Field>
            ) : null}
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                required
              />
            </Field>
            <Field
              label="Senha"
              htmlFor="password"
              hint={mode === "cadastrar" ? "Pelo menos 8 caracteres" : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                value={form.password}
                onChange={set("password")}
                required
              />
            </Field>

            {error ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "entrar" ? "Ainda não tem conta? " : "Já tem conta? "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "entrar" ? "cadastrar" : "entrar");
                setError(null);
              }}
            >
              {mode === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
