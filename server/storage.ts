import type { User, InsertUser, PublicUser } from "@shared/schema";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<PublicUser>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<PublicUser | undefined>;
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
}

export const storage: IStorage = new DbStorage();
