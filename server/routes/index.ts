/** Monta todas as rotas da API em /api. */
import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { notFound } from "../lib/http";
import { authRouter } from "./auth";
import { clubRouter, clubsRouter } from "./clubs";
import { squadRouter } from "./squad";
import { gamesRouter } from "./games";
import { duesRouter } from "./dues";
import { chatRouter } from "./chat";
import { overviewRouter } from "./overview";

export function apiRouter() {
  const api = Router();

  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  api.use("/auth", authRouter);

  api.use("/clubs", requireAuth);
  api.use("/clubs", clubsRouter);

  // Tudo que pertence a um clube: /api/clubs/:clubId/...
  // `clubRouter` verifica se o usuário é associado antes dos demais.
  const club = Router({ mergeParams: true });
  club.use(clubRouter);
  club.use(squadRouter);
  club.use(gamesRouter);
  club.use(duesRouter);
  club.use(chatRouter);
  club.use(overviewRouter);
  api.use("/clubs/:clubId", club);

  api.use(() => {
    throw notFound("Rota da API não encontrada");
  });

  return api;
}
