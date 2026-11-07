import type { GameDTO, MyClub, Side } from "@shared/api";
import { SIDES } from "@shared/validation";
import { ClubTeamCrest, OpponentCrest, TeamCrest } from "@/components/TeamCrest";

type ClubLike = Pick<MyClub, "name" | "abbreviation" | "colorPrimary" | "colorSecondary">;

/** Coletes extras para torneio (do Time C em diante) */
const VESTS: { primary: string; secondary: string }[] = [
  { primary: "#1F4FD8", secondary: "#FFFFFF" },
  { primary: "#E8B21E", secondary: "#14202B" },
  { primary: "#D2382A", secondary: "#FFFFFF" },
  { primary: "#7A3FD1", secondary: "#FFFFFF" },
  { primary: "#EF7A1A", secondary: "#14202B" },
  { primary: "#0F9D8F", secondary: "#FFFFFF" },
];

/** Coletes: o Time A usa as cores do clube; o Time B, as invertidas; os demais, coletes coloridos */
export function sideColors(club: ClubLike, side: Side) {
  if (side === "A") return { primary: club.colorPrimary, secondary: club.colorSecondary };
  if (side === "B") return { primary: club.colorSecondary, secondary: club.colorPrimary };
  return VESTS[(SIDES.indexOf(side) - 2) % VESTS.length];
}

export function sideName(game: GameDTO, side: Side) {
  if (game.kind === "torneio") return game.teams[SIDES.indexOf(side)] || `Time ${side}`;
  return side === "A" ? game.sideAName || "Time A" : game.sideBName || "Time B";
}

/** Letras dos lados que existem neste jogo */
export function gameSideList(game: Pick<GameDTO, "kind" | "teams">): Side[] {
  if (game.kind === "torneio") return SIDES.slice(0, game.teams.length) as Side[];
  return game.kind === "racha" ? ["A", "B"] : ["A"];
}

/** Escudo do colete de um lado (racha/torneio) */
export function SideCrest({ club, side, size }: { club: ClubLike; side: Side; size: number }) {
  const c = sideColors(club, side);
  return <TeamCrest abbreviation={side} colorPrimary={c.primary} colorSecondary={c.secondary} size={size} />;
}

/** Mandante e visitante na ordem certa. No racha, Time A x Time B. */
export function gameSides(game: GameDTO, club: ClubLike) {
  if (game.kind !== "externo") {
    const side = (s: Side) => {
      return {
        name: sideName(game, s),
        crest: (size: number) => <SideCrest club={club} side={s} size={size} />,
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
  if (game.kind !== "externo") return null;
  if (game.status !== "finalizado" || game.teamScore == null || game.opponentScore == null) return null;
  if (game.teamScore > game.opponentScore) return "V";
  if (game.teamScore === game.opponentScore) return "E";
  return "D";
}

/** Título curto do jogo, para listas e diálogos */
export function gameTitle(game: GameDTO, club: ClubLike): string {
  if (game.kind === "torneio") return game.competitionName || `Torneio com ${game.teams.length} times`;
  const { home, away } = gameSides(game, club);
  return `${game.kind === "racha" ? "Racha: " : ""}${home.name} x ${away.name}`;
}
