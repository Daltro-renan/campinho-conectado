import { format, isToday, isTomorrow, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos → "R$ 50,00" */
export const money = (cents: number) => brl.format(cents / 100);

/** "50,00" ou "50" → 5000 centavos */
export function parseMoney(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

const d = (value: string | Date) => (typeof value === "string" ? new Date(value) : value);

/** Datas só com dia (AAAA-MM-DD) chegam sem fuso — tratar como data local */
export const parseDay = (value: string) => new Date(`${value}T12:00:00`);

export const fmtDate = (value: string | Date, pattern = "dd/MM/yyyy") =>
  format(d(value), pattern, { locale: ptBR });

export const fmtTime = (value: string | Date) => format(d(value), "HH:mm");

/** "Hoje", "Amanhã", "Sáb, 22 abr" */
export function fmtGameDay(value: string | Date): string {
  const date = d(value);
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return capitalize(format(date, "EEE, d MMM", { locale: ptBR }).replace(".", ""));
}

export function daysUntil(value: string | Date): number {
  return differenceInCalendarDays(d(value), new Date());
}

export function fmtMonth(referenceMonth: string): string {
  return capitalize(format(parseDay(`${referenceMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR }));
}

export function currentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

export function shiftMonth(referenceMonth: string, delta: number): string {
  const [y, m] = referenceMonth.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return format(date, "yyyy-MM");
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Valor para <input type="datetime-local"> a partir de ISO */
export function toDateTimeInput(value: string | Date): string {
  return format(d(value), "yyyy-MM-dd'T'HH:mm");
}

/** Cor do texto (claro/escuro) legível sobre uma cor de fundo */
export function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#13241A" : "#FFFFFF";
}
