/**
 * Formatos das respostas da API — usados pelo servidor ao montar o JSON
 * e pelo app ao ler. Datas chegam como texto ISO no JSON.
 */
import type { Role, Channel } from "./roles";
import type { User, Club, Team, Player, Game, Due, Notice } from "./schema";

type Serialized<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type PublicUser = Serialized<Omit<User, "passwordHash" | "googleId">> & {
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
};

export type TeamRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type TeamDTO = Serialized<Team> & {
  playerCount: number;
  coachName: string | null;
  record: TeamRecord;
};

export type PlayerDTO = Serialized<Player> & { teamName: string | null };

export type TeamSummary = {
  id: number;
  name: string;
  abbreviation: string;
  colorPrimary: string;
  colorSecondary: string;
};

export type GameDTO = Serialized<Game> & {
  team: TeamSummary;
  opponentTeam: TeamSummary | null;
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
  position: string;
  teamName: string | null;
  goals: number;
  assists: number;
};

export type OverviewDTO = {
  club: MyClub;
  nextGame: GameDTO | null;
  lastGame: GameDTO | null;
  dues: DuesSummary;
  record: TeamRecord;
  memberCount: number;
  teamCount: number;
  topScorers: ScorerDTO[];
  notices: NoticeDTO[];
};
