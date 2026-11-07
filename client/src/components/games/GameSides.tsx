import type { GameDTO } from "@shared/api";
import type { MyClub } from "@shared/api";
import { ClubTeamCrest, OpponentCrest } from "@/components/TeamCrest";

type ClubLike = Pick<MyClub, "name" | "abbreviation" | "colorPrimary" | "colorSecondary">;

/** Mandante e visitante na ordem certa (o clube pode jogar fora de casa) */
export function gameSides(game: GameDTO, club: ClubLike) {
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

/** Resultado do ponto de vista do clube */
export function gameOutcome(game: GameDTO): "V" | "E" | "D" | null {
  if (game.status !== "finalizado" || game.teamScore == null || game.opponentScore == null) return null;
  if (game.teamScore > game.opponentScore) return "V";
  if (game.teamScore === game.opponentScore) return "E";
  return "D";
}
