import { useId } from "react";
import type { CrestShape } from "@shared/validation";
import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/format";
import { useClub } from "@/lib/club";

/** Contornos dos formatos de escudo, todos no mesmo quadro 40×46 */
export const CREST_PATHS: Record<CrestShape, string> = {
  classico: "M20 1.5 37.5 6v15.5c0 11-7.4 18.6-17.5 23-10.1-4.4-17.5-12-17.5-23V6Z",
  moderno: "M3 2.5h34v20.5c0 11-7.6 18.6-17 21.5C10.6 41.6 3 34 3 23Z",
  pontudo: "M3 2.5h34v26.5L20 44.5 3 29Z",
  redondo: "M20 4a19 19 0 1 1 0 38a19 19 0 1 1 0-38Z",
  hexagono: "M20 1.5 38.5 12v22L20 44.5 1.5 34V12Z",
};

type Props = {
  abbreviation: string;
  colorPrimary: string;
  colorSecondary: string;
  /** Imagem do logo (data URL ou https). Sem ela, desenha o escudo com as cores e a sigla. */
  logoUrl?: string | null;
  shape?: CrestShape | string | null;
  size?: number;
  className?: string;
};

/**
 * Escudo do clube/time. Com logo: a imagem aparece recortada no formato escolhido,
 * com uma borda na cor do time. Sem logo: corpo na cor principal, faixa diagonal
 * na secundária e a sigla por cima.
 */
export function TeamCrest({
  abbreviation,
  colorPrimary,
  colorSecondary,
  logoUrl,
  shape,
  size = 44,
  className,
}: Props) {
  const id = `crest-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const path = CREST_PATHS[(shape as CrestShape) ?? "classico"] ?? CREST_PATHS.classico;
  const text = readableOn(colorPrimary);
  const label = abbreviation.slice(0, 4);

  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 40 46"
      role="img"
      aria-label={`Escudo ${label}`}
      className={cn("shrink-0 drop-shadow-sm", className)}
    >
      <defs>
        <clipPath id={id}>
          <path d={path} />
        </clipPath>
      </defs>
      {logoUrl ? (
        <>
          <g clipPath={`url(#${id})`}>
            <rect width="40" height="46" fill="#FFFFFF" />
            <image href={logoUrl} x="0" y="0" width="40" height="46" preserveAspectRatio="xMidYMid slice" />
          </g>
          <path d={path} fill="none" stroke={colorPrimary} strokeWidth="2.2" />
        </>
      ) : (
        <>
          <g clipPath={`url(#${id})`}>
            <rect width="40" height="46" fill={colorPrimary} />
            <path d="M-4 30 44 12v7L-4 37Z" fill={colorSecondary} opacity={0.9} />
          </g>
          <path d={path} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1" />
          <text
            x="20"
            y="23"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={text}
            style={{
              fontFamily: '"Barlow Condensed", sans-serif',
              fontWeight: 700,
              fontSize: label.length > 3 ? 10.5 : 13,
              letterSpacing: 0.3,
              paintOrder: "stroke",
              stroke: text === "#FFFFFF" ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.35)",
              strokeWidth: 1.2,
            }}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}

/**
 * Escudo de um time DO clube ativo: usa o logo e o formato escolhidos para a associação,
 * com a borda na cor do time.
 */
export function ClubTeamCrest(props: Omit<Props, "logoUrl" | "shape">) {
  const { club } = useClub();
  return <TeamCrest {...props} logoUrl={club?.logoUrl} shape={club?.crestShape} />;
}

/** Escudo para adversário de fora (sem cores cadastradas) */
export function OpponentCrest({ name, size = 44 }: { name: string; size?: number }) {
  const abbr =
    name
      .split(/\s+/)
      .filter((w) => w.length > 2 || /^[A-Z]{2,}$/.test(w))
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || name.slice(0, 3).toUpperCase();
  return <TeamCrest abbreviation={abbr} colorPrimary="#5B6B62" colorSecondary="#C9D1CB" size={size} />;
}
