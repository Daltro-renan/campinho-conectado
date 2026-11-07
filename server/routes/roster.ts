/** Elenco: todo associado do clube é jogador do time. */
import { Router } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { attendances, gameMatches, gamePlayers, games, memberships, users } from "@shared/schema";
import type { Side } from "@shared/validation";
import { teamName } from "@shared/standings";
import { can } from "@shared/roles";
import { playerAdminSchema, playerProfileSchema } from "@shared/validation";
import type { PlayerGameDTO, RankingEntry, ScorerDTO } from "@shared/api";
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
  res.json(await topScorers(club.id, 10, club.name));
});

export async function topScorers(clubId: number, limit: number, clubName = ""): Promise<ScorerDTO[]> {
  const ranking = await computeRanking(clubId, clubName, yearOf(new Date()));
  return ranking
    .filter((r) => r.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((r) => ({
      id: r.memberId,
      name: r.name,
      avatarUrl: r.avatarUrl,
      nickname: r.nickname,
      position: r.position,
      goals: r.goals,
      assists: r.assists,
    }));
}

const yearOf = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric" }).format(d));

type Participation = {
  gameId: number;
  startsAt: Date;
  kind: "racha" | "torneio" | "externo";
  title: string;
  userId: number;
  side: Side;
  myScore: number;
  theirScore: number;
  goals: number;
  assists: number;
};

/**
 * Participações nos jogos finalizados do clube (opcionalmente de uma temporada).
 * Vem da escalação; jogo contra adversário sem escalação usa quem confirmou presença.
 */
async function participations(clubId: number, clubName: string, season: number | null): Promise<Participation[]> {
  const finished = (
    await db
      .select()
      .from(games)
      .where(and(eq(games.clubId, clubId), eq(games.status, "finalizado")))
  ).filter(
    (g) =>
      (g.kind === "torneio" || (g.teamScore != null && g.opponentScore != null)) &&
      (season == null || yearOf(g.startsAt) === season),
  );
  if (finished.length === 0) return [];
  const ids = finished.map((g) => g.id);

  const lineup = await db.select().from(gamePlayers).where(inArray(gamePlayers.gameId, ids));
  const withLineup = new Set(lineup.map((l) => l.gameId));
  const confirmed = await db
    .select({ gameId: attendances.gameId, userId: attendances.userId })
    .from(attendances)
    .where(and(inArray(attendances.gameId, ids), eq(attendances.status, "confirmado")));
  const matches = await db
    .select()
    .from(gameMatches)
    .where(inArray(gameMatches.gameId, ids))
    .orderBy(gameMatches.position, gameMatches.id);

  const out: Participation[] = [];
  for (const g of finished) {
    // Torneio: cada partida conta como um jogo para quem estava nos dois times;
    // gols e assistências do torneio entram uma vez só (na primeira partida do jogador)
    if (g.kind === "torneio") {
      const players = lineup.filter((l) => l.gameId === g.id);
      const credited = new Set<number>();
      for (const m of matches.filter((x) => x.gameId === g.id)) {
        const title = `${g.competitionName || "Torneio"}: ${teamName(g.teams, m.homeSide)} x ${teamName(g.teams, m.awaySide)}`;
        for (const p of players) {
          const home = p.side === m.homeSide;
          if (!home && p.side !== m.awaySide) continue;
          const first = !credited.has(p.userId);
          credited.add(p.userId);
          out.push({
            gameId: g.id,
            startsAt: g.startsAt,
            kind: "torneio",
            title,
            userId: p.userId,
            side: p.side as Side,
            myScore: home ? m.homeScore : m.awayScore,
            theirScore: home ? m.awayScore : m.homeScore,
            goals: first ? p.goals : 0,
            assists: first ? p.assists : 0,
          });
        }
      }
      continue;
    }
    const kind = g.kind === "racha" ? "racha" : "externo";
    const title =
      kind === "racha"
        ? `${g.sideAName ?? "Time A"} x ${g.sideBName ?? "Time B"}`
        : `${clubName} x ${g.opponentName ?? "Adversário"}`;
    const rows = withLineup.has(g.id)
      ? lineup.filter((l) => l.gameId === g.id).map((l) => ({ userId: l.userId, side: l.side as Side, goals: l.goals, assists: l.assists }))
      : kind === "externo"
        ? confirmed.filter((c) => c.gameId === g.id).map((c) => ({ userId: c.userId, side: "A" as Side, goals: 0, assists: 0 }))
        : [];
    for (const r of rows) {
      const mine = r.side === "A" ? g.teamScore! : g.opponentScore!;
      const theirs = r.side === "A" ? g.opponentScore! : g.teamScore!;
      out.push({ gameId: g.id, startsAt: g.startsAt, kind, title, ...r, myScore: mine, theirScore: theirs });
    }
  }
  return out;
}

const outcomeOf = (p: Participation): "V" | "E" | "D" =>
  p.myScore > p.theirScore ? "V" : p.myScore === p.theirScore ? "E" : "D";

function seasonParam(value: unknown): number | null {
  if (value === "todas") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 2000 && n < 2200 ? n : yearOf(new Date());
}

/**
 * Ranking do clube por temporada (?temporada=2026 ou ?temporada=todas).
 * Jogos, vitórias, gols e assistências saem das escalações dos jogos finalizados.
 * Em "todas", somam-se também os números lançados à mão na ficha (ex.: antes do app).
 */
rosterRouter.get("/ranking", async (req, res) => {
  const { club } = clubCtx(req);
  const season = seasonParam(req.query.temporada);
  const ranking = await computeRanking(club.id, club.name, season);

  // Temporadas com jogos, para o seletor
  const years = await db
    .select({ startsAt: games.startsAt })
    .from(games)
    .where(and(eq(games.clubId, club.id), eq(games.status, "finalizado")));
  const seasons = [...new Set([yearOf(new Date()), ...years.map((y) => yearOf(y.startsAt))])].sort((a, b) => b - a);

  res.json({ season, seasons, entries: ranking });
});

export async function computeRanking(clubId: number, clubName: string, season: number | null): Promise<RankingEntry[]> {
  const members = await db
    .select({
      memberId: memberships.id,
      userId: memberships.userId,
      name: users.name,
      nickname: memberships.nickname,
      avatarUrl: users.avatarUrl,
      position: memberships.position,
      shirtNumber: memberships.shirtNumber,
      manualGoals: memberships.goals,
      manualAssists: memberships.assists,
      manualGames: memberships.gamesPlayed,
      yellowCards: memberships.yellowCards,
      redCards: memberships.redCards,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.clubId, clubId));

  const parts = await participations(clubId, clubName, season);
  const stats = new Map<number, { games: number; wins: number; draws: number; losses: number; goals: number; assists: number }>();
  for (const p of parts) {
    const s = stats.get(p.userId) ?? { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0 };
    s.games += 1;
    const o = outcomeOf(p);
    if (o === "V") s.wins += 1;
    else if (o === "E") s.draws += 1;
    else s.losses += 1;
    s.goals += p.goals;
    s.assists += p.assists;
    stats.set(p.userId, s);
  }

  const all = season == null;
  return members.map(({ manualGoals, manualAssists, manualGames, ...m }) => {
    const s = stats.get(m.userId) ?? { games: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0 };
    return {
      ...m,
      games: s.games + (all ? manualGames : 0),
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      goals: s.goals + (all ? manualGoals : 0),
      assists: s.assists + (all ? manualAssists : 0),
    };
  });
}

/** Jogos de que um associado participou (na temporada), do ponto de vista dele */
rosterRouter.get("/members/:memberId/games", async (req, res) => {
  const { club } = clubCtx(req);
  const [member] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.id, idParam(req.params.memberId, "Associado")), eq(memberships.clubId, club.id)));
  if (!member) throw notFound("Associado não encontrado");
  const season = seasonParam(req.query.temporada);
  const list: PlayerGameDTO[] = (await participations(club.id, club.name, season))
    .filter((p) => p.userId === member.userId)
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .map((p) => ({
      gameId: p.gameId,
      startsAt: p.startsAt.toISOString(),
      kind: p.kind,
      title: p.title,
      side: p.side,
      myScore: p.myScore,
      theirScore: p.theirScore,
      outcome: outcomeOf(p),
      goals: p.goals,
      assists: p.assists,
    }));
  res.json(list);
});
