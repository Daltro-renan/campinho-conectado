import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";
import { env } from "./env";

const client = postgres(env.databaseUrl, {
  // Bancos na nuvem (Neon, Render, Supabase) exigem SSL; localmente não.
  // Para desligar o SSL em outro caso, adicione ?sslmode=disable na DATABASE_URL.
  ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(env.databaseUrl) ? false : "require",
  max: 10,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
