import type {
  User, InsertUser, PublicUser,
  Team, InsertTeam,
  Player, InsertPlayer,
  Game, InsertGame,
  News, InsertNews,
  Payment, InsertPayment,
  SquadTeam, InsertSquadTeam,
  Message, InsertMessage,
  Club, InsertClub,
  Membership, InsertMembership
} from "@shared/schema";
import { db } from "./db";
import { users, teams, players, games, news, payments, squadTeams, messages, clubs, memberships } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  createUser(user: InsertUser): Promise<PublicUser>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<PublicUser | undefined>;
  updateUser(id: number, user: Partial<User>): Promise<PublicUser | undefined>;
  
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
  
  getSquadTeams(): Promise<SquadTeam[]>;
  getSquadTeamsByClub(clubId: number): Promise<SquadTeam[]>;
  getSquadTeamById(id: number): Promise<SquadTeam | undefined>;
  createSquadTeam(squadTeam: Partial<InsertSquadTeam>): Promise<SquadTeam>;
  updateSquadTeam(id: number, squadTeam: Partial<SquadTeam>): Promise<SquadTeam | undefined>;
  deleteSquadTeam(id: number): Promise<void>;
  addPlayerToSquadTeam(squadTeamId: number, playerId: number): Promise<Player | undefined>;
  removePlayerFromSquadTeam(playerId: number): Promise<void>;
  getPlayersBySquadTeam(squadTeamId: number): Promise<Player[]>;
  
  getMessages(clubId: number, channel: string): Promise<Message[]>;
  getMessageById(id: number): Promise<Message | undefined>;
  createMessage(message: Partial<InsertMessage>): Promise<Message>;
  deleteMessage(id: number): Promise<void>;
  
  getClubs(): Promise<Club[]>;
  getClubById(id: number): Promise<Club | undefined>;
  getClubsByUser(userId: number): Promise<Club[]>;
  createClub(club: Partial<InsertClub>): Promise<Club>;
  updateClub(id: number, club: Partial<Club>): Promise<Club | undefined>;
  deleteClub(id: number): Promise<void>;
  
  getMembershipsByUser(userId: number): Promise<Membership[]>;
  getMembershipsByClub(clubId: number): Promise<Membership[]>;
  getMembership(userId: number, clubId: number): Promise<Membership | undefined>;
  createMembership(membership: Partial<InsertMembership>): Promise<Membership>;
  updateMembership(id: number, membership: Partial<Membership>): Promise<Membership | undefined>;
  deleteMembership(id: number): Promise<void>;
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

  async updateUser(id: number, userData: Partial<User>): Promise<PublicUser | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
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

  async getSquadTeams(): Promise<SquadTeam[]> {
    return await db.select().from(squadTeams).orderBy(desc(squadTeams.createdAt));
  }

  async getSquadTeamsByClub(clubId: number): Promise<SquadTeam[]> {
    return await db.select().from(squadTeams).where(eq(squadTeams.clubId, clubId));
  }

  async getSquadTeamById(id: number): Promise<SquadTeam | undefined> {
    const [squadTeam] = await db.select().from(squadTeams).where(eq(squadTeams.id, id));
    return squadTeam;
  }

  async createSquadTeam(squadTeamData: Partial<InsertSquadTeam>): Promise<SquadTeam> {
    const [squadTeam] = await db.insert(squadTeams).values(squadTeamData as any).returning();
    return squadTeam;
  }

  async updateSquadTeam(id: number, squadTeamData: Partial<SquadTeam>): Promise<SquadTeam | undefined> {
    const [squadTeam] = await db.update(squadTeams).set(squadTeamData).where(eq(squadTeams.id, id)).returning();
    return squadTeam;
  }

  async deleteSquadTeam(id: number): Promise<void> {
    await db.delete(squadTeams).where(eq(squadTeams.id, id));
  }

  async addPlayerToSquadTeam(squadTeamId: number, playerId: number): Promise<Player | undefined> {
    const [player] = await db.update(players).set({ squadTeamId }).where(eq(players.id, playerId)).returning();
    return player;
  }

  async removePlayerFromSquadTeam(playerId: number): Promise<void> {
    await db.update(players).set({ squadTeamId: null }).where(eq(players.id, playerId));
  }

  async getPlayersBySquadTeam(squadTeamId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.squadTeamId, squadTeamId));
  }

  async getMessages(clubId: number, channel: string): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(and(eq(messages.clubId, clubId), eq(messages.channel, channel)))
      .orderBy(desc(messages.createdAt))
      .limit(100);
  }

  async getMessageById(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async createMessage(messageData: Partial<InsertMessage>): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData as any).returning();
    return message;
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getClubs(): Promise<Club[]> {
    return await db.select().from(clubs).orderBy(desc(clubs.createdAt));
  }

  async getClubById(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async getClubsByUser(userId: number): Promise<Club[]> {
    const userMemberships = await db.select()
      .from(memberships)
      .where(eq(memberships.userId, userId));
    
    const clubIds = userMemberships.map(m => m.clubId);
    if (clubIds.length === 0) return [];
    
    // Use a more direct join approach
    const results = await db.select({
      id: clubs.id,
      name: clubs.name,
      description: clubs.description,
      logo: clubs.logo,
      foundedDate: clubs.foundedDate,
      colors: clubs.colors,
      createdBy: clubs.createdBy,
      createdAt: clubs.createdAt,
    })
      .from(clubs)
      .innerJoin(memberships, eq(clubs.id, memberships.clubId))
      .where(eq(memberships.userId, userId));
    
    return results;
  }

  async createClub(clubData: Partial<InsertClub>): Promise<Club> {
    const [club] = await db.insert(clubs).values(clubData as any).returning();
    return club;
  }

  async updateClub(id: number, clubData: Partial<Club>): Promise<Club | undefined> {
    const [club] = await db.update(clubs).set(clubData).where(eq(clubs.id, id)).returning();
    return club;
  }

  async deleteClub(id: number): Promise<void> {
    await db.delete(clubs).where(eq(clubs.id, id));
  }

  async getMembershipsByUser(userId: number): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.userId, userId));
  }

  async getMembershipsByClub(clubId: number): Promise<Membership[]> {
    return await db.select().from(memberships).where(eq(memberships.clubId, clubId));
  }

  async getMembership(userId: number, clubId: number): Promise<Membership | undefined> {
    const [membership] = await db.select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.clubId, clubId)));
    return membership;
  }

  async createMembership(membershipData: Partial<InsertMembership>): Promise<Membership> {
    const [membership] = await db.insert(memberships).values(membershipData as any).returning();
    return membership;
  }

  async updateMembership(id: number, membershipData: Partial<Membership>): Promise<Membership | undefined> {
    const [membership] = await db.update(memberships).set(membershipData).where(eq(memberships.id, id)).returning();
    return membership;
  }

  async deleteMembership(id: number): Promise<void> {
    await db.delete(memberships).where(eq(memberships.id, id));
  }
}

export const storage: IStorage = new DbStorage();
