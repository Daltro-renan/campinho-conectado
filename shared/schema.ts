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
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
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
  logoUrl: text("logo_url"),
  colorPrimary: text("color_primary").notNull().default("#0E4D2E"),
  colorSecondary: text("color_secondary").notNull().default("#F5F7F2"),
  /** Valor da mensalidade em centavos (R$ 50,00 = 5000) */
  monthlyFee: integer("monthly_fee").notNull().default(0),
  /** Dia do mês em que a mensalidade vence (1 a 28) */
  dueDay: integer("due_day").notNull().default(10),
  /** Chave PIX exibida para os associados pagarem */
  pixKey: text("pix_key"),
  inviteCode: text("invite_code").notNull().unique(),
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
  },
  (t) => [uniqueIndex("memberships_club_user_idx").on(t.clubId, t.userId)],
);

/** Times/categorias do clube (ex.: Principal, Sub-17, Veteranos) */
export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    abbreviation: text("abbreviation").notNull(),
    category: text("category").notNull().default("Principal"),
    colorPrimary: text("color_primary").notNull().default("#0E4D2E"),
    colorSecondary: text("color_secondary").notNull().default("#F5F7F2"),
    description: text("description"),
    coachUserId: integer("coach_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("teams_club_idx").on(t.clubId)],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    /** Associado vinculado a este jogador (opcional) */
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    nickname: text("nickname"),
    position: text("position").notNull(),
    shirtNumber: integer("shirt_number"),
    status: text("status").notNull().default("ativo"),
    isCaptain: boolean("is_captain").notNull().default(false),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    yellowCards: integer("yellow_cards").notNull().default(0),
    redCards: integer("red_cards").notNull().default(0),
    gamesPlayed: integer("games_played").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("players_club_idx").on(t.clubId), index("players_team_idx").on(t.teamId)],
);

/**
 * Jogos de um time do clube. O adversário pode ser outro time do próprio clube
 * (`opponentTeamId`) ou um time de fora (`opponentName`).
 */
export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    clubId: integer("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    opponentTeamId: integer("opponent_team_id").references(() => teams.id, { onDelete: "set null" }),
    opponentName: text("opponent_name"),
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
export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type Due = typeof dues.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notice = typeof notices.$inferSelect;
