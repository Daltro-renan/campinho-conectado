/** Mensalidades: cada associado vê as suas; a diretoria gera cobranças e dá baixa. */
import { Router } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db";
import { dues, memberships, users } from "@shared/schema";
import { createDueSchema, generateDuesSchema, markDuePaidSchema } from "@shared/validation";
import type { DueDTO, FinanceOverview } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { badRequest, idParam, notFound, parse } from "../lib/http";
import { currentMonth, summarizeDues, toDueDTO } from "../lib/dto";

export const duesRouter = Router({ mergeParams: true });

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

function dueDateFor(referenceMonth: string, dueDay: number): string {
  return `${referenceMonth}-${String(dueDay).padStart(2, "0")}`;
}

/** Minhas mensalidades + resumo (em dia / pendente / vencido) */
duesRouter.get("/dues/me", async (req, res) => {
  const { club } = clubCtx(req);
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

/** Gera a mensalidade do mês para todos os associados que ainda não têm */
duesRouter.post("/dues/generate", requireCapability("finance.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const { referenceMonth } = parse(generateDuesSchema, req.body);
  if (club.monthlyFee <= 0) {
    throw badRequest("Defina o valor da mensalidade nas configurações do clube antes de gerar cobranças.");
  }

  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.clubId, club.id), eq(memberships.feeExempt, false)));

  if (members.length === 0) return res.json({ created: 0 });

  const created = await db
    .insert(dues)
    .values(
      members.map((m) => ({
        clubId: club.id,
        userId: m.userId,
        referenceMonth,
        amount: club.monthlyFee,
        dueDate: dueDateFor(referenceMonth, club.dueDay),
      })),
    )
    .onConflictDoNothing()
    .returning({ id: dues.id });

  res.status(201).json({ created: created.length });
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
