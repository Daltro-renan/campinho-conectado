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
