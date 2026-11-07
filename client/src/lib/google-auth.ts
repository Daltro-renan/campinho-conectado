/**
 * "Entrar com Google" — funciona no site e no app Android com o mesmo código
 * (plugin @capgo/capacitor-social-login). O ID do cliente vem do servidor (/api/config),
 * então não é preciso gerar um app novo para trocar de configuração.
 */
import { SocialLogin } from "@capgo/capacitor-social-login";
import type { AppConfig } from "@shared/api";
import { api } from "./api";

let ready: Promise<boolean> | null = null;

async function initialize(clientId: string): Promise<boolean> {
  await SocialLogin.initialize({ google: { webClientId: clientId, mode: "online" } });
  return true;
}

export async function fetchConfig(): Promise<AppConfig> {
  return api.get<AppConfig>("/config");
}

/** Prepara o login do Google com antecedência (o script do Google precisa carregar antes do clique) */
export function prepareGoogle(clientId: string) {
  ready ??= initialize(clientId).catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

export class GoogleCancelled extends Error {}

/** Abre a janela do Google e devolve o ID token para o servidor validar */
export async function googleIdToken(clientId: string): Promise<string> {
  await prepareGoogle(clientId);
  try {
    const res = await SocialLogin.login({ provider: "google", options: {} });
    const result = res.result as { idToken?: string | null };
    if (!result.idToken) throw new Error("O Google não devolveu a identificação. Tente novamente.");
    return result.idToken;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes("cancel") || msg.includes("closed") || msg.includes("dismiss")) throw new GoogleCancelled();
    throw e;
  }
}
