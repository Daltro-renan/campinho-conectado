/**
 * Criptografia de segredos guardados no banco (ex.: token do Mercado Pago do clube).
 * Usa AES-256-GCM com uma chave derivada do JWT_SECRET (ou de ENCRYPTION_KEY, se definida).
 * Atenção: trocar esse segredo invalida os tokens já salvos — os clubes reconectam.
 */
import crypto from "crypto";
import { env } from "../env";

const key = crypto
  .createHash("sha256")
  .update(`campinho:secrets:${process.env.ENCRYPTION_KEY || env.jwtSecret}`)
  .digest();

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string): string | null {
  try {
    const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
