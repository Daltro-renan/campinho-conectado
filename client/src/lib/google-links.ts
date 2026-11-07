/** Links do Google Agenda e do Google Maps — não precisam de chave de API. */
import type { GameDTO } from "@shared/api";
import { COMPETITION_LABELS } from "@shared/validation";
import { gameSides } from "@/components/games/GameSides";

const calDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Abre o Google Agenda já com o jogo preenchido */
export function googleCalendarUrl(game: GameDTO): string {
  const { home, away } = gameSides(game);
  const start = new Date(game.startsAt);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const kind = game.competitionName || COMPETITION_LABELS[game.competition as keyof typeof COMPETITION_LABELS];
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${home.name} x ${away.name}`,
    dates: `${calDate(start)}/${calDate(end)}`,
    details: [kind, game.notes].filter(Boolean).join("\n"),
    ...(game.location ? { location: game.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Assinar a agenda do clube no Google Agenda (todos os jogos, atualiza sozinho) */
export function googleCalendarSubscribeUrl(icsUrl: string): string {
  const webcal = icsUrl.replace(/^https?:\/\//, "webcal://");
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
}

export function mapsSearchUrl(place: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

export function mapsDirectionsUrl(place: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
}

/** Mapa incorporado (iframe) do Google Maps */
export function mapsEmbedUrl(place: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=15&output=embed`;
}
