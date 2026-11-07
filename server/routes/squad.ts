/** Times do clube e elenco (jogadores). */
import { Router } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { memberships, players, teams, users } from "@shared/schema";
import {
  playerSchema,
  teamSchema,
  updatePlayerSchema,
  updateTeamSchema,
} from "@shared/validation";
import type { PlayerDTO, TeamDTO } from "@shared/api";
import { clubCtx, requireCapability } from "../lib/club";
import { badRequest, idParam, nonEmpty, notFound, parse } from "../lib/http";
import { emptyRecord, serialize, teamRecords } from "../lib/dto";

export const squadRouter = Router({ mergeParams: true });

// ---------- Helpers de verificação ----------

async function findTeam(clubId: number, teamId: number) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.clubId, clubId)));
  if (!team) throw notFound("Time não encontrado");
  return team;
}

async function assertMember(clubId: number, userId: number | null | undefined, label: string) {
  if (!userId) return;
  const [m] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.clubId, clubId), eq(memberships.userId, userId)));
  if (!m) throw badRequest(`${label} precisa ser associado do clube`);
}

async function teamDTOs(clubId: number, teamId?: number): Promise<TeamDTO[]> {
  const rows = await db
    .select({
      team: teams,
      coachName: users.name,
      playerCount: sql<number>`(select count(*)::int from ${players} where ${players.teamId} = ${teams.id})`,
    })
    .from(teams)
    .leftJoin(users, eq(users.id, teams.coachUserId))
    .where(teamId ? and(eq(teams.clubId, clubId), eq(teams.id, teamId)) : eq(teams.clubId, clubId))
    .orderBy(asc(teams.name));

  const records = await teamRecords(clubId);
  return rows.map((r) => ({
    ...serialize(r.team),
    coachName: r.coachName,
    playerCount: r.playerCount,
    record: records.get(r.team.id) ?? emptyRecord(),
  }));
}

// ---------- Times ----------

squadRouter.get("/teams", async (req, res) => {
  res.json(await teamDTOs(clubCtx(req).club.id));
});

squadRouter.get("/teams/:teamId", async (req, res) => {
  const [team] = await teamDTOs(clubCtx(req).club.id, idParam(req.params.teamId, "Time"));
  if (!team) throw notFound("Time não encontrado");
  res.json(team);
});

squadRouter.post("/teams", requireCapability("teams.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const data = parse(teamSchema, req.body);
  await assertMember(club.id, data.coachUserId, "O técnico");
  const [team] = await db
    .insert(teams)
    .values({ ...data, clubId: club.id })
    .returning();
  const [dto] = await teamDTOs(club.id, team.id);
  res.status(201).json(dto);
});

squadRouter.patch("/teams/:teamId", requireCapability("teams.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const team = await findTeam(club.id, idParam(req.params.teamId, "Time"));
  const data = nonEmpty(parse(updateTeamSchema, req.body));
  await assertMember(club.id, data.coachUserId, "O técnico");
  await db.update(teams).set(data).where(eq(teams.id, team.id));
  const [dto] = await teamDTOs(club.id, team.id);
  res.json(dto);
});

squadRouter.delete("/teams/:teamId", requireCapability("teams.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const team = await findTeam(club.id, idParam(req.params.teamId, "Time"));
  // Jogadores continuam no clube, só ficam sem time. Os jogos do time são removidos.
  await db.delete(teams).where(eq(teams.id, team.id));
  res.json({ ok: true });
});

// ---------- Jogadores ----------

async function playerDTOs(clubId: number, filter?: { teamId?: number; playerId?: number }): Promise<PlayerDTO[]> {
  const conditions = [eq(players.clubId, clubId)];
  if (filter?.teamId) conditions.push(eq(players.teamId, filter.teamId));
  if (filter?.playerId) conditions.push(eq(players.id, filter.playerId));
  const rows = await db
    .select({ player: players, teamName: teams.name })
    .from(players)
    .leftJoin(teams, eq(teams.id, players.teamId))
    .where(and(...conditions))
    .orderBy(asc(players.shirtNumber), asc(players.name));
  return rows.map((r) => ({ ...serialize(r.player), teamName: r.teamName }));
}

squadRouter.get("/players", async (req, res) => {
  const { club } = clubCtx(req);
  const teamId = req.query.teamId ? idParam(String(req.query.teamId), "Time") : undefined;
  res.json(await playerDTOs(club.id, { teamId }));
});

/** Artilharia do clube */
squadRouter.get("/players/top-scorers", async (req, res) => {
  const { club } = clubCtx(req);
  const rows = await db
    .select({ player: players, teamName: teams.name })
    .from(players)
    .leftJoin(teams, eq(teams.id, players.teamId))
    .where(and(eq(players.clubId, club.id), sql`${players.goals} > 0`))
    .orderBy(desc(players.goals), desc(players.assists))
    .limit(10);
  res.json(rows.map((r) => ({ ...serialize(r.player), teamName: r.teamName })));
});

squadRouter.post("/players", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const data = parse(playerSchema, req.body);
  if (data.teamId) await findTeam(club.id, data.teamId);
  await assertMember(club.id, data.userId, "O associado vinculado");
  const [player] = await db
    .insert(players)
    .values({ ...data, clubId: club.id })
    .returning();
  const [dto] = await playerDTOs(club.id, { playerId: player.id });
  res.status(201).json(dto);
});

async function findPlayer(clubId: number, playerId: number) {
  const [player] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, playerId), eq(players.clubId, clubId)));
  if (!player) throw notFound("Jogador não encontrado");
  return player;
}

squadRouter.patch("/players/:playerId", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const player = await findPlayer(club.id, idParam(req.params.playerId, "Jogador"));
  const data = nonEmpty(parse(updatePlayerSchema, req.body));
  if (data.teamId) await findTeam(club.id, data.teamId);
  await assertMember(club.id, data.userId, "O associado vinculado");
  await db.update(players).set(data).where(eq(players.id, player.id));
  const [dto] = await playerDTOs(club.id, { playerId: player.id });
  res.json(dto);
});

squadRouter.delete("/players/:playerId", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const player = await findPlayer(club.id, idParam(req.params.playerId, "Jogador"));
  await db.delete(players).where(eq(players.id, player.id));
  res.json({ ok: true });
});
