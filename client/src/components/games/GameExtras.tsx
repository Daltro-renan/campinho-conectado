import { useState } from "react";
import { CalendarPlus, MapPin, Navigation } from "lucide-react";
import type { GameDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { googleCalendarUrl, mapsDirectionsUrl, mapsEmbedUrl, mapsSearchUrl } from "@/lib/google-links";

/** Ações de um jogo agendado: adicionar ao Google Agenda e ver o local no Google Maps */
export function GameExtras({ game, showMap = false }: { game: GameDTO; showMap?: boolean }) {
  const [mapOpen, setMapOpen] = useState(showMap);
  if (game.status !== "agendado") return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={googleCalendarUrl(game)} target="_blank" rel="noreferrer">
            <CalendarPlus className="mr-1.5 h-4 w-4" /> Adicionar à agenda
          </a>
        </Button>
        {game.location ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setMapOpen((v) => !v)} aria-expanded={mapOpen}>
              <MapPin className="mr-1.5 h-4 w-4" /> {mapOpen ? "Esconder mapa" : "Ver no mapa"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={mapsDirectionsUrl(game.location)} target="_blank" rel="noreferrer">
                <Navigation className="mr-1.5 h-4 w-4" /> Como chegar
              </a>
            </Button>
          </>
        ) : null}
      </div>
      {mapOpen && game.location ? (
        <div className="overflow-hidden rounded-lg border">
          <iframe
            title={`Mapa: ${game.location}`}
            src={mapsEmbedUrl(game.location)}
            className="h-56 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={mapsSearchUrl(game.location)}
            target="_blank"
            rel="noreferrer"
            className="block border-t bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Abrir no Google Maps
          </a>
        </div>
      ) : null}
    </div>
  );
}
