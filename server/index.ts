import express from "express";
import { env } from "./env";
import { apiRouter } from "./routes";
import { errorHandler } from "./lib/http";
import { log, serveClient } from "./vite";

const app = express();
app.disable("x-powered-by");
// Atrás de proxy (Render, Railway, Replit) para o IP real chegar no limitador de login
app.set("trust proxy", 1);
// 1 MB: comporta o logo do clube enviado como imagem
app.use(express.json({ limit: "1mb" }));

// O app nativo (Capacitor) roda em https://localhost e chama a API deste servidor.
// O login usa token no cabeçalho (sem cookies), então liberar a origem é seguro.
app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return void res.sendStatus(204);
  next();
});

// Registro simples das chamadas à API
app.use("/api", (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use("/api", apiRouter());
app.use("/api", errorHandler);

await serveClient(app);

app.listen(env.port, env.host, () => {
  log(`Servidor rodando em http://localhost:${env.port}`);
});
