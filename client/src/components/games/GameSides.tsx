import type { GameDTO, MyClub } from "@shared/api";
import { ClubTeamCrest, OpponentCrest, TeamCrest } from "@/components/TeamCrest";

type ClubLike = Pick<MyClub, "name" | "abbreviation" | "colorPrimary" | "colorSecondary">;

/** Coletes: o Time A usa as cores do clube; o Time B, as cores invertidas */
export function sideColors(club: ClubLike, side: "A" | "B") {
  return side === "A"
    ? { primary: club.colorPrimary, secondary: club.colorSecondary }
    : { primary: club.colorSecondary, secondary: club.colorPrimary };
}

export const sideName = (game: GameDTO, side: "A" | "B") =>
  side === "A" ? game.sideAName || "Time A" : game.sideBName || "Time B";

/** Mandante e visitante na ordem certa. No racha, Time A x Time B. */
export function gameSides(game: GameDTO, club: ClubLike) {
  if (game.kind === "racha") {
    const side = (s: "A" | "B") => {
      const c = sideColors(club, s);
      return {
        name: sideName(game, s),
        crest: (size: number) => (
          <TeamCrest abbreviation={s} colorPrimary={c.primary} colorSecondary={c.secondary} size={size} />
        ),
        score: s === "A" ? game.teamScore : game.opponentScore,
      };
    };
    return { home: side("A"), away: side("B") };
  }
  const ours = {
    name: club.name,
    crest: (size: number) => (
      <ClubTeamCrest
        abbreviation={club.abbreviation}
        colorPrimary={club.colorPrimary}
        colorSecondary={club.colorSecondary}
        size={size}
      />
    ),
    score: game.teamScore,
  };
  const theirs = {
    name: game.opponentName ?? "Adversário",
    crest: (size: number) => <OpponentCrest name={game.opponentName ?? "Adversário"} size={size} />,
    score: game.opponentScore,
  };
  return game.isHome ? { home: ours, away: theirs } : { home: theirs, away: ours };
}

/** Resultado do ponto de vista do clube (só para jogo contra adversário) */
export function gameOutcome(game: GameDTO): "V" | "E" | "D" | null {
  if (game.kind === "racha") return null;
  if (game.status !== "finalizado" || game.teamScore == null || game.opponentScore == null) return null;
  if (game.teamScore > game.opponentScore) return "V";
  if (game.teamScore === game.opponentScore) return "E";
  return "D";
}
