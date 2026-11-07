import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Copy, CreditCard, QrCode } from "lucide-react";
import type { DueDTO, PixCharge } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { fmtMonth, money } from "@/lib/format";

type Step = "escolha" | "pix" | "pago";

/**
 * Pagamento de uma mensalidade pelo Mercado Pago do clube:
 * PIX (QR Code / copia e cola) ou página do Mercado Pago (cartão).
 * Enquanto o PIX está na tela, o app confere o pagamento a cada 5 segundos.
 */
export function PayDueDialog({ due, onOpenChange }: { due: DueDTO | null; onOpenChange: (open: boolean) => void }) {
  const { clubPath, key } = useActiveClub();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("escolha");
  const [pix, setPix] = useState<PixCharge | null>(null);
  const [loading, setLoading] = useState<"pix" | "cartao" | null>(null);

  useEffect(() => {
    if (due) {
      setStep("escolha");
      setPix(null);
    }
  }, [due]);

  // Confere o pagamento enquanto o QR Code está aberto
  useEffect(() => {
    if (!due || step !== "pix") return;
    const timer = setInterval(async () => {
      try {
        const fresh = await api.post<DueDTO>(clubPath(`/dues/${due.id}/refresh`));
        if (fresh.status === "pago") {
          setStep("pago");
          queryClient.invalidateQueries({ queryKey: key() });
        }
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [due, step, clubPath, key, queryClient]);

  if (!due) return null;

  const startPix = async () => {
    setLoading("pix");
    try {
      setPix(await api.post<PixCharge>(clubPath(`/dues/${due.id}/pix`)));
      setStep("pix");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const startCheckout = async () => {
    setLoading("cartao");
    try {
      const { url } = await api.post<{ url: string }>(clubPath(`/dues/${due.id}/checkout`));
      window.open(url, "_blank", "noopener");
      toast.info("Conclua o pagamento na página do Mercado Pago. A baixa é automática.");
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const copy = () =>
    navigator.clipboard.writeText(pix!.qrCode).then(
      () => toast.success("Código PIX copiado. Cole no app do seu banco."),
      () => toast.error("Não foi possível copiar. Segure o código e copie manualmente."),
    );

  return (
    <Dialog open={!!due} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {step === "pago" ? "Pagamento confirmado" : `Mensalidade de ${fmtMonth(due.referenceMonth).split(" ")[0].toLowerCase()}`}
          </DialogTitle>
          {step !== "pago" ? (
            <DialogDescription>
              Valor: <strong className="text-foreground">{money(due.amount)}</strong>. O dinheiro vai direto para a conta do clube.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {step === "escolha" ? (
          <div className="grid gap-3">
            <Button size="lg" className="h-14 justify-start gap-3 text-base" disabled={!!loading} onClick={startPix}>
              <QrCode className="h-5 w-5" />
              {loading === "pix" ? "Gerando PIX…" : "Pagar com PIX"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              disabled={!!loading}
              onClick={startCheckout}
            >
              <CreditCard className="h-5 w-5" />
              {loading === "cartao" ? "Abrindo…" : "Cartão ou outras formas"}
            </Button>
            <p className="text-xs text-muted-foreground">Pagamentos processados pelo Mercado Pago.</p>
          </div>
        ) : null}

        {step === "pix" && pix ? (
          <div className="space-y-4">
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code do PIX"
              className="mx-auto aspect-square w-56 rounded-lg bg-white p-2"
            />
            <div>
              <p className="mb-1 text-sm font-medium">PIX copia e cola</p>
              <div className="flex gap-2">
                <code className="block min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{pix.qrCode}</code>
                <Button size="sm" onClick={copy}>
                  <Copy className="mr-1.5 h-4 w-4" /> Copiar
                </Button>
              </div>
            </div>
            <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm" aria-live="polite">
              <span className="h-2 w-2 animate-pulse rounded-full bg-warn" aria-hidden />
              Aguardando o pagamento. Pode deixar esta tela aberta, a confirmação aparece sozinha.
            </p>
          </div>
        ) : null}

        {step === "pago" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 className="h-14 w-14 text-ok" aria-hidden />
            <p className="mt-3 font-display text-2xl font-semibold">Mensalidade paga</p>
            <p className="mt-1 text-sm text-muted-foreground">Obrigado! A baixa já foi registrada no clube.</p>
            <Button className="mt-5" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
