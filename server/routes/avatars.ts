/** Entrega as fotos de perfil enviadas pelo app (rota pública, como uma imagem comum). */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { idParam, notFound } from "../lib/http";

export const avatarsRouter = Router();

avatarsRouter.get("/avatars/:userId", async (req, res) => {
  const [row] = await db
    .select({ data: users.avatarData })
    .from(users)
    .where(eq(users.id, idParam(req.params.userId, "Usuário")));
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(row?.data ?? "");
  if (!match) throw notFound("Foto não encontrada");
  res.set({
    "Content-Type": match[1],
    // A URL muda (?v=) quando a foto muda, então pode ficar em cache por bastante tempo
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  res.end(Buffer.from(match[2], "base64"));
});
