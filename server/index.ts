import express from "express";
import { env } from "./env";
import { apiRouter } from "./routes";
import { errorHandler } from "./lib/http";
import { log, serveClient } from "./vite";

const app = express();
app.disable("x-powered-by");
// Atrás de proxy (Render, Railway, Replit) para o IP real chegar no limitador de login
app.set("trust proxy", 1);
app.use(express.json({ limit: "200kb" }));

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
