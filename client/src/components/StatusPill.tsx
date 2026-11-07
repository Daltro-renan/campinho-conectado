import type { DueStatus } from "@shared/api";
import { cn } from "@/lib/utils";

const STYLES: Record<DueStatus | "sem_cobranca", { label: string; className: string }> = {
  pago: { label: "Em dia", className: "bg-ok/10 text-ok ring-ok/30" },
  pendente: { label: "Pendente", className: "bg-warn/20 text-warn-foreground ring-warn/50 dark:text-warn" },
  vencido: { label: "Vencida", className: "bg-danger/10 text-danger ring-danger/30" },
  sem_cobranca: { label: "Sem cobrança", className: "bg-muted text-muted-foreground ring-border" },
};

/** Etiqueta de status da mensalidade, com as cores dos cartões */
export function StatusPill({
  status,
  labels,
  className,
}: {
  status: DueStatus | "sem_cobranca";
  labels?: Partial<Record<DueStatus | "sem_cobranca", string>>;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.className,
        className,
      )}
    >
      <CardIcon status={status} />
      {labels?.[status] ?? s.label}
    </span>
  );
}

/** Mini cartão (como o do árbitro) para reforçar a cor sem depender só dela */
function CardIcon({ status }: { status: DueStatus | "sem_cobranca" }) {
  if (status === "sem_cobranca") return null;
  const fill =
    status === "pago" ? "hsl(var(--status-ok))" : status === "pendente" ? "hsl(var(--status-warn))" : "hsl(var(--status-danger))";
  return (
    <svg width="8" height="11" viewBox="0 0 8 11" aria-hidden className="-rotate-6">
      <rect width="8" height="11" rx="1.5" fill={fill} />
    </svg>
  );
}
