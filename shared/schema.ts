import { pgTable, text, timestamp, serial, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  role: text("role").notNull().default("player"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo"),
  founded: date("founded"),
  colors: text("colors"),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  teamId: integer("team_id").references(() => teams.id),
  name: text("name").notNull(),
  position: text("position").notNull(),
  jerseyNumber: integer("jersey_number"),
  photo: text("photo"),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  homeTeamId: integer("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: integer("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score").default(0),
  awayScore: integer("away_score").default(0),
  gameDate: timestamp("game_date").notNull(),
  location: text("location"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  authorId: integer("author_id").references(() => users.id),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => players.id).notNull(),
  amount: integer("amount").notNull(),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  status: text("status").notNull().default("pending"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = z.object({
  name: z.string().min(1),
  logo: z.string().optional(),
  founded: z.string().optional(),
  colors: z.string().optional(),
}).strict();

export const insertPlayerSchema = z.object({
  userId: z.number().optional(),
  teamId: z.number().optional(),
  name: z.string().min(1),
  position: z.string().min(1),
  jerseyNumber: z.number().optional(),
  photo: z.string().optional(),
}).strict();

export const insertGameSchema = z.object({
  homeTeamId: z.number(),
  awayTeamId: z.number(),
  gameDate: z.string(),
  location: z.string().optional(),
}).strict();

export const insertNewsSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  image: z.string().optional(),
  authorId: z.number().optional(),
}).strict();

export const insertPaymentSchema = z.object({
  playerId: z.number(),
  amount: z.number(),
  dueDate: z.string(),
  paidDate: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  month: z.number().min(1).max(12),
  year: z.number(),
  notes: z.string().optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type PublicUser = Omit<User, "password">;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
