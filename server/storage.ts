import type {
  User, InsertUser, PublicUser,
  Team, InsertTeam,
  Player, InsertPlayer,
  Game, InsertGame,
  News, InsertNews,
  Payment, InsertPayment
} from "@shared/schema";
import { db } from "./db";
import { users, teams, players, games, news, payments } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  createUser(user: InsertUser): Promise<PublicUser>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<PublicUser | undefined>;
  
  getTeams(): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | undefined>;
  createTeam(team: Partial<InsertTeam>): Promise<Team>;
  updateTeam(id: number, team: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<void>;
  
  getPlayers(): Promise<Player[]>;
  getPlayersByTeam(teamId: number): Promise<Player[]>;
  getPlayerById(id: number): Promise<Player | undefined>;
  createPlayer(player: Partial<InsertPlayer>): Promise<Player>;
  updatePlayer(id: number, player: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<void>;
  
  getGames(): Promise<Game[]>;
  getUpcomingGames(): Promise<Game[]>;
  getGameById(id: number): Promise<Game | undefined>;
  createGame(game: Partial<InsertGame>): Promise<Game>;
  updateGame(id: number, game: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: number): Promise<void>;
  
  getNews(): Promise<News[]>;
  getPublishedNews(): Promise<News[]>;
  getNewsById(id: number): Promise<News | undefined>;
  createNews(newsItem: Partial<InsertNews>): Promise<News>;
  updateNews(id: number, newsItem: Partial<News>): Promise<News | undefined>;
  deleteNews(id: number): Promise<void>;
  
  getPayments(): Promise<Payment[]>;
  getPaymentsByPlayer(playerId: number): Promise<Payment[]>;
  getPaymentsByStatus(status: string): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  createPayment(payment: Partial<InsertPayment>): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;
}

class DbStorage implements IStorage {
  async createUser(userData: InsertUser): Promise<PublicUser> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();

    const { password, ...publicUser } = user;
    return publicUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<PublicUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    const { password, ...publicUser } = user;
    return publicUser;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(teamData: Partial<InsertTeam>): Promise<Team> {
    const [team] = await db.insert(teams).values(teamData as any).returning();
    return team;
  }

  async updateTeam(id: number, teamData: Partial<Team>): Promise<Team | undefined> {
    const [team] = await db.update(teams).set(teamData).where(eq(teams.id, id)).returning();
    return team;
  }

  async deleteTeam(id: number): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async getPlayersByTeam(teamId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.teamId, teamId));
  }

  async getPlayerById(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(playerData: Partial<InsertPlayer>): Promise<Player> {
    const [player] = await db.insert(players).values(playerData as any).returning();
    return player;
  }

  async updatePlayer(id: number, playerData: Partial<Player>): Promise<Player | undefined> {
    const [player] = await db.update(players).set(playerData).where(eq(players.id, id)).returning();
    return player;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  async getGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(desc(games.gameDate));
  }

  async getUpcomingGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(games.gameDate).limit(5);
  }

  async getGameById(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async createGame(gameData: Partial<InsertGame>): Promise<Game> {
    const [game] = await db.insert(games).values(gameData as any).returning();
    return game;
  }

  async updateGame(id: number, gameData: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db.update(games).set(gameData).where(eq(games.id, id)).returning();
    return game;
  }

  async deleteGame(id: number): Promise<void> {
    await db.delete(games).where(eq(games.id, id));
  }

  async getNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async getPublishedNews(): Promise<News[]> {
    return await db.select().from(news).where(eq(news.published, true)).orderBy(desc(news.createdAt));
  }

  async getNewsById(id: number): Promise<News | undefined> {
    const [newsItem] = await db.select().from(news).where(eq(news.id, id));
    return newsItem;
  }

  async createNews(newsData: Partial<InsertNews>): Promise<News> {
    const [newsItem] = await db.insert(news).values(newsData as any).returning();
    return newsItem;
  }

  async updateNews(id: number, newsData: Partial<News>): Promise<News | undefined> {
    const [newsItem] = await db.update(news).set(newsData).where(eq(news.id, id)).returning();
    return newsItem;
  }

  async deleteNews(id: number): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.dueDate));
  }

  async getPaymentsByPlayer(playerId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.playerId, playerId)).orderBy(desc(payments.dueDate));
  }

  async getPaymentsByStatus(status: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.status, status)).orderBy(desc(payments.dueDate));
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(paymentData: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData as any).returning();
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const [payment] = await db.update(payments).set(paymentData).where(eq(payments.id, id)).returning();
    return payment;
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }
}

export const storage: IStorage = new DbStorage();
