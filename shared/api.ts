/**
 * Formatos das respostas da API — usados pelo servidor ao montar o JSON
 * e pelo app ao ler. Datas chegam como texto ISO no JSON.
 */
import type { Role, Channel } from "./roles";
import type { User, Club, Game, Due, Notice } from "./schema";
import type { Side } from "./validation";
export type { Side };

type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type PublicUser = Serialized<Omit<User, "passwordHash" | "googleId" | "avatarData">> & {
  hasPassword: boolean;
  googleLinked: boolean;
};

export type AuthResponse = { token: string; user: PublicUser };

export type ClubDTO = Serialized<Omit<Club, "mpAccessTokenEnc" | "calendarToken">>;

/**
 * Clube do qual o usuário participa, com o cargo dele.
 * O código de convite só vem para quem pode gerenciar associados.
 */
export type MyClub = Omit<ClubDTO, "inviteCode"> & {
  inviteCode: string | null;
  role: Role;
  memberCount: number;
  /** O clube aceita pagamento online pelo Mercado Pago */
  onlinePayments: boolean;
  /** Link da agenda do clube (.ics) para assinar no Google Agenda */
  calendarUrl: string;
};

/** Configuração pública do servidor, lida pelo app ao abrir */
export type AppConfig = { googleClientId: string | null };

export type PixCharge = {
  dueId: number;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string | null;
  amount: number;
};

/** Associado = jogador do elenco do clube */
export type MemberDTO = {
  id: number;
  userId: number;
  role: Role;
  feeExempt: boolean;
  joinedAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  nickname: string | null;
  position: string | null;
  shirtNumber: number | null;
  playerStatus: string;
  isCaptain: boolean;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  gamesPlayed: number;
};

export type TeamRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type LineupPlayer = {
  userId: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  side: Side;
  goals: number;
  assists: number;
};

export type GameKind = "racha" | "torneio" | "externo";

export type MatchDTO = { id: number; homeSide: Side; awaySide: Side; homeScore: number; awayScore: number };

/** Linha da classificação de um torneio */
export type StandingRow = {
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

export type GameDTO = Omit<Serialized<Game>, "teams"> & {
  kind: GameKind;
  teams: string[];
  matches: MatchDTO[];
  lineup: LineupPlayer[];
  attendance: { confirmed: number; absent: number; mine: "confirmado" | "ausente" | null };
};

export type AttendeeDTO = { userId: number; name: string; avatarUrl: string | null; status: string };

export type DueStatus = "pago" | "pendente" | "vencido";

export type DueDTO = Serialized<Omit<Due, "pixQrCode" | "pixQrBase64" | "mpPaymentId">> & {
  status: DueStatus;
  memberName: string;
};

export type DuesSummary = {
  status: DueStatus | "sem_cobranca";
  /** Mensalidade em aberto mais antiga (ou a próxima) */
  next: DueDTO | null;
  openCount: number;
  openAmount: number;
};

export type FinanceOverview = {
  referenceMonth: string;
  expected: number;
  received: number;
  paidCount: number;
  openCount: number;
  overdueCount: number;
};

export type MessageDTO = {
  id: number;
  channel: Channel;
  content: string;
  createdAt: string;
  author: { id: number; name: string; avatarUrl: string | null; role: Role | null } | null;
};

export type NoticeDTO = Serialized<Notice> & { authorName: string | null };

export type ScorerDTO = {
  id: number;
  name: string;
  nickname: string | null;
  position: string | null;
  avatarUrl: string | null;
  goals: number;
  assists: number;
};

/** Associado com mensalidade vencida (página de inadimplência da diretoria) */
export type OverdueMemberDTO = {
  memberId: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string;
  overdueCount: number;
  overdueAmount: number;
  oldestDueDate: string;
  daysLate: number;
  dues: DueDTO[];
};

export type OverdueReport = {
  members: OverdueMemberDTO[];
  totalAmount: number;
  memberCount: number;
  /** Associados em dia / total cobrado, para a taxa de adimplência */
  payingMembers: number;
};

export type OverviewDTO = {
  club: MyClub;
  nextGame: GameDTO | null;
  lastGame: GameDTO | null;
  dues: DuesSummary;
  record: TeamRecord;
  memberCount: number;
  /** Só para quem cuida das finanças: resumo da inadimplência */
  overdue: { memberCount: number; totalAmount: number } | null;
  topScorers: ScorerDTO[];
  notices: NoticeDTO[];
};

/** Linha do ranking do clube (contado pelas escalações dos jogos finalizados) */
export type RankingEntry = {
  memberId: number;
  userId: number;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  position: string | null;
  shirtNumber: number | null;
  goals: number;
  assists: number;
  /** Jogos finalizados em que foi escalado (+ jogos lançados à mão, em "Todas") */
  games: number;
  wins: number;
  draws: number;
  losses: number;
  yellowCards: number;
  redCards: number;
};

export type RankingResponse = {
  /** null = todas as temporadas */
  season: number | null;
  seasons: number[];
  entries: RankingEntry[];
};

/** Jogo do qual o associado participou, do ponto de vista dele */
export type PlayerGameDTO = {
  gameId: number;
  startsAt: string;
  kind: GameKind;
  /** "Time A x Time B" ou "Clube x Adversário" */
  title: string;
  side: Side;
  myScore: number;
  theirScore: number;
  outcome: "V" | "E" | "D";
  goals: number;
  assists: number;
};

// ---------- Caixa ----------

/** Movimento do caixa. Mensalidades pagas aparecem agrupadas por mês (source "mensalidades"). */
export type CashEntryDTO = {
  id: number | null;
  source: "lancamento" | "mensalidades";
  type: "entrada" | "saida";
  amount: number;
  category: string;
  description: string;
  date: string;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CashReport = {
  month: string;
  /** Saldo atual (todos os meses, com o saldo inicial) */
  balance: number;
  opening: number;
  monthIn: number;
  monthOut: number;
  /** Saldo no fim do mês escolhido */
  monthEndBalance: number;
  byCategory: { type: "entrada" | "saida"; category: string; amount: number }[];
  entries: CashEntryDTO[];
};
