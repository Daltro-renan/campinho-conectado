/** Jogos, resultados e confirmação de presença. */
import { Router } from "express";
import { and, asc, desc, eq, gte, lt, ne, or } from "drizzle-orm";
import { db } from "../db";
import { attendances, games, teams, users } from "@shared/schema";
import { attendanceSchema, gameSchema, updateGameSchema } from "@shared/validation";
import type { AttendeeDTO } from "@shared/api";
import { currentUser } from "../lib/auth";
import { clubCtx, requireCapability } from "../lib/club";
import { badRequest, idParam, nonEmpty, notFound, parse } from "../lib/http";
import { toGameDTOs } from "../lib/dto";

export const gamesRouter = Router({ mergeParams: true });

async function assertTeam(clubId: number, teamId: number | null | undefined) {
  if (!teamId) return;
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.clubId, clubId)));
  if (!team) throw badRequest("Escolha um time cadastrado no clube");
}

async function findGame(clubId: number, gameId: number) {
  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.clubId, clubId)));
  if (!game) throw notFound("Jogo não encontrado");
  return game;
}

/**
 * Lista de jogos.
 * ?when=proximos (padrão) — agendados a partir de agora, do mais próximo ao mais distante
 * ?when=anteriores — já realizados, do mais recente ao mais antigo
 * ?teamId= — filtra por time (como mandante ou adversário)
 */
gamesRouter.get("/games", async (req, res) => {
  const { club } = clubCtx(req);
  const user = currentUser(req);
  const when = req.query.when === "anteriores" ? "anteriores" : "proximos";
  const now = new Date();

  const conditions = [eq(games.clubId, club.id)];
  if (req.query.teamId) {
    const teamId = idParam(String(req.query.teamId), "Time");
    conditions.push(or(eq(games.teamId, teamId), eq(games.opponentTeamId, teamId))!);
  }
  if (when === "proximos") {
    conditions.push(gte(games.startsAt, now), eq(games.status, "agendado"));
  } else {
    conditions.push(or(lt(games.startsAt, now), ne(games.status, "agendado"))!);
  }

  const list = await db
    .select()
    .from(games)
    .where(and(...conditions))
    .orderBy(when === "proximos" ? asc(games.startsAt) : desc(games.startsAt))
    .limit(100);

  res.json(await toGameDTOs(list, user.id));
});

gamesRouter.get("/games/:gameId", async (req, res) => {
  const { club } = clubCtx(req);
  const game = await findGame(club.id, idParam(req.params.gameId, "Jogo"));
  const [dto] = await toGameDTOs([game], currentUser(req).id);
  res.json(dto);
});

gamesRouter.post("/games", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const data = parse(gameSchema, req.body);
  await assertTeam(club.id, data.teamId);
  await assertTeam(club.id, data.opponentTeamId);
  if (data.opponentTeamId === data.teamId) throw badRequest("Um time não pode jogar contra ele mesmo");

  const [game] = await db
    .insert(games)
    .values({
      ...data,
      // Se o adversário é um time do clube, não guardamos nome digitado
      opponentName: data.opponentTeamId ? null : data.opponentName,
      clubId: club.id,
    })
    .returning();
  const [dto] = await toGameDTOs([game], currentUser(req).id);
  res.status(201).json(dto);
});

gamesRouter.patch("/games/:gameId", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const game = await findGame(club.id, idParam(req.params.gameId, "Jogo"));
  const data = nonEmpty(parse(updateGameSchema, req.body));
  await assertTeam(club.id, data.teamId);
  await assertTeam(club.id, data.opponentTeamId);

  const teamId = data.teamId ?? game.teamId;
  const opponentTeamId = data.opponentTeamId !== undefined ? data.opponentTeamId : game.opponentTeamId;
  const opponentName = data.opponentName !== undefined ? data.opponentName : game.opponentName;
  if (opponentTeamId && opponentTeamId === teamId) {
    throw badRequest("Um time não pode jogar contra ele mesmo");
  }
  if (!opponentTeamId && !opponentName) throw badRequest("Informe o adversário");

  // Ao lançar placar, o jogo passa a "finalizado" automaticamente
  const status =
    data.status ??
    (data.teamScore != null && data.opponentScore != null ? "finalizado" : undefined);
  if (status === "finalizado") {
    const ts = data.teamScore !== undefined ? data.teamScore : game.teamScore;
    const os = data.opponentScore !== undefined ? data.opponentScore : game.opponentScore;
    if (ts == null || os == null) throw badRequest("Informe o placar para finalizar o jogo");
  }

  const [updated] = await db
    .update(games)
    .set({ ...data, status, opponentName: opponentTeamId ? null : opponentName })
    .where(eq(games.id, game.id))
    .returning();
  const [dto] = await toGameDTOs([updated], currentUser(req).id);
  res.json(dto);
});

gamesRouter.delete("/games/:gameId", requireCapability("squad.manage"), async (req, res) => {
  const { club } = clubCtx(req);
  const game = await findGame(club.id, idParam(req.params.gameId, "Jogo"));
  await db.delete(games).where(eq(games.id, game.id));
  res.json({ ok: true });
});

// ---------- Presença ----------

gamesRouter.put("/games/:gameId/attendance", async (req, res) => {
  const { club } = clubCtx(req);
  const user = currentUser(req);
  const game = await findGame(club.id, idParam(req.params.gameId, "Jogo"));
  if (game.status !== "agendado") throw badRequest("Este jogo não está mais aberto para confirmações");
  const { status } = parse(attendanceSchema, req.body);

  await db
    .insert(attendances)
    .values({ gameId: game.id, userId: user.id, status })
    .onConflictDoUpdate({
      target: [attendances.gameId, attendances.userId],
      set: { status, updatedAt: new Date() },
    });
  const [dto] = await toGameDTOs([game], user.id);
  res.json(dto);
});

gamesRouter.get("/games/:gameId/attendance", async (req, res) => {
  const { club } = clubCtx(req);
  const game = await findGame(club.id, idParam(req.params.gameId, "Jogo"));
  const rows = await db
    .select({
      userId: attendances.userId,
      status: attendances.status,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(attendances)
    .innerJoin(users, eq(users.id, attendances.userId))
    .where(eq(attendances.gameId, game.id))
    .orderBy(asc(users.name));
  const list: AttendeeDTO[] = rows;
  res.json(list);
});
