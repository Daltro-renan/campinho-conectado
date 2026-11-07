import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/format";

type Props = {
  abbreviation: string;
  colorPrimary: string;
  colorSecondary: string;
  size?: number;
  className?: string;
};

/**
 * Escudo desenhado a partir das cores do time: corpo na cor principal,
 * faixa diagonal na secundária e a sigla por cima.
 */
export function TeamCrest({ abbreviation, colorPrimary, colorSecondary, size = 44, className }: Props) {
  const text = readableOn(colorPrimary);
  const id = `crest-${abbreviation}-${colorPrimary}-${colorSecondary}`.replace(/[^a-zA-Z0-9-]/g, "");
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
          <path d="M20 1.5 37.5 6v15.5c0 11-7.4 18.6-17.5 23-10.1-4.4-17.5-12-17.5-23V6Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="40" height="46" fill={colorPrimary} />
        <path d="M-4 30 44 12v7L-4 37Z" fill={colorSecondary} opacity={0.9} />
      </g>
      <path
        d="M20 1.5 37.5 6v15.5c0 11-7.4 18.6-17.5 23-10.1-4.4-17.5-12-17.5-23V6Z"
        fill="none"
        stroke="rgba(0,0,0,.18)"
        strokeWidth="1"
      />
      <text
        x="20"
        y="22"
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
    </svg>
  );
}

/** Escudo para adversário de fora (sem cores cadastradas) */
export function OpponentCrest({ name, size = 44 }: { name: string; size?: number }) {
  const abbr = name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-Z]{2,}$/.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || name.slice(0, 3).toUpperCase();
  return <TeamCrest abbreviation={abbr} colorPrimary="#5B6B62" colorSecondary="#C9D1CB" size={size} />;
}
