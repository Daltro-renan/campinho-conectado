/** Clubes: criar, entrar por convite, editar, sair e gerenciar associados. */
import { Router } from "express";
import crypto from "crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { clubs, memberships, users, type Club } from "@shared/schema";
import {
  clubSchema,
  joinClubSchema,
  updateClubSchema,
  updateMemberSchema,
} from "@shared/validation";
import { can, canManageMember, assignableRoles, type Role } from "@shared/roles";
import type { MemberDTO, MyClub } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, loadClub, requireCapability } from "../lib/club";
import { badRequest, conflict, forbidden, idParam, nonEmpty, notFound, parse } from "../lib/http";
import { serialize } from "../lib/dto";

export const clubsRouter = Router();

// Sem letras/números que se confundem (0/O, 1/I/L)
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function newInviteCode(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function memberCounts(clubIds: number[]): Promise<Map<number, number>> {
  if (clubIds.length === 0) return new Map();
  const rows = await db
    .select({ clubId: memberships.clubId, total: sql<number>`count(*)::int` })
    .from(memberships)
    .where(inArray(memberships.clubId, clubIds))
    .groupBy(memberships.clubId);
  return new Map(rows.map((r) => [r.clubId, r.total]));
}

export function toMyClub(club: Club, role: Role, memberCount: number): MyClub {
  return {
    ...serialize(club),
    inviteCode: can(role, "members.manage") ? club.inviteCode : null,
    role,
    memberCount,
  };
}

// ---------- Rotas sem clube selecionado ----------

clubsRouter.get("/", async (req, res) => {
  const user = currentUser(req);
  const rows = await db
    .select({ club: clubs, role: memberships.role })
    .from(memberships)
    .innerJoin(clubs, eq(clubs.id, memberships.clubId))
    .where(eq(memberships.userId, user.id))
    .orderBy(asc(clubs.name));
  const counts = await memberCounts(rows.map((r) => r.club.id));
  res.json(rows.map((r) => toMyClub(r.club, r.role as Role, counts.get(r.club.id) ?? 1)));
});

clubsRouter.post("/", async (req, res) => {
  const user = currentUser(req);
  const data = parse(clubSchema, req.body);

  const club = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(clubs)
      .values({ ...data, inviteCode: newInviteCode(), createdBy: user.id })
      .returning();
    // Quem cria o clube vira presidente
    await tx.insert(memberships).values({ clubId: created.id, userId: user.id, role: "presidente" });
    return created;
  });

  res.status(201).json(toMyClub(club, "presidente", 1));
});

clubsRouter.post("/join", async (req, res) => {
  const user = currentUser(req);
  const { inviteCode } = parse(joinClubSchema, req.body);

  const [club] = await db.select().from(clubs).where(eq(clubs.inviteCode, inviteCode));
  if (!club) throw notFound("Código de convite não encontrado. Confira com a diretoria do clube.");

  const [already] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.clubId, club.id), eq(memberships.userId, user.id)));
  if (already) throw conflict("Você já faz parte deste clube");

  // Quem entra por convite começa como jogador
  await db.insert(memberships).values({ clubId: club.id, userId: user.id, role: "jogador" });
  const counts = await memberCounts([club.id]);
  res.status(201).json(toMyClub(club, "jogador", counts.get(club.id) ?? 1));
});

// ---------- Rotas de um clube (exigem ser associado) ----------

export const clubRouter = Router({ mergeParams: true });
clubRouter.use(loadClub);

clubRouter.get("/", async (req, res) => {
  const { club, role } = clubCtx(req);
  const counts = await memberCounts([club.id]);
  res.json(toMyClub(club, role, counts.get(club.id) ?? 1));
});

clubRouter.patch("/", requireCapability("club.edit"), async (req, res) => {
  const { club, role } = clubCtx(req);
  const data = nonEmpty(parse(updateClubSchema, req.body));
  const [updated] = await db.update(clubs).set(data).where(eq(clubs.id, club.id)).returning();
  const counts = await memberCounts([club.id]);
  res.json(toMyClub(updated, role, counts.get(club.id) ?? 1));
});

clubRouter.delete("/", requireCapability("club.edit"), async (req, res) => {
  const { club } = clubCtx(req);
  await db.delete(clubs).where(eq(clubs.id, club.id));
  res.json({ ok: true });
});

/** Gera um novo código de convite (o antigo deixa de funcionar) */
clubRouter.post("/invite-code", requireCapability("members.manage"), async (req, res) => {
  const { club, role } = clubCtx(req);
  const [updated] = await db
    .update(clubs)
    .set({ inviteCode: newInviteCode() })
    .where(eq(clubs.id, club.id))
    .returning();
  const counts = await memberCounts([club.id]);
  res.json(toMyClub(updated, role, counts.get(club.id) ?? 1));
});

clubRouter.post("/leave", async (req, res) => {
  const { club, membership, role } = clubCtx(req);
  if (role === "presidente") {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(eq(memberships.clubId, club.id), eq(memberships.role, "presidente")));
    if (total <= 1) {
      throw badRequest("Passe a presidência para outro associado antes de sair do clube.");
    }
  }
  await db.delete(memberships).where(eq(memberships.id, membership.id));
  res.json({ ok: true });
});

// ---------- Associados ----------

clubRouter.get("/members", async (req, res) => {
  const { club } = clubCtx(req);
  const rows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      feeExempt: memberships.feeExempt,
      joinedAt: memberships.joinedAt,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      phone: users.phone,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.clubId, club.id))
    .orderBy(asc(users.name));

  const { role } = clubCtx(req);
  const showContacts = can(role, "members.manage");
  const members: MemberDTO[] = rows.map((r) => ({
    ...r,
    role: r.role as Role,
    joinedAt: r.joinedAt.toISOString(),
    // Contato só para a diretoria
    email: showContacts ? r.email : "",
    phone: showContacts ? r.phone : null,
  }));
  res.json(members);
});

async function findMember(clubId: number, memberId: number) {
  const [member] = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, memberId), eq(memberships.clubId, clubId)));
  if (!member) throw notFound("Associado não encontrado");
  return member;
}

clubRouter.patch("/members/:memberId", requireCapability("members.manage"), async (req, res) => {
  const { club, membership: me, role: myRole } = clubCtx(req);
  const target = await findMember(club.id, idParam(req.params.memberId));
  const data = nonEmpty(parse(updateMemberSchema, req.body));

  if (data.role !== undefined) {
    if (target.id === me.id) throw forbidden("Você não pode mudar o próprio cargo");
    if (!canManageMember(myRole, target.role as Role)) throw forbidden();
    if (!assignableRoles(myRole).includes(data.role)) {
      throw forbidden("Você não pode atribuir esse cargo");
    }
  }
  if (data.feeExempt !== undefined && !can(myRole, "finance.manage")) throw forbidden();

  const [updated] = await db
    .update(memberships)
    .set(data)
    .where(eq(memberships.id, target.id))
    .returning();
  res.json({ ...updated, joinedAt: updated.joinedAt.toISOString() });
});

clubRouter.delete("/members/:memberId", requireCapability("members.manage"), async (req, res) => {
  const { club, membership: me, role: myRole } = clubCtx(req);
  const target = await findMember(club.id, idParam(req.params.memberId));
  if (target.id === me.id) throw badRequest("Para sair do clube, use a opção Sair do clube");
  if (!canManageMember(myRole, target.role as Role)) throw forbidden();
  await db.delete(memberships).where(eq(memberships.id, target.id));
  res.json({ ok: true });
});
