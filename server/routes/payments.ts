/**
 * Pagamento online das mensalidades pelo Mercado Pago.
 * Cada clube conecta a própria conta (o dinheiro cai direto para o clube).
 * A baixa é automática: pelo aviso do Mercado Pago (webhook) ou quando o app
 * consulta o status enquanto o associado está na tela de pagamento.
 */
import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { clubs, dues, type Club, type Due } from "@shared/schema";
import { connectMercadoPagoSchema } from "@shared/validation";
import type { PixCharge } from "@shared/api";
import { can } from "@shared/roles";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { decrypt, encrypt } from "../lib/crypto";
import { badRequest, forbidden, idParam, notFound, parse } from "../lib/http";
import { toDueDTO } from "../lib/dto";
import { fmtMonthLabel } from "../lib/months";
import {
  createCheckoutPreference,
  createPixPayment,
  findDuePayments,
  getPayment,
  methodFromPayment,
  mpAccountLabel,
  parseDueReference,
  type MpPayment,
} from "../lib/mercadopago";
import { env } from "../env";
import { toMyClub } from "./clubs";

export const paymentsRouter = Router({ mergeParams: true });

const PIX_MINUTES = 30;

function clubToken(club: Club): string {
  const token = club.mpAccessTokenEnc ? decrypt(club.mpAccessTokenEnc) : null;
  if (!token) throw badRequest("Este clube ainda não recebe pagamentos online. Pague pela chave PIX ou fale com a diretoria.");
  return token;
}

/** O webhook só funciona com endereço público (não em localhost) */
function notificationUrl(clubId: number): string | null {
  return env.publicUrl.startsWith("https://") ? `${env.publicUrl}/api/webhooks/mercadopago/${clubId}` : null;
}

async function markPaidFromPayment(clubId: number, payment: MpPayment): Promise<boolean> {
  if (payment.status !== "approved") return false;
  const dueId = parseDueReference(payment.external_reference);
  if (!dueId) return false;
  const [updated] = await db
    .update(dues)
    .set({
      paidAt: new Date(),
      method: methodFromPayment(payment),
      mpPaymentId: String(payment.id),
      notes: `Pago pelo Mercado Pago (nº ${payment.id})`,
      pixQrCode: null,
      pixQrBase64: null,
      pixExpiresAt: null,
    })
    .where(and(eq(dues.id, dueId), eq(dues.clubId, clubId)))
    .returning({ id: dues.id, paidAt: dues.paidAt });
  return !!updated;
}

/** Busca a mensalidade e confere quem pode pagá-la: o próprio associado ou a diretoria */
async function payableDue(req: Parameters<typeof clubCtx>[0]): Promise<Due> {
  const { club, role } = clubCtx(req);
  const user = currentUser(req);
  const [due] = await db
    .select()
    .from(dues)
    .where(and(eq(dues.id, idParam(req.params.dueId, "Mensalidade")), eq(dues.clubId, club.id)));
  if (!due) throw notFound("Mensalidade não encontrada");
  if (due.userId !== user.id && !can(role, "finance.manage")) throw forbidden();
  return due;
}

// ---------- Conexão da conta do clube (presidente) ----------

paymentsRouter.put("/payments/mercadopago", requireCapability("club.edit"), async (req, res) => {
  const { club, role } = clubCtx(req);
  const { accessToken } = parse(connectMercadoPagoSchema, req.body);
  const label = await mpAccountLabel(accessToken);
  const [updated] = await db
    .update(clubs)
    .set({ mpAccessTokenEnc: encrypt(accessToken), mpAccountLabel: label })
    .where(eq(clubs.id, club.id))
    .returning();
  res.json(toMyClub(updated, role, 0));
});

paymentsRouter.delete("/payments/mercadopago", requireCapability("club.edit"), async (req, res) => {
  const { club, role } = clubCtx(req);
  const [updated] = await db
    .update(clubs)
    .set({ mpAccessTokenEnc: null, mpAccountLabel: null })
    .where(eq(clubs.id, club.id))
    .returning();
  res.json(toMyClub(updated, role, 0));
});

// ---------- Pagar uma mensalidade ----------

