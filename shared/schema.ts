/**
 * Banco de dados do Campinho Conectado (PostgreSQL + Drizzle ORM).
 *
 * Tudo pertence a um clube: um usuário pode participar de vários clubes,
 * com um cargo diferente em cada um (tabela `memberships`).
 */
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  /** Vazio em contas criadas só com o Google */
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  /** Foto enviada pelo app (data URL, ~30 KB). Servida em /api/avatars/:id */
  avatarData: text("avatar_data"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  city: text("city"),
  state: text("state"),
  foundedYear: integer("founded_year"),
  description: text("description"),
  /** Logo da associação: imagem (data URL, até ~300 KB) recortada no formato do escudo */
  logoUrl: text("logo_url"),
  /** Formato do escudo: classico | moderno | pontudo | redondo | hexagono */
  crestShape: text("crest_shape").notNull().default("classico"),
  colorPrimary: text("color_primary").notNull().default("#0E4D2E"),
  colorSecondary: text("color_secondary").notNull().default("#F5F7F2"),
  /** Valor da mensalidade em centavos (R$ 50,00 = 5000) */
  monthlyFee: integer("monthly_fee").notNull().default(0),
  /** Dia do mês em que a mensalidade vence (1 a 28) */
  dueDay: integer("due_day").notNull().default(10),
  /** Chave PIX exibida para os associados pagarem */
  pixKey: text("pix_key"),
  /** Regras/estatuto da associação (texto livre, visível a todos os associados) */
  rules: text("rules"),
  /** Saldo do caixa antes de começar a usar o app, em centavos */
  cashOpening: integer("cash_opening").notNull().default(0),
  inviteCode: text("invite_code").notNull().unique(),
  /** Token secreto do link de agenda (.ics) do clube */
  calendarToken: text("calendar_token").unique(),
  /** Access Token do Mercado Pago do clube, criptografado (nunca sai do servidor) */
  mpAccessTokenEnc: text("mp_access_token_enc"),
  /** Nome/e-mail da conta Mercado Pago conectada, para exibição */
  mpAccountLabel: text("mp_account_label"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("jogador"),
    /** Associados isentos não recebem mensalidade */
    feeExempt: boolean("fee_exempt").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),

    // ---- Elenco: todo associado faz parte do time do clube ----
    nickname: text("nickname"),
    position: text("position"),
    shirtNumber: integer("shirt_number"),
    /** ativo | lesionado | suspenso | inativo */
    playerStatus: text("player_status").notNull().default("ativo"),
    isCaptain: boolean("is_captain").notNull().default(false),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    yellowCards: integer("yellow_cards").notNull().default(0),
    redCards: integer("red_cards").notNull().default(0),
    gamesPlayed: integer("games_played").notNull().default(0),
  },
  (t) => [uniqueIndex("memberships_club_user_idx").on(t.clubId, t.userId)],
);

/**
 * Jogos do clube.
 * - kind "racha": jogo interno, Time A x Time B, com a escalação de cada lado
 *   (teamScore = placar do Time A, opponentScore = placar do Time B).
 * - kind "externo": o clube contra um adversário de fora (teamScore = clube).
 */
export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("externo"),
    opponentName: text("opponent_name"),
    sideAName: text("side_a_name"),
    sideBName: text("side_b_name"),
    /** Torneio: nomes dos times (posição 0 = "A", 1 = "B", ...) */
    teams: jsonb("teams").$type<string[]>(),
    isHome: boolean("is_home").notNull().default(true),
    competition: text("competition").notNull().default("amistoso"),
    competitionName: text("competition_name"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    location: text("location"),
    status: text("status").notNull().default("agendado"),
    teamScore: integer("team_score"),
    opponentScore: integer("opponent_score"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("games_club_starts_idx").on(t.clubId, t.startsAt)],
);

/**
 * Escalação: quem jogou em cada lado e os gols/assistências de cada um no jogo.
 * É daqui que saem jogos, vitórias, gols e assistências do ranking da temporada.
 */
export const gamePlayers = pgTable(
  "game_players",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** "A" ou "B" (no jogo contra adversário, todos do clube ficam no "A") */
    side: text("side").notNull(),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
  },
  (t) => [uniqueIndex("game_players_game_user_idx").on(t.gameId, t.userId), index("game_players_user_idx").on(t.userId)],
);

/**
 * Caixa do clube: entradas e saídas lançadas pela diretoria.
 * As mensalidades pagas entram no caixa sozinhas (vêm da tabela dues).
 */
export const cashEntries = pgTable(
  "cash_entries",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    /** "entrada" ou "saida" */
    type: text("type").notNull(),
    /** Valor em centavos, sempre positivo */
    amount: integer("amount").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    /** Data do movimento (AAAA-MM-DD) */
    date: date("date").notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("cash_entries_club_date_idx").on(t.clubId, t.date)],
);

/** Partidas de um torneio (time da casa x visitante, pelas letras dos times) */
export const gameMatches = pgTable(
  "game_matches",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    homeSide: text("home_side").notNull(),
    awaySide: text("away_side").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
  },
  (t) => [index("game_matches_game_idx").on(t.gameId)],
);

/** Confirmação de presença dos associados em cada jogo */
export const attendances = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id").notNull().references(() => games.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("attendances_game_user_idx").on(t.gameId, t.userId)],
);

/** Mensalidades: uma por associado por mês de referência */
export const dues = pgTable(
  "dues",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Mês de referência no formato AAAA-MM */
    referenceMonth: text("reference_month").notNull(),
    /** Valor em centavos */
    amount: integer("amount").notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    method: text("method"),
    notes: text("notes"),
    /** Último pagamento PIX gerado no Mercado Pago para esta mensalidade */
    mpPaymentId: text("mp_payment_id"),
    pixQrCode: text("pix_qr_code"),
    pixQrBase64: text("pix_qr_base64"),
    pixExpiresAt: timestamp("pix_expires_at", { withTimezone: true }),
    /** Cobrança excluída pela diretoria: some das listas e não é recriada automaticamente */
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("dues_club_user_month_idx").on(t.clubId, t.userId, t.referenceMonth),
    index("dues_club_idx").on(t.clubId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    channel: text("channel").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("messages_club_channel_idx").on(t.clubId, t.channel, t.id)],
);

/** Mural de avisos da diretoria */
export const notices = pgTable(
  "notices",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notices_club_idx").on(t.clubId)],
);

export type User = typeof users.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type Due = typeof dues.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notice = typeof notices.$inferSelect;
