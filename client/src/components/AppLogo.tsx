import logoMark from "@/assets/logo-mark.svg";
import { cn } from "@/lib/utils";

/** Marca do Campinho Conectado: campo com a bola e as setas da bússola */
export function AppLogo({ size = 32, className }: { size?: number; className?: string }) {
  return <img src={logoMark} width={size} height={size} alt="Campinho Conectado" className={cn("shrink-0", className)} />;
}