/** Gera (ou reaproveita) o PIX da mensalidade */
paymentsRouter.post("/dues/:dueId/pix", async (req, res) => {
  const { club } = clubCtx(req);
  const user = currentUser(req);
  const due = await payableDue(req);
  if (due.paidAt) throw badRequest("Esta mensalidade já está paga");
  const token = clubToken(club);

  const stillValid = due.pixQrCode && due.pixQrBase64 && due.pixExpiresAt && due.pixExpiresAt.getTime() - Date.now() > 2 * 60 * 1000;
  if (!stillValid) {
    const expiresAt = new Date(Date.now() + PIX_MINUTES * 60 * 1000);
    const payment = await createPixPayment(token, {
      dueId: due.id,
      amountCents: due.amount,
      description: `Mensalidade ${fmtMonthLabel(due.referenceMonth)} – ${club.name}`,
      payerEmail: user.email,
      notificationUrl: notificationUrl(club.id),
      expiresAt,
    });
    const data = payment.point_of_interaction?.transaction_data;
    if (!data?.qr_code || !data.qr_code_base64) {
      throw badRequest("O Mercado Pago não gerou o PIX. Confira se a conta do clube tem uma chave PIX cadastrada.");
    }
    const [updated] = await db
      .update(dues)
      .set({
        mpPaymentId: String(payment.id),
        pixQrCode: data.qr_code,
        pixQrBase64: data.qr_code_base64,
        pixExpiresAt: payment.date_of_expiration ? new Date(payment.date_of_expiration) : expiresAt,
      })
      .where(eq(dues.id, due.id))
      .returning();
    Object.assign(due, updated);
  }

  const charge: PixCharge = {
    dueId: due.id,
    qrCode: due.pixQrCode!,
    qrCodeBase64: due.pixQrBase64!,
    expiresAt: due.pixExpiresAt?.toISOString() ?? null,
    amount: due.amount,
  };
  res.json(charge);
});

/** Link do Checkout Pro do Mercado Pago (cartão de crédito/débito e outras formas) */
paymentsRouter.post("/dues/:dueId/checkout", async (req, res) => {
  const { club } = clubCtx(req);
  const user = currentUser(req);
  const due = await payableDue(req);
  if (due.paidAt) throw badRequest("Esta mensalidade já está paga");
  const preference = await createCheckoutPreference(clubToken(club), {
    dueId: due.id,
    amountCents: due.amount,
    title: `Mensalidade ${fmtMonthLabel(due.referenceMonth)} – ${club.name}`,
    payerEmail: user.email,
    notificationUrl: notificationUrl(club.id),
    backUrl: `${env.publicUrl}/mensalidades`,
  });
  res.json({ url: preference.init_point });
});

/** Consulta o Mercado Pago e dá baixa se o pagamento já foi aprovado */
paymentsRouter.post("/dues/:dueId/refresh", async (req, res) => {
  const { club } = clubCtx(req);
  const due = await payableDue(req);
  if (!due.paidAt && club.mpAccessTokenEnc) {
    const payments = await findDuePayments(clubToken(club), due.id);
    const approved = payments.find((p) => p.status === "approved");
    if (approved) await markPaidFromPayment(club.id, approved);
  }
  const [fresh] = await db.select().from(dues).where(eq(dues.id, due.id));
  res.json(toDueDTO(fresh, currentUser(req).name));
});

// ---------- Aviso automático do Mercado Pago (público) ----------

export const webhookRouter = Router();

webhookRouter.post("/webhooks/mercadopago/:clubId", async (req, res) => {
  // Responde rápido: o Mercado Pago reenvia se não receber 200
  res.sendStatus(200);
  try {
    const clubId = Number(req.params.clubId);
    const body = (req.body ?? {}) as { type?: string; action?: string; data?: { id?: string | number } };
    const type = body.type ?? (req.query.type as string | undefined) ?? (req.query.topic as string | undefined);
    const paymentId = body.data?.id ?? (req.query["data.id"] as string | undefined) ?? (req.query.id as string | undefined);
    if (type !== "payment" || !paymentId || !Number.isInteger(clubId)) return;

    const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId));
    const token = club?.mpAccessTokenEnc ? decrypt(club.mpAccessTokenEnc) : null;
    if (!token) return;
    // Nunca confiamos no corpo do aviso: o pagamento é consultado direto no Mercado Pago
    const payment = await getPayment(token, paymentId);
    await markPaidFromPayment(clubId, payment);
  } catch (err) {
    console.error("[webhook mercadopago]", err);
  }
});
