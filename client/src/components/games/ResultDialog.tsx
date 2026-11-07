import { useEffect, useState, type FormEvent } from "react";
import type { GameDTO } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { gameSides } from "./GameSides";

/** Lançar o placar final. O jogo passa para "finalizado". */
export function ResultDialog({
  game,
  onOpenChange,
}: {
  game: GameDTO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { clubPath } = useClub();
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  useEffect(() => {
    if (!game) return;
    const sides = gameSides(game);
    setHome(sides.home.score != null ? String(sides.home.score) : "");
    setAway(sides.away.score != null ? String(sides.away.score) : "");
  }, [game]);

  const save = useClubMutation(
    () => {
      if (!game) return Promise.resolve();
      const homeN = Number(home);
      const awayN = Number(away);
      // Converte de mandante/visitante para "nosso time" / "adversário"
      const teamScore = game.isHome ? homeN : awayN;
      const opponentScore = game.isHome ? awayN : homeN;
      return api.patch(clubPath(`/games/${game.id}`), { teamScore, opponentScore, status: "finalizado" });
    },
    { success: "Resultado lançado", onSuccess: () => onOpenChange(false) },
  );

  if (!game) return null;
  const sides = gameSides(game);
  const valid = home !== "" && away !== "";

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Resultado</DialogTitle>
          <DialogDescription>Informe o placar final da partida.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            save.mutate(undefined);
          }}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
            <ScoreInput label={sides.home.name} crest={sides.home.crest(48)} value={home} onChange={setHome} />
            <span className="scoreline pt-8 text-3xl text-muted-foreground">×</span>
            <ScoreInput label={sides.away.name} crest={sides.away.crest(48)} value={away} onChange={setAway} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={!valid || save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar resultado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreInput({
  label,
  crest,
  value,
  onChange,
}: {
  label: string;
  crest: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-2 text-center">
      {crest}
      <span className="line-clamp-1 text-sm font-medium">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-16 w-20 text-center font-display text-4xl font-bold"
        aria-label={`Gols de ${label}`}
      />
    </label>
  );
}
