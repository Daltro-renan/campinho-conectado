/** Elenco: todo associado do clube é jogador do time. */
import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { memberships, users } from "@shared/schema";
import { can } from "@shared/roles";
import { playerAdminSchema, playerProfileSchema } from "@shared/validation";
import type { ScorerDTO } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx } from "../lib/club";
import { forbidden, idParam, nonEmpty, notFound, parse } from "../lib/http";

export const rosterRouter = Router({ mergeParams: true });

/**
 * Atualiza os dados de jogador de um associado.
 * - O próprio associado: apelido, posição e número.
 * - Comissão técnica/diretoria: tudo, inclusive situação, capitão e números da temporada.
 */
rosterRouter.patch("/members/:memberId/player", async (req, res) => {
  const { club, role } = clubCtx(req);
  const user = currentUser(req);
  const [member] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, idParam(req.params.memberId, "Associado")), eq(memberships.clubId, club.id)));
  if (!member) throw notFound("Associado não encontrado");

  const isStaff = can(role, "squad.manage");
  if (!isStaff && member.userId !== user.id) throw forbidden();
  const data = nonEmpty(parse(isStaff ? playerAdminSchema : playerProfileSchema, req.body));

  // Só um capitão por clube
  if ("isCaptain" in data && data.isCaptain) {
    await db.update(memberships).set({ isCaptain: false }).where(eq(memberships.clubId, club.id));
  }
  const [updated] = await db.update(memberships).set(data).where(eq(memberships.id, member.id)).returning();
  res.json({ ...updated, joinedAt: updated.joinedAt.toISOString() });
});

/** Artilharia do clube */
rosterRouter.get("/top-scorers", async (req, res) => {
  const { club } = clubCtx(req);
  res.json(await topScorers(club.id, 10));
});

export async function topScorers(clubId: number, limit: number): Promise<ScorerDTO[]> {
  const rows = await db
    .select({
      id: memberships.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      nickname: memberships.nickname,
      position: memberships.position,
      goals: memberships.goals,
      assists: memberships.assists,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.clubId, clubId), sql`${memberships.goals} > 0`))
    .orderBy(desc(memberships.goals), desc(memberships.assists))
    .limit(limit);
  return rows;
}
