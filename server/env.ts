/** Leitura e validação das variáveis de ambiente do servidor. */
import crypto from "crypto";

const isProduction = process.env.NODE_ENV === "production";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `A variável de ambiente ${name} não foi definida. Veja o arquivo .env.example.`,
    );
  }
  return value;
}

function jwtSecret(): string {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (isProduction) required("JWT_SECRET");
  console.warn(
    "[aviso] JWT_SECRET não definido: usando um segredo temporário. Todos terão que entrar de novo quando o servidor reiniciar.",
  );
  return crypto.randomBytes(32).toString("hex");
}

const port = Number(process.env.PORT) || 5000;

export const env = {
  isProduction,
  port,
  host: process.env.HOST || "0.0.0.0",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: jwtSecret(),
  /** ID do cliente OAuth "Aplicativo da Web" do Google (opcional) */
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  /** Endereço público do servidor — o Render preenche RENDER_EXTERNAL_URL sozinho */
  publicUrl: (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`).replace(/\/$/, ""),
};
