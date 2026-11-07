/** Conta do usuário: cadastro, login, perfil, senha e exclusão. */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { clubs, memberships, users } from "@shared/schema";
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  googleLoginSchema,
} from "@shared/validation";
import { verifyGoogleIdToken } from "../lib/google";
import { currentUser, requireAuth, signToken, toPublicUser } from "../lib/auth";
import { badRequest, conflict, nonEmpty, parse, rateLimit, unauthorized } from "../lib/http";

export const authRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

authRouter.post("/register", limiter, async (req, res) => {
  const data = parse(registerSchema, req.body);

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email));
  if (existing) throw conflict("Já existe uma conta com esse e-mail");

  const [user] = await db
    .insert(users)
    .values({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
    })
    .returning();

  res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
});

authRouter.post("/login", limiter, async (req, res) => {
  const data = parse(loginSchema, req.body);
  const [user] = await db.select().from(users).where(eq(users.email, data.email));
  if (user && !user.passwordHash) {
    throw unauthorized("Esta conta usa o login com Google. Toque em \"Entrar com Google\".");
  }
  const valid = user?.passwordHash && (await bcrypt.compare(data.password, user.passwordHash));
  if (!user || !valid) throw unauthorized("E-mail ou senha incorretos");
  res.json({ token: signToken(user.id), user: toPublicUser(user) });
});

/**
 * Entrar com Google. Se já existe conta com o mesmo e-mail, ela é vinculada ao Google
 * (o Google garante que o e-mail é do usuário). Senão, cria a conta.
 */
authRouter.post("/google", limiter, async (req, res) => {
  const { idToken } = parse(googleLoginSchema, req.body);
  const profile = await verifyGoogleIdToken(idToken);

  let [user] = await db.select().from(users).where(eq(users.googleId, profile.sub));
  if (!user) {
    const [byEmail] = await db.select().from(users).where(eq(users.email, profile.email));
    if (byEmail) {
      [user] = await db
        .update(users)
        .set({ googleId: profile.sub, avatarUrl: byEmail.avatarUrl ?? profile.picture })
        .where(eq(users.id, byEmail.id))
        .returning();
    } else {
      [user] = await db
        .insert(users)
        .values({ name: profile.name, email: profile.email, googleId: profile.sub, avatarUrl: profile.picture })
        .returning();
    }
  }
  res.json({ token: signToken(user.id), user: toPublicUser(user) });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(toPublicUser(currentUser(req)));
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const user = currentUser(req);
  const data = nonEmpty(parse(updateProfileSchema, req.body));
  const [updated] = await db.update(users).set(data).where(eq(users.id, user.id)).returning();
  res.json(toPublicUser(updated));
});

authRouter.post("/password", requireAuth, limiter, async (req, res) => {
  const user = currentUser(req);
  const data = parse(changePasswordSchema, req.body);
  // Conta só com Google pode criar uma senha sem informar a atual
  if (user.passwordHash && !(await bcrypt.compare(data.currentPassword ?? "", user.passwordHash))) {
    throw badRequest("A senha atual está incorreta");
  }
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(data.newPassword, 10) })
    .where(eq(users.id, user.id));
  res.json({ ok: true });
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  const user = currentUser(req);
  const data = parse(deleteAccountSchema, req.body);
  if (user.passwordHash) {
    if (!(await bcrypt.compare(data.password ?? "", user.passwordHash))) throw badRequest("Senha incorreta");
  } else if (data.confirmEmail?.trim().toLowerCase() !== user.email) {
    throw badRequest("Digite o seu e-mail para confirmar");
  }

  // Não deixar um clube sem presidente: se a pessoa é a única presidente
  // de um clube com outros associados, ela precisa passar o cargo antes.
  const presidencies = await db
    .select({ clubId: memberships.clubId })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.role, "presidente")));

  const soloClubs: number[] = [];
  for (const { clubId } of presidencies) {
    const [others] = await db
      .select({
        presidents: sql<number>`count(*) filter (where ${memberships.role} = 'presidente')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(memberships)
      .where(and(eq(memberships.clubId, clubId), ne(memberships.userId, user.id)));
    if (others.total === 0) soloClubs.push(clubId);
    if (others.total > 0 && others.presidents === 0) {
      throw badRequest(
        "Você é o único presidente de um clube. Passe a presidência para outro associado antes de excluir a conta.",
      );
    }
  }

  // Clubes em que a pessoa era o único associado deixam de existir junto com a conta
  if (soloClubs.length > 0) await db.delete(clubs).where(inArray(clubs.id, soloClubs));
  await db.delete(users).where(eq(users.id, user.id));
  res.json({ ok: true });
});
