/** Entrega o app React: pelo Vite em desenvolvimento e pelos arquivos de build em produção. */
import type { Express } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./env";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function log(message: string) {
  const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  console.log(`${time} [servidor] ${message}`);
}

export async function serveClient(app: Express) {
  if (!env.isProduction) {
    // Importado só em desenvolvimento: em produção o Vite nem precisa estar instalado
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: path.resolve(root, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      try {
        const template = fs.readFileSync(path.resolve(root, "client", "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
    return;
  }

  const distPath = path.resolve(root, "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Build não encontrado em ${distPath}. Rode "npm run build" antes de iniciar.`);
  }
  app.use(express.static(distPath, { index: false, maxAge: "1h" }));
  // Qualquer rota que não seja arquivo devolve o app (as rotas são tratadas no navegador)
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
