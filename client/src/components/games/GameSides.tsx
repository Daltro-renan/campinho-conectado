import type { GameDTO } from "@shared/api";
import { ClubTeamCrest, OpponentCrest } from "@/components/TeamCrest";

/** Mandante e visitante na ordem certa (o time do clube pode jogar fora de casa) */
export function gameSides(game: GameDTO) {
  const ours = {
    name: game.team.name,
    crest: (size: number) => (
      <ClubTeamCrest
        abbreviation={game.team.abbreviation}
        colorPrimary={game.team.colorPrimary}
        colorSecondary={game.team.colorSecondary}
        size={size}
      />
    ),
    score: game.teamScore,
  };
  const opponentName = game.opponentTeam?.name ?? game.opponentName ?? "Adversário";
  const theirs = {
    name: opponentName,
    crest: (size: number) =>
      game.opponentTeam ? (
        <ClubTeamCrest
          abbreviation={game.opponentTeam.abbreviation}
          colorPrimary={game.opponentTeam.colorPrimary}
          colorSecondary={game.opponentTeam.colorSecondary}
          size={size}
        />
      ) : (
        <OpponentCrest name={opponentName} size={size} />
      ),
    score: game.opponentScore,
  };
  return game.isHome ? { home: ours, away: theirs } : { home: theirs, away: ours };
}

/** Resultado do ponto de vista do time do clube */
export function gameOutcome(game: GameDTO): "V" | "E" | "D" | null {
  if (game.status !== "finalizado" || game.teamScore == null || game.opponentScore == null) return null;
  if (game.teamScore > game.opponentScore) return "V";
  if (game.teamScore === game.opponentScore) return "E";
  return "D";
}
