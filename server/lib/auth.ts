/** Login por token (JWT) — o app guarda o token e envia em cada requisição. */
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import type { PublicUser } from "@shared/api";
import { env } from "../env";
import { unauthorized } from "./http";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: "30d" });
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, googleId, avatarData: _avatar, ...rest } = user;
  return {
    ...rest,
    createdAt: user.createdAt.toISOString(),
    hasPassword: !!passwordHash,
    googleLinked: !!googleId,
  };
}

/** Exige um usuário logado; carrega o usuário do banco em `req.user`. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let userId: number;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
    userId = Number(payload.sub);
  } catch {
    throw unauthorized("Sua sessão expirou. Entre novamente.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw unauthorized("Conta não encontrada. Entre novamente.");
  req.user = user;
  next();
}

export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}
