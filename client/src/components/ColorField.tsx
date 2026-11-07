import { cn } from "@/lib/utils";

/** Seletor de cor com o código hexadecimal ao lado */
export function ColorField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium leading-none">{label}</span>
      <span className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={label}
        />
        <span className="truncate font-mono text-xs uppercase text-muted-foreground">{value}</span>
      </span>
    </label>
  );
}
