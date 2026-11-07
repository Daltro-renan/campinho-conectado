/**
 * Cliente mínimo da API do Mercado Pago, usando o Access Token de cada clube.
 * Docs: https://www.mercadopago.com.br/developers/pt/reference
 */
import crypto from "crypto";
import { badRequest, HttpError } from "./http";

const API = "https://api.mercadopago.com";

export type MpPayment = {
  id: number;
  status: string; // pending | approved | authorized | in_process | rejected | cancelled | refunded ...
  status_detail?: string;
  payment_type_id?: string; // bank_transfer (PIX) | credit_card | debit_card | ...
  payment_method_id?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
  };
};

async function mp<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(method === "POST" ? { "X-Idempotency-Key": crypto.randomUUID() } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError(502, "Não foi possível falar com o Mercado Pago. Tente novamente.");
  }
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (res.status === 401) {
    throw badRequest("O Mercado Pago recusou o token do clube. Peça ao presidente para reconectar a conta.");
  }
  if (!res.ok || !data) {
    console.error("[mercadopago]", method, path, res.status, data);
    throw new HttpError(502, `Mercado Pago: ${data?.message ?? "erro ao processar o pagamento"}`);
  }
  return data;
}

/** Confere o token e devolve um nome para mostrar ("Conta de fulano@x.com") */
export async function mpAccountLabel(accessToken: string): Promise<string> {
  const me = await mp<{ nickname?: string; email?: string; first_name?: string }>(accessToken, "GET", "/users/me");
  return me.email || me.nickname || me.first_name || "Conta conectada";
}

/** Data no formato que o Mercado Pago aceita, no fuso de Brasília */
function mpDate(date: Date): string {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().replace("Z", "-03:00");
}

export const dueReference = (dueId: number) => `due-${dueId}`;

export function parseDueReference(ref: string | null | undefined): number | null {
  const m = /^due-(\d+)$/.exec(ref ?? "");
  return m ? Number(m[1]) : null;
}

export async function createPixPayment(
  accessToken: string,
  input: { dueId: number; amountCents: number; description: string; payerEmail: string; notificationUrl: string | null; expiresAt: Date },
): Promise<MpPayment> {
  return mp<MpPayment>(accessToken, "POST", "/v1/payments", {
    transaction_amount: input.amountCents / 100,
    payment_method_id: "pix",
    description: input.description,
    external_reference: dueReference(input.dueId),
    date_of_expiration: mpDate(input.expiresAt),
    payer: { email: input.payerEmail },
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
  });
}

/** Checkout Pro: página do Mercado Pago com cartão, PIX e saldo em conta */
export async function createCheckoutPreference(
  accessToken: string,
  input: { dueId: number; amountCents: number; title: string; payerEmail: string; notificationUrl: string | null; backUrl: string },
): Promise<{ init_point: string }> {
  return mp<{ init_point: string }>(accessToken, "POST", "/checkout/preferences", {
    items: [{ title: input.title, quantity: 1, unit_price: input.amountCents / 100, currency_id: "BRL" }],
    payer: { email: input.payerEmail },
    external_reference: dueReference(input.dueId),
    back_urls: { success: input.backUrl, pending: input.backUrl, failure: input.backUrl },
    auto_return: "approved",
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
  });
}

export async function getPayment(accessToken: string, paymentId: string | number): Promise<MpPayment> {
  return mp<MpPayment>(accessToken, "GET", `/v1/payments/${paymentId}`);
}

/** Pagamentos já feitos para uma mensalidade (por PIX direto ou pelo Checkout Pro) */
export async function findDuePayments(accessToken: string, dueId: number): Promise<MpPayment[]> {
  const ref = encodeURIComponent(dueReference(dueId));
  const data = await mp<{ results: MpPayment[] }>(
    accessToken,
    "GET",
    `/v1/payments/search?external_reference=${ref}&sort=date_created&criteria=desc`,
  );
  return data.results ?? [];
}

export function methodFromPayment(p: MpPayment): "pix" | "cartao" | "transferencia" {
  if (p.payment_method_id === "pix" || p.payment_type_id === "bank_transfer") return "pix";
  if (p.payment_type_id === "credit_card" || p.payment_type_id === "debit_card") return "cartao";
  return "transferencia";
}
