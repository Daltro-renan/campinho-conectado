/** Monta todas as rotas da API em /api. */
import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { notFound } from "../lib/http";
import { authRouter } from "./auth";
import { clubRouter, clubsRouter } from "./clubs";
import { rosterRouter } from "./roster";
import { gamesRouter } from "./games";
import { duesRouter } from "./dues";
import { chatRouter } from "./chat";
import { overviewRouter } from "./overview";
import { calendarRouter } from "./calendar";
import { avatarsRouter } from "./avatars";
import { paymentsRouter, webhookRouter } from "./payments";
import { env } from "../env";

export function apiRouter() {
  const api = Router();

  api.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  /** Configuração pública lida pelo app ao abrir (ex.: ID do login Google) */
  api.get("/config", (_req, res) => {
    res.json({ googleClientId: env.googleClientId });
  });

  api.use("/auth", authRouter);
  // Rotas públicas: link da agenda (token secreto) e aviso do Mercado Pago
  api.use(calendarRouter);
  api.use(webhookRouter);
  api.use(avatarsRouter);

  api.use("/clubs", requireAuth);
  api.use("/clubs", clubsRouter);

  // Tudo que pertence a um clube: /api/clubs/:clubId/...
  // `clubRouter` verifica se o usuário é associado antes dos demais.
  const club = Router({ mergeParams: true });
  club.use(clubRouter);
  club.use(rosterRouter);
  club.use(gamesRouter);
  club.use(duesRouter);
  club.use(chatRouter);
  club.use(overviewRouter);
  club.use(paymentsRouter);
  api.use("/clubs/:clubId", club);

  api.use(() => {
    throw notFound("Rota da API não encontrada");
  });

  return api;
}
