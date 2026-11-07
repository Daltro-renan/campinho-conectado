/**
 * Atualizações do banco aplicadas ao iniciar o servidor.
 * Todas são idempotentes (podem rodar várias vezes sem efeito colateral), então
 * bancos antigos ganham as colunas novas mesmo se o "db:push" do build não rodar.
 * Para um banco novo, as tabelas são criadas pelo "npm run db:push".
 */
import { sql } from "drizzle-orm";
import { db } from "./db";
import { log } from "./vite";

const unique = (table: string, name: string, column: string) => `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${name}') THEN
    ALTER TABLE "${table}" ADD CONSTRAINT "${name}" UNIQUE ("${column}");
  END IF;
END $$;`;

const STEPS: string[] = [
  // Login com Google
  `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" text`,
  unique("users", "users_google_id_unique", "google_id"),
  // Agenda, Mercado Pago e logo do clube
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "calendar_token" text`,
  unique("clubs", "clubs_calendar_token_unique", "calendar_token"),
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "mp_access_token_enc" text`,
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "mp_account_label" text`,
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "crest_shape" text NOT NULL DEFAULT 'classico'`,
  // PIX das mensalidades
  `ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "mp_payment_id" text`,
  `ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "pix_qr_code" text`,
  `ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "pix_qr_base64" text`,
  `ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "pix_expires_at" timestamp with time zone`,
  // Foto de perfil enviada pelo app
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_data" text`,
  // Clube = time: dados de jogador passam para o associado
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "nickname" text`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "position" text`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "shirt_number" integer`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "player_status" text NOT NULL DEFAULT 'ativo'`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "is_captain" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "goals" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "assists" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "yellow_cards" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "red_cards" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "games_played" integer NOT NULL DEFAULT 0`,
  // Copia os dados de jogadores antigos que estavam vinculados a um associado
  `DO $$ BEGIN
    IF to_regclass('public.players') IS NOT NULL THEN
      UPDATE "memberships" m SET
        "nickname" = COALESCE(m."nickname", p."nickname"),
        "position" = COALESCE(m."position", p."position"),
        "shirt_number" = COALESCE(m."shirt_number", p."shirt_number"),
        "goals" = GREATEST(m."goals", p."goals"),
        "assists" = GREATEST(m."assists", p."assists"),
        "yellow_cards" = GREATEST(m."yellow_cards", p."yellow_cards"),
        "red_cards" = GREATEST(m."red_cards", p."red_cards"),
        "games_played" = GREATEST(m."games_played", p."games_played")
      FROM "players" p
      WHERE p."user_id" = m."user_id" AND p."club_id" = m."club_id";
    END IF;
  END $$`,
  // Rachas internos (Time A x Time B) e escalação por jogo
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'externo'`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "side_a_name" text`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "side_b_name" text`,
  `CREATE TABLE IF NOT EXISTS "game_players" (
    "id" serial PRIMARY KEY,
    "game_id" integer NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "side" text NOT NULL,
    "goals" integer NOT NULL DEFAULT 0,
    "assists" integer NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "game_players_game_user_idx" ON "game_players" ("game_id", "user_id")`,
  `CREATE INDEX IF NOT EXISTS "game_players_user_idx" ON "game_players" ("user_id")`,
  // Jogos deixam de ter "time": o nome do adversário passa a ser o que vale
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'team_id') THEN
      ALTER TABLE "games" ALTER COLUMN "team_id" DROP NOT NULL;
      IF to_regclass('public.teams') IS NOT NULL THEN
        UPDATE "games" g SET "opponent_name" = t."name"
        FROM "teams" t WHERE g."opponent_name" IS NULL AND t."id" = g."opponent_team_id";
      END IF;
    END IF;
  END $$`,
  `UPDATE "games" SET "opponent_name" = 'Adversário' WHERE "opponent_name" IS NULL AND "kind" = 'externo'`,
  // Regras da associação e torneios com vários times
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "rules" text`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "teams" jsonb`,
  `CREATE TABLE IF NOT EXISTS "game_matches" (
    "id" serial PRIMARY KEY,
    "game_id" integer NOT NULL REFERENCES "games"("id") ON DELETE CASCADE,
    "position" integer NOT NULL DEFAULT 0,
    "home_side" text NOT NULL,
    "away_side" text NOT NULL,
    "home_score" integer NOT NULL,
    "away_score" integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "game_matches_game_idx" ON "game_matches" ("game_id")`,
  // Cobrança excluída vira "cancelada" (a geração automática não a recria)
  `ALTER TABLE "dues" ADD COLUMN IF NOT EXISTS "canceled_at" timestamptz`,
  // Caixa do clube
  `ALTER TABLE "clubs" ADD COLUMN IF NOT EXISTS "cash_opening" integer NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS "cash_entries" (
    "id" serial PRIMARY KEY,
    "club_id" integer NOT NULL REFERENCES "clubs"("id") ON DELETE CASCADE,
    "type" text NOT NULL,
    "amount" integer NOT NULL,
    "category" text NOT NULL,
    "description" text NOT NULL,
    "date" date NOT NULL,
    "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS "cash_entries_club_date_idx" ON "cash_entries" ("club_id", "date")`,
];

export async function migrate() {
  const [{ exists }] = await db.execute<{ exists: boolean }>(
    sql`SELECT to_regclass('public.users') IS NOT NULL AS exists`,
  );
  if (!exists) {
    log("Banco vazio: rode \"npm run db:push\" para criar as tabelas.");
    return;
  }
  for (const step of STEPS) await db.execute(sql.raw(step));
  log("Banco de dados atualizado");
}
