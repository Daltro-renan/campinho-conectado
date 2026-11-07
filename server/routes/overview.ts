/** Painel inicial do clube e mural de avisos. */
import { Router } from "express";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { dues, games, memberships, notices, users } from "@shared/schema";
import { noticeSchema } from "@shared/validation";
import type { NoticeDTO, OverviewDTO } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { idParam, notFound, parse } from "../lib/http";
import { clubRecord, serialize, summarizeDues, toDueDTO, toGameDTOs, todayISO } from "../lib/dto";
import { ensureMonthlyDues } from "../lib/auto-dues";
import { topScorers } from "./roster";
import { can } from "@shared/roles";
import { toMyClub } from "./clubs";

export const overviewRouter = Router({ mergeParams: true });

async function listNotices(clubId: number, limit = 20): Promise<NoticeDTO[]> {
  const rows = await db
    .select({ notice: notices, authorName: users.name })
    .from(notices)
    .leftJoin(users, eq(users.id, notices.authorId))
    .where(eq(notices.clubId, clubId))
    .orderBy(desc(notices.pinned), desc(notices.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...serialize(r.notice), authorName: r.authorName }));
}

overviewRouter.get("/overview", async (req, res) => {
  const { club, role } = clubCtx(req);
  const user = currentUser(req);
  const now = new Date();
  await ensureMonthlyDues(club);

  const [[next], [last], myDues, [{ memberCount }], scorers, record, noticeList] = await Promise.all([
    db
      .select()
      .from(games)
      .where(and(eq(games.clubId, club.id), eq(games.status, "agendado"), gte(games.startsAt, now)))
      .orderBy(asc(games.startsAt))
      .limit(1),
    db
      .select()
      .from(games)
      .where(and(eq(games.clubId, club.id), eq(games.status, "finalizado")))
      .orderBy(desc(games.startsAt))
      .limit(1),
    db
      .select()
      .from(dues)
      .where(and(eq(dues.clubId, club.id), eq(dues.userId, user.id))),
    db
      .select({ memberCount: sql<number>`count(*)::int` })
      .from(memberships)
      .where(eq(memberships.clubId, club.id)),
    topScorers(club.id, 5),
    clubRecord(club.id),
    listNotices(club.id, 3),
  ]);

  // Resumo da inadimplência, só para quem cuida das finanças
  let overdue: OverviewDTO["overdue"] = null;
  if (can(role, "finance.manage")) {
    const [row] = await db
      .select({
        memberCount: sql<number>`count(distinct ${dues.userId})::int`,
        totalAmount: sql<number>`coalesce(sum(${dues.amount}), 0)::int`,
      })
      .from(dues)
      .where(and(eq(dues.clubId, club.id), isNull(dues.paidAt), lt(dues.dueDate, todayISO())));
    overdue = row;
  }

  const [nextGame, lastGame] = await Promise.all([
    next ? toGameDTOs([next], user.id).then((l) => l[0]) : null,
    last ? toGameDTOs([last], user.id).then((l) => l[0]) : null,
  ]);

  const overview: OverviewDTO = {
    club: toMyClub(club, role, memberCount),
    nextGame,
    lastGame,
    dues: summarizeDues(myDues.map((d) => toDueDTO(d, user.name))),
    record,
    memberCount,
    overdue,
    topScorers: scorers,
    notices: noticeList,
  };
  res.json(overview);
});

// ---------- Avisos ----------

overviewRouter.get("/notices", async (req, res) => {
  res.json(await listNotices(clubCtx(req).club.id));
});

overviewRouter.post("/notices", requireCapability("notices.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const user = currentUser(req);
  const data = parse(noticeSchema, req.body);
  const [created] = await db
    .insert(notices)
    .values({ ...data, clubId: club.id, authorId: user.id })
    .returning();
  const dto: NoticeDTO = { ...serialize(created), authorName: user.name };
  res.status(201).json(dto);
});

overviewRouter.delete("/notices/:noticeId", requireCapability("notices.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const [deleted] = await db
    .delete(notices)
    .where(and(eq(notices.id, idParam(req.params.noticeId, "Aviso")), eq(notices.clubId, club.id)))
    .returning({ id: notices.id });
  if (!deleted) throw notFound("Aviso não encontrado");
  res.json({ ok: true });
});
