/**
 * Caixa do clube: todos os associados veem; a diretoria (finance.manage) lança.
 * Mensalidades pagas entram sozinhas, agrupadas por mês, sem expor quem pagou.
 */
import { Router } from "express";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../db";
import { cashEntries, clubs, dues, users } from "@shared/schema";
import { cashEntrySchema, cashOpeningSchema } from "@shared/validation";
import type { CashEntryDTO, CashReport } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { idParam, notFound, parse } from "../lib/http";
import { currentMonth } from "../lib/dto";

export const cashRouter = Router({ mergeParams: true });

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Data (AAAA-MM-DD) no fuso de Brasília */
const dayOf = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

const lastDayOf = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

cashRouter.get("/cash", async (req, res) => {
  const { club } = clubCtx(req);
  const month = typeof req.query.month === "string" && monthRegex.test(req.query.month) ? req.query.month : currentMonth();

  const manual = await db
    .select({ entry: cashEntries, createdByName: users.name })
    .from(cashEntries)
    .leftJoin(users, eq(users.id, cashEntries.createdBy))
    .where(eq(cashEntries.clubId, club.id));

  const paid = await db
    .select({ amount: dues.amount, paidAt: dues.paidAt })
    .from(dues)
    .where(and(eq(dues.clubId, club.id), isNotNull(dues.paidAt), isNull(dues.canceledAt)));

  // Mensalidades recebidas por mês de pagamento
  const duesByMonth = new Map<string, { amount: number; count: number; last: string }>();
  for (const p of paid) {
    const day = dayOf(p.paidAt!);
    const m = day.slice(0, 7);
    const cur = duesByMonth.get(m) ?? { amount: 0, count: 0, last: day };
    cur.amount += p.amount;
    cur.count += 1;
    if (day > cur.last) cur.last = day;
    duesByMonth.set(m, cur);
  }

  const all: CashEntryDTO[] = [
    ...manual.map(({ entry: e, createdByName }) => ({
      id: e.id,
      source: "lancamento" as const,
      type: e.type === "saida" ? ("saida" as const) : ("entrada" as const),
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: e.date,
      createdByName,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt?.toISOString() ?? null,
    })),
    ...[...duesByMonth.entries()].map(([m, v]) => ({
      id: null,
      source: "mensalidades" as const,
      type: "entrada" as const,
      amount: v.amount,
      category: "Mensalidades",
      description: `${v.count} mensalidade${v.count === 1 ? "" : "s"} paga${v.count === 1 ? "" : "s"} no mês`,
      date: m === month || m === currentMonth() ? v.last : lastDayOf(m),
      createdByName: null,
      createdAt: null,
      updatedAt: null,
    })),
  ];

  const signed = (e: CashEntryDTO) => (e.type === "entrada" ? e.amount : -e.amount);
  const balance = club.cashOpening + all.reduce((s, e) => s + signed(e), 0);
  const end = lastDayOf(month);
  const monthEndBalance = club.cashOpening + all.filter((e) => e.date <= end).reduce((s, e) => s + signed(e), 0);
  const inMonth = all
    .filter((e) => e.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0));

  const cats = new Map<string, { type: "entrada" | "saida"; category: string; amount: number }>();
  for (const e of inMonth) {
    const k = `${e.type}:${e.category}`;
    const cur = cats.get(k) ?? { type: e.type, category: e.category, amount: 0 };
    cur.amount += e.amount;
    cats.set(k, cur);
  }

  const report: CashReport = {
    month,
    balance,
    opening: club.cashOpening,
    monthIn: inMonth.filter((e) => e.type === "entrada").reduce((s, e) => s + e.amount, 0),
    monthOut: inMonth.filter((e) => e.type === "saida").reduce((s, e) => s + e.amount, 0),
    monthEndBalance,
    byCategory: [...cats.values()].sort((a, b) => b.amount - a.amount),
    entries: inMonth,
  };
  res.json(report);
});

cashRouter.post("/cash", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const data = parse(cashEntrySchema, req.body);
  const [entry] = await db
    .insert(cashEntries)
    .values({ ...data, clubId: club.id, createdBy: currentUser(req).id })
    .returning();
  res.status(201).json({ id: entry.id });
});

async function findEntry(clubId: number, id: number) {
  const [entry] = await db
    .select()
    .from(cashEntries)
    .where(and(eq(cashEntries.id, id), eq(cashEntries.clubId, clubId)));
  if (!entry) throw notFound("Lançamento não encontrado");
  return entry;
}

cashRouter.put("/cash/:entryId", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const entry = await findEntry(club.id, idParam(req.params.entryId, "Lançamento"));
  const data = parse(cashEntrySchema, req.body);
  await db
    .update(cashEntries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(cashEntries.id, entry.id));
  res.json({ ok: true });
});

cashRouter.delete("/cash/:entryId", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const entry = await findEntry(club.id, idParam(req.params.entryId, "Lançamento"));
  await db.delete(cashEntries).where(eq(cashEntries.id, entry.id));
  res.json({ ok: true });
});

/** Saldo que o clube já tinha antes de usar o app */
cashRouter.put("/cash-opening", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const { amount } = parse(cashOpeningSchema, req.body);
  await db.update(clubs).set({ cashOpening: amount }).where(eq(clubs.id, club.id));
  res.json({ ok: true });
});
