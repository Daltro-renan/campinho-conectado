import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import type { PublicUser } from "@shared/api";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { squareImage } from "@/lib/image";
import { cn } from "@/lib/utils";

/** Foto de perfil do usuário logado: toque para escolher da galeria ou tirar com a câmera */
export function AvatarPicker({ size = "lg" }: { size?: "md" | "lg" }) {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const done = (u: PublicUser, message: string) => {
    setUser(u);
    // Listas do clube (elenco, chat, ranking) mostram a foto nova
    queryClient.invalidateQueries({ queryKey: ["club"] });
    toast.success(message);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const image = await squareImage(file, { size: 256, format: "jpeg", maxBytes: 200_000 });
      done(await api.put<PublicUser>("/auth/me/avatar", { image }), "Foto atualizada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      done(await api.delete<PublicUser>("/auth/me/avatar"), "Foto removida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dim = size === "lg" ? "h-24 w-24 text-3xl" : "h-16 w-16 text-xl";

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Trocar foto de perfil"
      >
        <UserAvatar name={user.name} url={user.avatarUrl} className={cn(dim, busy && "opacity-60")} />
        <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
          <Camera className="h-4 w-4" aria-hidden />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
        aria-label="Escolher foto"
      />
      <div className="flex flex-col items-start gap-1">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Enviando…" : user.avatarUrl ? "Trocar foto" : "Escolher foto"}
        </Button>
        {user.avatarUrl ? (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={remove} className="text-muted-foreground">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover
          </Button>
        ) : null}
      </div>
    </div>
  );
}
