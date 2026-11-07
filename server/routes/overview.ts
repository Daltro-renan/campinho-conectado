/** Painel inicial do clube e mural de avisos. */
import { Router } from "express";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { dues, games, memberships, notices, players, teams, users } from "@shared/schema";
import { noticeSchema } from "@shared/validation";
import type { NoticeDTO, OverviewDTO } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { idParam, notFound, parse } from "../lib/http";
import { emptyRecord, serialize, summarizeDues, toDueDTO, toGameDTOs } from "../lib/dto";
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

  const [[next], [last], myDues, [{ memberCount }], [{ teamCount }], scorers, finished, noticeList] =
    await Promise.all([
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
      db
        .select({ teamCount: sql<number>`count(*)::int` })
        .from(teams)
        .where(eq(teams.clubId, club.id)),
      db
        .select({ player: players, teamName: teams.name })
        .from(players)
        .leftJoin(teams, eq(teams.id, players.teamId))
        .where(and(eq(players.clubId, club.id), sql`${players.goals} > 0`))
        .orderBy(desc(players.goals), desc(players.assists))
        .limit(5),
      db
        .select()
        .from(games)
        .where(and(eq(games.clubId, club.id), eq(games.status, "finalizado"))),
      listNotices(club.id, 3),
    ]);

  // Campanha do clube: só jogos contra adversários de fora (jogo-treino interno não conta)
  const record = emptyRecord();
  for (const g of finished) {
    if (g.opponentTeamId || g.teamScore == null || g.opponentScore == null) continue;
    record.played += 1;
    record.goalsFor += g.teamScore;
    record.goalsAgainst += g.opponentScore;
    if (g.teamScore > g.opponentScore) record.wins += 1;
    else if (g.teamScore === g.opponentScore) record.draws += 1;
    else record.losses += 1;
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
    teamCount,
    topScorers: scorers.map((s) => ({
      id: s.player.id,
      name: s.player.name,
      nickname: s.player.nickname,
      position: s.player.position,
      teamName: s.teamName,
      goals: s.player.goals,
      assists: s.player.assists,
    })),
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
