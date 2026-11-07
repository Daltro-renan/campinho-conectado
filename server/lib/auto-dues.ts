/**
 * Mensalidades automáticas: todo mês, cada associado não isento recebe a cobrança
 * do mês com o valor e o vencimento configurados no clube.
 *
 * Roda (1) a cada hora para todos os clubes e (2) sempre que alguém abre o painel
 * ou as mensalidades — assim funciona mesmo quando o servidor gratuito "dorme".
 * É idempotente: nunca cria duas cobranças do mesmo mês para o mesmo associado.
 */
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { clubs, dues, memberships, type Club } from "@shared/schema";
import { currentMonth } from "./dto";
import { log } from "../vite";

function dueDateFor(referenceMonth: string, dueDay: number): string {
  return `${referenceMonth}-${String(dueDay).padStart(2, "0")}`;
}

/** Gera as mensalidades do mês (padrão: mês atual) que ainda faltam. Retorna quantas criou. */
export async function ensureMonthlyDues(club: Club, referenceMonth = currentMonth()): Promise<number> {
  if (club.monthlyFee <= 0) return 0;
  const members = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.clubId, club.id), eq(memberships.feeExempt, false)));
  if (members.length === 0) return 0;

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
  return created.length;
}

/** Passada geral em todos os clubes que cobram mensalidade */
export async function runAutoDues() {
  try {
    const list = await db.select().from(clubs).where(gt(clubs.monthlyFee, 0));
    let total = 0;
    for (const club of list) total += await ensureMonthlyDues(club);
    if (total > 0) log(`Mensalidades automáticas: ${total} cobrança(s) gerada(s)`);
  } catch (err) {
    console.error("[mensalidades automáticas]", err);
  }
}

export function startAutoDues() {
  void runAutoDues();
  setInterval(runAutoDues, 60 * 60 * 1000).unref();
}
