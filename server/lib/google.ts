/** Verificação do ID token do "Entrar com Google". */
import { env } from "../env";
import { badRequest, unauthorized } from "./http";

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

/**
 * Valida o token no próprio Google (endpoint tokeninfo) e confere se ele foi
 * emitido para o nosso app (aud = GOOGLE_CLIENT_ID).
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.googleClientId) throw badRequest("Login com Google não está configurado neste servidor");

  let res: Response;
  try {
    res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  } catch {
    throw unauthorized("Não foi possível falar com o Google. Tente novamente.");
  }
  if (!res.ok) throw unauthorized("Login com Google inválido. Tente novamente.");

  const info = (await res.json()) as Record<string, string | undefined>;
  const issuerOk = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
  const expired = Number(info.exp) * 1000 < Date.now();
  if (info.aud !== env.googleClientId || !issuerOk || expired || !info.sub || !info.email) {
    throw unauthorized("Login com Google inválido. Tente novamente.");
  }
  if (info.email_verified !== "true") {
    throw unauthorized("Seu e-mail do Google ainda não foi verificado.");
  }
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    name: info.name || info.email.split("@")[0],
    picture: info.picture || null,
  };
}
