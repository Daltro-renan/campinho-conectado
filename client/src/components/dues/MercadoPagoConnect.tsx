import { useState, type FormEvent } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle } from "@/components/PageHeader";
import { ConfirmAction } from "@/components/ConfirmAction";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";

/** O presidente conecta a conta Mercado Pago do clube para receber as mensalidades online */
export function MercadoPagoConnect() {
  const { club, clubPath } = useActiveClub();
  const [token, setToken] = useState("");

  const connect = useClubMutation(() => api.put(clubPath("/payments/mercadopago"), { accessToken: token }), {
    success: "Conta Mercado Pago conectada. Os associados já podem pagar pelo app.",
    refreshClubs: true,
    onSuccess: () => setToken(""),
  });
  const disconnect = useClubMutation(() => api.delete(clubPath("/payments/mercadopago")), {
    success: "Conta Mercado Pago desconectada",
    refreshClubs: true,
  });

  return (
    <>
      <SectionTitle>Pagamento online</SectionTitle>
      <section className="space-y-4 rounded-lg border bg-card p-5">
        {club.onlinePayments ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-ok" aria-hidden />
              <span>
                Recebendo pelo Mercado Pago
                {club.mpAccountLabel ? <span className="block text-sm text-muted-foreground">{club.mpAccountLabel}</span> : null}
              </span>
            </p>
            <ConfirmAction
              trigger={<Button variant="outline">Desconectar</Button>}
              title="Desconectar o Mercado Pago?"
              description="Os associados deixam de pagar pelo app. As mensalidades já pagas continuam registradas."
              confirmLabel="Desconectar"
              onConfirm={() => disconnect.mutate(undefined)}
            />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Conecte a conta Mercado Pago do clube para os associados pagarem a mensalidade com PIX ou cartão pelo app. O
              dinheiro cai direto na conta do clube e a baixa é automática.
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                Entre em{" "}
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                >
                  Suas integrações <ExternalLink className="h-3 w-3" aria-hidden />
                </a>{" "}
                com a conta do clube e crie uma aplicação (pagamentos online, Checkout Transparente).
              </li>
              <li>
                Abra <strong>Credenciais de produção</strong> e copie o <strong>Access Token</strong> (começa com APP_USR-).
              </li>
              <li>Cole abaixo. Ele fica guardado criptografado e nunca aparece no app.</li>
            </ol>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                connect.mutate(undefined);
              }}
            >
              <Field label="Access Token" htmlFor="mp-token" className="flex-1">
                <Input
                  id="mp-token"
                  type="password"
                  autoComplete="off"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  placeholder="APP_USR-…"
                />
              </Field>
              <Button type="submit" disabled={!token || connect.isPending}>
                {connect.isPending ? "Conectando…" : "Conectar conta"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Para receber por PIX, a conta precisa ter uma chave PIX cadastrada no Mercado Pago.
            </p>
          </>
        )}
      </section>
    </>
  );
}
