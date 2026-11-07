/** Monta os objetos que a API devolve a partir das linhas do banco. */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { attendances, gameMatches, gamePlayers, games, memberships, users, type Due, type Game } from "@shared/schema";
import type { Side } from "@shared/validation";
import type {
  DueDTO,
  DueStatus,
  DuesSummary,
  GameDTO,
  TeamRecord,
} from "@shared/api";

const TIMEZONE = "America/Sao_Paulo";

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

/** Serializa datas para texto ISO */
export function serialize<T extends Record<string, unknown>>(row: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out as { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };
}

// ---------- Mensalidades ----------

export function dueStatus(due: Pick<Due, "paidAt" | "dueDate">): DueStatus {
  if (due.paidAt) return "pago";
  return due.dueDate < todayISO() ? "vencido" : "pendente";
}

export function toDueDTO(due: Due, memberName: string): DueDTO {
  const { pixQrCode: _q, pixQrBase64: _b, mpPaymentId: _m, ...rest } = due;
  return { ...serialize(rest), status: dueStatus(due), memberName };
}

export function summarizeDues(list: DueDTO[]): DuesSummary {
  const open = list
    .filter((d) => d.status !== "pago")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const openAmount = open.reduce((sum, d) => sum + d.amount, 0);
  if (list.length === 0) return { status: "sem_cobranca", next: null, openCount: 0, openAmount: 0 };
  if (open.length === 0) return { status: "pago", next: null, openCount: 0, openAmount: 0 };
  const status: DueStatus = open.some((d) => d.status === "vencido") ? "vencido" : "pendente";
  return { status, next: open[0], openCount: open.length, openAmount };
}

// ---------- Jogos ----------

/** Completa uma lista de jogos com as presenças confirmadas. */
export async function toGameDTOs(list: Game[], viewerId: number): Promise<GameDTO[]> {
  if (list.length === 0) return [];
  const gameIds = list.map((g) => g.id);

  const counts = await db
    .select({
      gameId: attendances.gameId,
      status: attendances.status,
      total: sql<number>`count(*)::int`,
    })
    .from(attendances)
    .where(inArray(attendances.gameId, gameIds))
    .groupBy(attendances.gameId, attendances.status);

  const mine = await db
    .select({ gameId: attendances.gameId, status: attendances.status })
    .from(attendances)
    .where(and(inArray(attendances.gameId, gameIds), eq(attendances.userId, viewerId)));
  const mineById = new Map(mine.map((m) => [m.gameId, m.status]));

  const lineupRows = await db
    .select({
      gameId: gamePlayers.gameId,
      userId: gamePlayers.userId,
      side: gamePlayers.side,
      goals: gamePlayers.goals,
      assists: gamePlayers.assists,
      name: users.name,
      avatarUrl: users.avatarUrl,
      nickname: memberships.nickname,
    })
    .from(gamePlayers)
    .innerJoin(users, eq(users.id, gamePlayers.userId))
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .leftJoin(memberships, and(eq(memberships.userId, gamePlayers.userId), eq(memberships.clubId, games.clubId)))
    .where(inArray(gamePlayers.gameId, gameIds));

  const matchRows = await db
    .select()
    .from(gameMatches)
    .where(inArray(gameMatches.gameId, gameIds))
    .orderBy(gameMatches.position, gameMatches.id);

  return list.map((g) => {
    const countFor = (status: string) =>
      counts.find((c) => c.gameId === g.id && c.status === status)?.total ?? 0;
    return {
      ...serialize(g),
      kind: g.kind === "racha" ? "racha" : g.kind === "torneio" ? "torneio" : "externo",
      opponentName: g.kind === "externo" ? (g.opponentName ?? "Adversário") : g.opponentName,
      teams: g.teams ?? [],
      matches: matchRows
        .filter((m) => m.gameId === g.id)
        .map((m) => ({
          id: m.id,
          homeSide: m.homeSide as Side,
          awaySide: m.awaySide as Side,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })),
      lineup: lineupRows
        .filter((l) => l.gameId === g.id)
        .map(({ gameId: _g, side, ...l }) => ({ ...l, side: side as Side }))
        .sort((a, b) => a.side.localeCompare(b.side) || a.name.localeCompare(b.name)),
      attendance: {
        confirmed: countFor("confirmado"),
        absent: countFor("ausente"),
        mine: (mineById.get(g.id) as "confirmado" | "ausente" | undefined) ?? null,
      },
    };
  });
}

export function emptyRecord(): TeamRecord {
  return { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };
}

/** Campanha do clube contra adversários de fora (rachas internos não contam) */
export async function clubRecord(clubId: number): Promise<TeamRecord> {
  const finished = await db
    .select()
    .from(games)
    .where(and(eq(games.clubId, clubId), eq(games.status, "finalizado"), eq(games.kind, "externo")));
  const r = emptyRecord();
  for (const g of finished) {
    if (g.teamScore == null || g.opponentScore == null) continue;
    r.played += 1;
    r.goalsFor += g.teamScore;
    r.goalsAgainst += g.opponentScore;
    if (g.teamScore > g.opponentScore) r.wins += 1;
    else if (g.teamScore === g.opponentScore) r.draws += 1;
    else r.losses += 1;
  }
  return r;
}

/** Nomes dos usuários por id (para montar listas) */
export async function userNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, unique));
  return new Map(rows.map((r) => [r.id, r.name]));
}
