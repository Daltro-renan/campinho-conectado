import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { CREST_SHAPES, CREST_SHAPE_LABELS, type CrestShape } from "@shared/validation";
import { Button } from "@/components/ui/button";
import { TeamCrest } from "@/components/TeamCrest";
import { cn } from "@/lib/utils";
import { squareImage } from "@/lib/image";


/** Escolha do logo da associação e do formato do escudo, com prévia */
export function CrestEditor({
  abbreviation,
  colorPrimary,
  colorSecondary,
  logoUrl,
  shape,
  onChange,
}: {
  abbreviation: string;
  colorPrimary: string;
  colorSecondary: string;
  logoUrl: string | null;
  shape: CrestShape;
  onChange: (next: { logoUrl?: string | null; crestShape?: CrestShape }) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange({ logoUrl: await squareImage(file, { size: 320 }) });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">Escudo</legend>
      <div className="flex flex-wrap items-center gap-4">
        <TeamCrest
          abbreviation={abbreviation || "?"}
          colorPrimary={colorPrimary}
          colorSecondary={colorSecondary}
          logoUrl={logoUrl}
          shape={shape}
          size={72}
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
            aria-label="Escolher imagem do logo"
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            <ImagePlus className="mr-1.5 h-4 w-4" />
            {busy ? "Carregando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
          {logoUrl ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ logoUrl: null })}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Usar sigla e cores
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use o logo da associação (de preferência quadrado). Ele aparece recortado no formato escolhido, com a borda na cor do
        time.
      </p>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Formato do escudo">
        {CREST_SHAPES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={shape === s}
            onClick={() => onChange({ crestShape: s })}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border bg-background py-2 text-xs font-medium transition-colors",
              shape === s ? "border-primary ring-1 ring-primary" : "hover:bg-accent",
            )}
          >
            <TeamCrest
              abbreviation={abbreviation || "?"}
              colorPrimary={colorPrimary}
              colorSecondary={colorSecondary}
              logoUrl={logoUrl}
              shape={s}
              size={30}
            />
            {CREST_SHAPE_LABELS[s]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
