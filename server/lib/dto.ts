/** Monta os objetos que a API devolve a partir das linhas do banco. */
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { attendances, games, teams, users, type Due, type Game, type Team } from "@shared/schema";
import type {
  DueDTO,
  DueStatus,
  DuesSummary,
  GameDTO,
  TeamRecord,
  TeamSummary,
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

const teamSummary = (t: Team): TeamSummary => ({
  id: t.id,
  name: t.name,
  abbreviation: t.abbreviation,
  colorPrimary: t.colorPrimary,
  colorSecondary: t.colorSecondary,
});

/** Completa uma lista de jogos com os dados dos times e das presenças. */
export async function toGameDTOs(list: Game[], viewerId: number): Promise<GameDTO[]> {
  if (list.length === 0) return [];

  const teamIds = [
    ...new Set(list.flatMap((g) => [g.teamId, g.opponentTeamId]).filter((id): id is number => !!id)),
  ];
  const teamRows = await db.select().from(teams).where(inArray(teams.id, teamIds));
  const teamById = new Map(teamRows.map((t) => [t.id, t]));

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

  return list.map((g) => {
    const team = teamById.get(g.teamId);
    const opponent = g.opponentTeamId ? teamById.get(g.opponentTeamId) : undefined;
    const countFor = (status: string) =>
      counts.find((c) => c.gameId === g.id && c.status === status)?.total ?? 0;
    return {
      ...serialize(g),
      team: team
        ? teamSummary(team)
        : { id: g.teamId, name: "Time removido", abbreviation: "—", colorPrimary: "#666666", colorSecondary: "#FFFFFF" },
      opponentTeam: opponent ? teamSummary(opponent) : null,
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

/** Soma vitórias/empates/derrotas dos jogos finalizados, por time. */
export async function teamRecords(clubId: number): Promise<Map<number, TeamRecord>> {
  const finished = await db
    .select()
    .from(games)
    .where(and(eq(games.clubId, clubId), eq(games.status, "finalizado")));

  const records = new Map<number, TeamRecord>();
  const add = (teamId: number, gf: number, ga: number) => {
    const r = records.get(teamId) ?? emptyRecord();
    r.played += 1;
    r.goalsFor += gf;
    r.goalsAgainst += ga;
    if (gf > ga) r.wins += 1;
    else if (gf === ga) r.draws += 1;
    else r.losses += 1;
    records.set(teamId, r);
  };

  for (const g of finished) {
    if (g.teamScore == null || g.opponentScore == null) continue;
    add(g.teamId, g.teamScore, g.opponentScore);
    // Jogo interno: conta também para o time adversário do clube
    if (g.opponentTeamId) add(g.opponentTeamId, g.opponentScore, g.teamScore);
  }
  return records;
}

export function sumRecords(list: Iterable<TeamRecord>): TeamRecord {
  const total = emptyRecord();
  for (const r of list) {
    total.played += r.played;
    total.wins += r.wins;
    total.draws += r.draws;
    total.losses += r.losses;
    total.goalsFor += r.goalsFor;
    total.goalsAgainst += r.goalsAgainst;
  }
  return total;
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
