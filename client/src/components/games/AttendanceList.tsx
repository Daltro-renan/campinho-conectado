import { useQuery } from "@tanstack/react-query";
import type { AttendeeDTO, GameDTO, MemberDTO } from "@shared/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { fmtDate, fmtTime } from "@/lib/format";

type Person = { userId: number; name: string; avatarUrl: string | null; nickname?: string | null };

/** Quem vai, quem não vai e quem ainda não respondeu */
export function AttendanceList({
  game,
  title,
  onOpenChange,
}: {
  game: GameDTO | null;
  title: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { clubPath, key } = useActiveClub();
  const attendance = useQuery({
    queryKey: key("attendance", game?.id),
    queryFn: () => api.get<AttendeeDTO[]>(clubPath(`/games/${game!.id}/attendance`)),
    enabled: !!game,
  });
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
    enabled: !!game,
  });

  const nick = new Map((members.data ?? []).map((m) => [m.userId, m.nickname]));
  const list = attendance.data ?? [];
  const going: Person[] = list.filter((a) => a.status === "confirmado").map((a) => ({ ...a, nickname: nick.get(a.userId) }));
  const notGoing: Person[] = list.filter((a) => a.status === "ausente").map((a) => ({ ...a, nickname: nick.get(a.userId) }));
  const answered = new Set(list.map((a) => a.userId));
  const pending: Person[] = (members.data ?? [])
    .filter((m) => !answered.has(m.userId) && m.playerStatus === "ativo")
    .map((m) => ({ userId: m.userId, name: m.name, avatarUrl: m.avatarUrl, nickname: m.nickname }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={!!game} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Presença</DialogTitle>
          {game ? (
            <DialogDescription>
              {title}, {fmtDate(game.startsAt, "dd/MM")} às {fmtTime(game.startsAt)}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
          {attendance.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
          <Group label="Vão" tone="bg-ok" people={going} empty="Ninguém confirmou ainda." />
          <Group label="Não vão" tone="bg-danger" people={notGoing} />
          <Group label="Ainda não responderam" tone="bg-muted-foreground" people={pending} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, tone, people, empty }: { label: string; tone: string; people: Person[]; empty?: string }) {
  if (people.length === 0 && !empty) return null;
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} aria-hidden />
        {label}
        <span className="scoreline text-base text-muted-foreground">{people.length}</span>
      </h3>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {people.map((p) => (
            <li key={p.userId} className="flex min-w-0 items-center gap-2">
              <UserAvatar name={p.name} url={p.avatarUrl} className="h-8 w-8 text-xs" />
              <span className="truncate text-sm">{p.nickname || p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
