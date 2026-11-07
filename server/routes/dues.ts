/** Mensalidades: cada associado vê as suas; a diretoria gera cobranças e dá baixa. */
import { Router } from "express";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { dues, memberships, users } from "@shared/schema";
import { createDueSchema, generateDuesSchema, markDuePaidSchema } from "@shared/validation";
import type { DueDTO, FinanceOverview, OverdueMemberDTO, OverdueReport } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { badRequest, idParam, notFound, parse } from "../lib/http";
import { currentMonth, summarizeDues, toDueDTO, todayISO } from "../lib/dto";
import { ensureMonthlyDues } from "../lib/auto-dues";

export const duesRouter = Router({ mergeParams: true });

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;


/** Minhas mensalidades + resumo (em dia / pendente / vencido) */
duesRouter.get("/dues/me", async (req, res) => {
  const { club } = clubCtx(req);
  await ensureMonthlyDues(club);
  const user = currentUser(req);
  const rows = await db
    .select()
    .from(dues)
    .where(and(eq(dues.clubId, club.id), eq(dues.userId, user.id)))
    .orderBy(desc(dues.referenceMonth));
  const items = rows.map((d) => toDueDTO(d, user.name));
  res.json({ summary: summarizeDues(items), items, pixKey: club.pixKey });
});

/** Cobranças do clube em um mês (diretoria) */
duesRouter.get("/dues", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const month = typeof req.query.month === "string" && monthRegex.test(req.query.month)
    ? req.query.month
    : currentMonth();
  if (month === currentMonth()) await ensureMonthlyDues(club);

  const rows = await db
    .select({ due: dues, name: users.name })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .where(and(eq(dues.clubId, club.id), eq(dues.referenceMonth, month)))
    .orderBy(asc(users.name));

  const items: DueDTO[] = rows.map((r) => toDueDTO(r.due, r.name));
  const overview: FinanceOverview = {
    referenceMonth: month,
    expected: items.reduce((s, d) => s + d.amount, 0),
    received: items.filter((d) => d.status === "pago").reduce((s, d) => s + d.amount, 0),
    paidCount: items.filter((d) => d.status === "pago").length,
    openCount: items.filter((d) => d.status !== "pago").length,
    overdueCount: items.filter((d) => d.status === "vencido").length,
  };
  res.json({ overview, items });
});

/** Gera as mensalidades de um mês específico (ex.: meses anteriores). O mês atual é automático. */
duesRouter.post("/dues/generate", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const { referenceMonth } = parse(generateDuesSchema, req.body);
  if (club.monthlyFee <= 0) {
    throw badRequest("Defina o valor da mensalidade nas configurações do clube antes de gerar cobranças.");
  }
  const created = await ensureMonthlyDues(club, referenceMonth);
  res.status(201).json({ created });
});

/** Inadimplência: associados com mensalidades vencidas e não pagas */
duesRouter.get("/dues/overdue", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  await ensureMonthlyDues(club);
  const today = todayISO();

  const rows = await db
    .select({
      due: dues,
      memberId: memberships.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .innerJoin(memberships, and(eq(memberships.userId, dues.userId), eq(memberships.clubId, dues.clubId)))
    .where(and(eq(dues.clubId, club.id), isNull(dues.paidAt), lt(dues.dueDate, today)))
    .orderBy(asc(dues.dueDate));

  const byUser = new Map<number, OverdueMemberDTO>();
  for (const r of rows) {
    const item: OverdueMemberDTO = byUser.get(r.due.userId) ?? {
      memberId: r.memberId,
      userId: r.due.userId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      avatarUrl: r.avatarUrl,
      overdueCount: 0,
      overdueAmount: 0,
      oldestDueDate: r.due.dueDate,
      daysLate: 0,
      dues: [],
    };
    item.overdueCount += 1;
    item.overdueAmount += r.due.amount;
    item.dues.push(toDueDTO(r.due, r.name));
    byUser.set(r.due.userId, item);
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  const members = [...byUser.values()]
    .map((m) => ({
      ...m,
      daysLate: Math.max(0, Math.round((Date.parse(today) - Date.parse(m.oldestDueDate)) / msPerDay)),
    }))
    .sort((a, b) => b.daysLate - a.daysLate || b.overdueAmount - a.overdueAmount);

  const [{ charged }] = await db
    .select({ charged: sql<number>`count(distinct ${dues.userId})::int` })
    .from(dues)
    .where(eq(dues.clubId, club.id));

  const report: OverdueReport = {
    members,
    totalAmount: members.reduce((s, m) => s + m.overdueAmount, 0),
    memberCount: members.length,
    payingMembers: Math.max(0, charged - members.length),
  };
  res.json(report);
});

/** Cobrança avulsa para um associado */
duesRouter.post("/dues", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const data = parse(createDueSchema, req.body);
  const [member] = await db
    .select({ name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.clubId, club.id), eq(memberships.userId, data.userId)));
  if (!member) throw badRequest("Associado não encontrado no clube");

  const [due] = await db
    .insert(dues)
    .values({ ...data, clubId: club.id })
    .returning();
  res.status(201).json(toDueDTO(due, member.name));
});

async function findDue(clubId: number, dueId: number) {
  const [row] = await db
    .select({ due: dues, name: users.name })
    .from(dues)
    .innerJoin(users, eq(users.id, dues.userId))
    .where(and(eq(dues.id, dueId), eq(dues.clubId, clubId)));
  if (!row) throw notFound("Mensalidade não encontrada");
  return row;
}

/** Dar baixa (ou desfazer a baixa) */
duesRouter.patch("/dues/:dueId", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const { due, name } = await findDue(club.id, idParam(req.params.dueId, "Mensalidade"));
  const data = parse(markDuePaidSchema, req.body);
  const [updated] = await db
    .update(dues)
    .set({
      paidAt: data.paid ? (due.paidAt ?? new Date()) : null,
      method: data.paid ? (data.method ?? due.method) : null,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    })
    .where(eq(dues.id, due.id))
    .returning();
  res.json(toDueDTO(updated, name));
});

duesRouter.delete("/dues/:dueId", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const { due } = await findDue(club.id, idParam(req.params.dueId, "Mensalidade"));
  await db.delete(dues).where(eq(dues.id, due.id));
  res.json({ ok: true });
});
