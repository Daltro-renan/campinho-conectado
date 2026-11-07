/** Classificação de torneio: 3 pontos por vitória, 1 por empate. */
import type { Side } from "./validation";
import { SIDES } from "./validation";

type MatchLike = { homeSide: string; awaySide: string; homeScore: number; awayScore: number };

export type Standing = {
  side: Side;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export function standings(teams: string[], matches: MatchLike[]): Standing[] {
  const rows: Standing[] = teams.map((name, i) => ({
    side: SIDES[i],
    name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  const bySide = new Map(rows.map((r) => [r.side as string, r]));
  for (const m of matches) {
    const home = bySide.get(m.homeSide);
    const away = bySide.get(m.awaySide);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (m.homeScore < m.awayScore) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }
  return rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.side.localeCompare(b.side),
  );
}

/** Nome do time pela letra (torneio) */
export function teamName(teams: string[] | null | undefined, side: string): string {
  const i = SIDES.indexOf(side as Side);
  return teams?.[i] ?? `Time ${side}`;
}
