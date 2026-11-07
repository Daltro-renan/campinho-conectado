import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import type { MemberDTO, RankingEntry, RankingResponse } from "@shared/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerDialog } from "@/components/squad/PlayerDialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useActiveClub } from "@/lib/club";
import { cn } from "@/lib/utils";

type Category = "goals" | "assists" | "wins" | "games";

const CATEGORIES: { id: Category; label: string; unit: [string, string]; hint: string }[] = [
  { id: "goals", label: "Gols", unit: ["gol", "gols"], hint: "Gols lançados no resultado de cada jogo." },
  { id: "assists", label: "Assistências", unit: ["assist.", "assist."], hint: "Assistências lançadas no resultado de cada jogo." },
  {
    id: "wins",
    label: "Vitórias",
    unit: ["vitória", "vitórias"],
    hint: "Vitórias do time em que o jogador foi escalado. Em racha, conta o lado em que ele jogou.",
  },
  {
    id: "games",
    label: "Jogos",
    unit: ["jogo", "jogos"],
    hint: "Jogos finalizados em que o jogador foi escalado (ou confirmou presença, se não houve escalação).",
  },
];

/** Desempate: aproveitamento/vitórias, depois gols, depois nome */
function sortBy(list: RankingEntry[], cat: Category) {
  return [...list]
    .filter((e) => e[cat] > 0)
    .sort((a, b) => b[cat] - a[cat] || b.wins - a.wins || b.goals - a.goals || a.name.localeCompare(b.name));
}

/** Posição com empate: quem tem o mesmo número fica na mesma posição */
function withPlaces(list: RankingEntry[], cat: Category) {
  let place = 0;
  let last: number | null = null;
  return list.map((e, i) => {
    if (e[cat] !== last) {
      place = i + 1;
      last = e[cat];
    }
    return { entry: e, place };
  });
}

const pct = (e: RankingEntry) => (e.games > 0 ? Math.round(((e.wins * 3 + e.draws) / (e.games * 3)) * 100) : 0);

function detail(e: RankingEntry, cat: Category) {
  if (cat === "wins") return `${e.wins}V ${e.draws}E ${e.losses}D, ${pct(e)}% de aproveitamento`;
  if (cat === "games") return `${e.wins} vitória${e.wins === 1 ? "" : "s"} em ${e.games}`;
  if (cat === "goals") return e.games > 0 ? `${(e.goals / e.games).toFixed(1).replace(".", ",")} por jogo` : "";
  return e.position ?? "";
}

export default function RankingPage() {
  const { clubPath, key, can } = useActiveClub();
  const { user } = useAuth();
  const [cat, setCat] = useState<Category>("goals");
  const [season, setSeason] = useState<string>(String(new Date().getFullYear()));
  const [viewing, setViewing] = useState<number | null>(null);
  const info = CATEGORIES.find((c) => c.id === cat)!;

  const { data, isLoading } = useQuery({
    queryKey: key("ranking", season),
    queryFn: () => api.get<RankingResponse>(clubPath(`/ranking?temporada=${season}`)),
  });
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
  });

  const ranked = useMemo(() => withPlaces(sortBy(data?.entries ?? [], cat), cat), [data, cat]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const unit = (n: number) => (n === 1 ? info.unit[0] : info.unit[1]);
  const seasons = data?.seasons ?? [new Date().getFullYear()];
  const open = (memberId: number) => setViewing(memberId);
  const viewingMember = members.data?.find((m) => m.id === viewing) ?? null;

  return (
    <div>
      <PageHeader
        title="Ranking"
        actions={
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-[9.5rem]" aria-label="Temporada">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Temporada {y}
                </SelectItem>
              ))}
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categoria">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              cat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingRows rows={4} />
      ) : ranked.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={`Ninguém com ${info.label.toLowerCase()} ${season === "todas" ? "ainda" : `em ${season}`}`}
          description={`${info.hint} Monte os times e lance o resultado para o ranking andar.`}
        />
      ) : (
        <>
          {/* Pódio: 2º, 1º, 3º */}
          <section aria-label="Pódio" className="pitch-field mb-4 overflow-hidden rounded-2xl px-3 pt-6 text-pitch-foreground">
            <div className="grid grid-cols-3 items-end gap-2">
              {[podium[1], podium[0], podium[2]].map((p, i) => {
                if (!p) return <div key={i} />;
                const first = p.place === 1 && i === 1;
                const height = i === 1 ? "h-28" : i === 0 ? "h-20" : "h-14";
                return (
                  <button
                    type="button"
                    key={p.entry.memberId}
                    onClick={() => open(p.entry.memberId)}
                    className="flex flex-col items-center text-center"
                  >
                    {first ? <Trophy className="mb-1 h-6 w-6 text-warn" aria-hidden /> : null}
                    <UserAvatar
                      name={p.entry.name}
                      url={p.entry.avatarUrl}
                      className={cn("ring-2 ring-pitch-foreground/60", first ? "h-16 w-16 text-xl" : "h-12 w-12")}
                    />
                    <span className="mt-2 line-clamp-1 max-w-full px-1 text-sm font-semibold">
                      {p.entry.nickname || p.entry.name.split(" ")[0]}
                    </span>
                    <span className="scoreline text-2xl">{p.entry[cat]}</span>
                    {cat === "wins" ? (
                      <span className="text-[11px] opacity-80">{pct(p.entry)}%</span>
                    ) : null}
                    <div
                      className={cn(
                        "mt-2 grid w-full place-items-center rounded-t-md bg-black/25 font-display text-3xl font-bold text-pitch-foreground/80",
                        height,
                      )}
                    >
                      {p.place}º
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {rest.length > 0 ? (
            <ol className="divide-y rounded-lg border bg-card">
              {rest.map(({ entry: e, place }) => (
                <li key={e.memberId}>
                  <button
                    type="button"
                    onClick={() => open(e.memberId)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50",
                      e.userId === user?.id && "bg-primary/5",
                    )}
                  >
                    <span className="scoreline w-7 text-center text-xl text-muted-foreground">{place}º</span>
                    <UserAvatar name={e.name} url={e.avatarUrl} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {e.nickname || e.name}
                        {e.userId === user?.id ? <span className="font-normal text-muted-foreground"> (você)</span> : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{detail(e, cat)}</span>
                    </span>
                    <span className="text-right">
                      <span className="scoreline block text-2xl">{e[cat]}</span>
                      <span className="text-xs text-muted-foreground">{unit(e[cat])}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">{info.hint}</p>
        </>
      )}

      <PlayerDialog
        member={viewingMember}
        staff={can("squad.manage")}
        onOpenChange={(o) => !o && setViewing(null)}
      />
    </div>
  );
}
