/**
 * Contexto de clube: todas as rotas /api/clubs/:clubId/... passam por aqui.
 * Verifica se o usuário é associado e qual o cargo dele NESTE clube.
 */
import type { Request, Response, NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { memberships, clubs, type Club, type Membership } from "@shared/schema";
import { can, type Capability, type Role } from "@shared/roles";
import { currentUser } from "./auth";
import { randomToken } from "./crypto";
import { forbidden, idParam, notFound } from "./http";

export type ClubContext = { club: Club; membership: Membership; role: Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      clubCtx?: ClubContext;
    }
  }
}

export async function loadClub(req: Request, _res: Response, next: NextFunction) {
  const user = currentUser(req);
  const clubId = idParam(req.params.clubId, "Clube");

  const [row] = await db
    .select({ club: clubs, membership: memberships })
    .from(memberships)
    .innerJoin(clubs, eq(clubs.id, memberships.clubId))
    .where(and(eq(memberships.clubId, clubId), eq(memberships.userId, user.id)));

  if (!row) throw notFound("Clube não encontrado ou você não faz parte dele");
  const club = await ensureCalendarToken(row.club);
  req.clubCtx = { club, membership: row.membership, role: row.membership.role as Role };
  next();
}

export function clubCtx(req: Request): ClubContext {
  if (!req.clubCtx) throw forbidden();
  return req.clubCtx;
}

/** Middleware: exige uma permissão do cargo no clube atual. */
export function requireCapability(capability: Capability) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { role } = clubCtx(req);
    if (!can(role, capability)) throw forbidden();
    next();
  };
}

/** Clubes antigos não têm token de agenda: cria na primeira leitura. */
export async function ensureCalendarToken(club: Club): Promise<Club> {
  if (club.calendarToken) return club;
  const [updated] = await db
    .update(clubs)
    .set({ calendarToken: randomToken() })
    .where(eq(clubs.id, club.id))
    .returning();
  return updated;
}
