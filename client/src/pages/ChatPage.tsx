import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, SendHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MessageDTO } from "@shared/api";
import { CHANNELS, CHANNEL_INFO, ROLE_LABELS, canAccessChannel, can, type Channel } from "@shared/roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useActiveClub } from "@/lib/club";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user } = useAuth();
  const { role, clubPath, key } = useActiveClub();
  const queryClient = useQueryClient();
  const channels = CHANNELS.filter((c) => canAccessChannel(role, c));
  const [channel, setChannel] = useState<Channel>("geral");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryKey = key("chat", channel);

  // Atualiza a cada 4 segundos enquanto a tela está aberta
  const { data: messages = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get<MessageDTO[]>(clubPath(`/chat/${channel}`)),
    refetchInterval: 4000,
    staleTime: 0,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, channel]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const created = await api.post<MessageDTO>(clubPath(`/chat/${channel}`), { content });
      // A mensagem aparece na hora, sem esperar a próxima atualização
      queryClient.setQueryData<MessageDTO[]>(queryKey, (list = []) => [...list, created]);
      setText("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const remove = async (m: MessageDTO) => {
    try {
      await api.delete(clubPath(`/chat/${channel}/${m.id}`));
      queryClient.setQueryData<MessageDTO[]>(queryKey, (list = []) => list.filter((x) => x.id !== m.id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Agrupa por dia
  const groups = useMemo(() => {
    const out: { day: string; items: MessageDTO[] }[] = [];
    for (const m of messages) {
      const day = fmtDate(m.createdAt, "EEEE, d 'de' MMMM");
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="-mb-24 flex h-[calc(100dvh-3.5rem-4rem-1.25rem)] flex-col md:mb-0 md:h-[calc(100dvh-5.5rem)]">
      <header className="mb-3">
        <h1 className="text-3xl font-bold md:text-4xl">Chat</h1>
        <div className="mt-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Canais">
          {channels.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={channel === c}
              onClick={() => setChannel(c)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                channel === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
              )}
            >
              {c !== "geral" ? <Lock className="h-3 w-3" aria-hidden /> : null}
              {CHANNEL_INFO[c].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Visível para: {CHANNEL_INFO[channel].description.toLowerCase()}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-card px-3 py-4" aria-live="polite">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando mensagens…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma mensagem em {CHANNEL_INFO[channel].label}. Comece a conversa.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.day}>
              <p className="my-3 text-center text-xs font-medium text-muted-foreground first-letter:uppercase">{g.day}</p>
              <ul className="space-y-3">
                {g.items.map((m) => {
                  const mine = m.author?.id === user?.id;
                  const canDelete = mine || can(role, "members.manage");
                  return (
                    <li key={m.id} className={cn("group flex gap-2", mine && "flex-row-reverse")}>
                      {!mine ? <UserAvatar name={m.author?.name ?? "?"} url={m.author?.avatarUrl} className="h-8 w-8" /> : null}
                      <div className={cn("max-w-[80%]", mine && "text-right")}>
                        {!mine ? (
                          <p className="mb-0.5 text-xs">
                            <span className="font-semibold">{m.author?.name ?? "Ex-associado"}</span>
                            {m.author?.role ? (
                              <span className="text-muted-foreground"> ({ROLE_LABELS[m.author.role]})</span>
                            ) : null}
                          </p>
                        ) : null}
                        <div
                          className={cn(
                            "inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px]",
                            mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
                          )}
                        >
                          {m.content}
                        </div>
                        <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground" style={{ justifyContent: mine ? "flex-end" : "flex-start" }}>
                          {fmtTime(m.createdAt)}
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => remove(m)}
                              className="opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                              aria-label="Apagar mensagem"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={`Mensagem para ${CHANNEL_INFO[channel].label}`}
          aria-label="Mensagem"
          className="max-h-32 min-h-[44px] resize-none"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!text.trim() || sending} aria-label="Enviar">
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
