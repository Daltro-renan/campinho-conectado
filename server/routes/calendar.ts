/**
 * Agenda do clube no formato iCalendar (.ics).
 * O associado assina este link uma vez no Google Agenda (ou no iPhone/Outlook)
 * e os jogos marcados aparecem sozinhos. O link usa um token secreto do clube.
 */
import { Router } from "express";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../db";
import { clubs, games } from "@shared/schema";
import { COMPETITION_LABELS } from "@shared/validation";
import { notFound } from "../lib/http";

export const calendarRouter = Router();

/** 2026-11-07T22:30:00.000Z → 20261107T223000Z */
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapa texto conforme a RFC 5545 */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Linhas do .ics têm no máximo 75 caracteres; as continuações começam com espaço */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

const GAME_DURATION_MS = 2 * 60 * 60 * 1000;

calendarRouter.get("/calendar/:file", async (req, res) => {
  const token = String(req.params.file).replace(/\.ics$/, "");
  const [club] = await db.select().from(clubs).where(eq(clubs.calendarToken, token));
  if (!club) throw notFound("Agenda não encontrada");

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const list = await db
    .select()
    .from(games)
    .where(and(eq(games.clubId, club.id), gte(games.startsAt, since)));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campinho Conectado//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Jogos – ${club.name}`)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];

  for (const g of list) {
    const isRacha = g.kind === "racha";
    const ours = isRacha ? (g.sideAName ?? "Time A") : club.name;
    const theirs = isRacha ? (g.sideBName ?? "Time B") : (g.opponentName ?? "Adversário");
    const [home, away] = g.isHome ? [ours, theirs] : [theirs, ours];
    const score =
      g.status === "finalizado" && g.teamScore != null && g.opponentScore != null
        ? g.isHome
          ? ` (${g.teamScore} x ${g.opponentScore})`
          : ` (${g.opponentScore} x ${g.teamScore})`
        : "";
    const kind = g.competitionName || COMPETITION_LABELS[g.competition as keyof typeof COMPETITION_LABELS] || "Jogo";
    const description = [kind, g.notes].filter(Boolean).join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:jogo-${g.id}@campinho-conectado`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(g.startsAt)}`,
      `DTEND:${icsDate(new Date(g.startsAt.getTime() + GAME_DURATION_MS))}`,
      fold(`SUMMARY:${esc(`${isRacha ? "Racha: " : ""}${home} x ${away}${score}`)}`),
      ...(g.location ? [fold(`LOCATION:${esc(g.location)}`)] : []),
      ...(description ? [fold(`DESCRIPTION:${esc(description)}`)] : []),
      `STATUS:${g.status === "cancelado" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  res.set({
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="${club.abbreviation.toLowerCase()}-jogos.ics"`,
    "Cache-Control": "public, max-age=900",
  });
  res.end(lines.join("\r\n") + "\r\n");
});
