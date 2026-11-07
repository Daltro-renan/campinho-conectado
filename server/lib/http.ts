/** Utilidades HTTP: erros padronizados e validação de entrada. */
import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = "Faça login para continuar") => new HttpError(401, msg);
export const forbidden = (msg = "Você não tem permissão para fazer isso") => new HttpError(403, msg);
export const notFound = (msg = "Não encontrado") => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

/** Valida `data` com o schema e lança 400 com a primeira mensagem de erro. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw badRequest(issue?.message ?? "Dados inválidos");
  }
  return result.data;
}

/** Converte um parâmetro de rota em número inteiro positivo. */
export function idParam(value: string | string[] | undefined, label = "id"): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`${label} inválido`);
  return n;
}

// Express 5 já repassa erros de funções async para este handler.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Dados inválidos" });
  }
  // Erros do próprio Express (ex.: JSON malformado)
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({ error: "Requisição inválida" });
  }
  // Violação de índice único no PostgreSQL
  if (typeof err === "object" && err && (err as { code?: string }).code === "23505") {
    return res.status(409).json({ error: "Esse registro já existe" });
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno no servidor. Tente novamente." });
}

/** Limitador simples em memória (por IP) para rotas sensíveis como o login. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = req.ip ?? "anon";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      if (hits.size > 10_000) hits.clear();
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return next(new HttpError(429, "Muitas tentativas. Aguarde alguns minutos."));
    }
    next();
  };
}

/** Garante que uma atualização parcial tem pelo menos um campo. */
export function nonEmpty<T extends Record<string, unknown>>(data: T): T {
  const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  if (Object.keys(defined).length === 0) throw badRequest("Nada para atualizar");
  return defined as T;
}
