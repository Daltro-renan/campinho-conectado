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

type Mode = "total" | "media";

type Metric = {
  id: string;
  label: string;
  value: (e: RankingEntry) => number;
  format: (n: number) => string;
  unit: (n: number) => string;
  detail: (e: RankingEntry) => string;
  hint: string;
};

const per = (n: number, games: number) => (games > 0 ? n / games : 0);
const dec = (n: number) => n.toFixed(2).replace(".", ",");
const pct = (e: RankingEntry) => (e.games > 0 ? ((e.wins * 3 + e.draws) / (e.games * 3)) * 100 : 0);
const plural = (one: string, many: string) => (n: number) => (n === 1 ? one : many);
const record = (e: RankingEntry) => `${e.games} jogo${e.games === 1 ? "" : "s"}, ${e.wins}V ${e.draws}E ${e.losses}D`;

const TOTALS: Metric[] = [
  {
    id: "goals",
    label: "Gols",
    value: (e) => e.goals,
    format: String,
    unit: plural("gol", "gols"),
    detail: (e) => (e.games > 0 ? `${dec(per(e.goals, e.games))} por jogo` : e.position ?? ""),
    hint: "Gols lançados no resultado de cada jogo.",
  },
  {
    id: "assists",
    label: "Assistências",
    value: (e) => e.assists,
    format: String,
    unit: plural("assist.", "assist."),
    detail: (e) => (e.games > 0 ? `${dec(per(e.assists, e.games))} por jogo` : e.position ?? ""),
    hint: "Assistências lançadas no resultado de cada jogo.",
  },
  {
    id: "wins",
    label: "Vitórias",
    value: (e) => e.wins,
    format: String,
    unit: plural("vitória", "vitórias"),
    detail: (e) => `${e.wins}V ${e.draws}E ${e.losses}D, ${Math.round(pct(e))}% de aproveitamento`,
    hint: "Vitórias do time em que o jogador foi escalado. Em racha e torneio, conta o time em que ele jogou.",
  },
  {
    id: "games",
    label: "Jogos",
    value: (e) => e.games,
    format: String,
    unit: plural("jogo", "jogos"),
    detail: (e) => `${e.wins} vitória${e.wins === 1 ? "" : "s"}`,
    hint: "Jogos finalizados em que o jogador foi escalado. Em torneio, cada partida conta.",
  },
];

const AVERAGES: Metric[] = [
  {
    id: "goalsAvg",
    label: "Gols por jogo",
    value: (e) => per(e.goals, e.games),
    format: dec,
    unit: () => "por jogo",
    detail: (e) => `${e.goals} gol${e.goals === 1 ? "" : "s"} em ${e.games} jogo${e.games === 1 ? "" : "s"}`,
    hint: "Total de gols dividido pelos jogos disputados.",
  },
  {
    id: "assistsAvg",
    label: "Assist. por jogo",
    value: (e) => per(e.assists, e.games),
    format: dec,
    unit: () => "por jogo",
    detail: (e) => `${e.assists} assist. em ${e.games} jogo${e.games === 1 ? "" : "s"}`,
    hint: "Total de assistências dividido pelos jogos disputados.",
  },
  {
    id: "involvement",
    label: "Participação em gols",
    value: (e) => per(e.goals + e.assists, e.games),
    format: dec,
    unit: () => "G+A por jogo",
    detail: (e) => `${e.goals} gols + ${e.assists} assist. em ${e.games} jogos`,
    hint: "Gols mais assistências, divididos pelos jogos disputados.",
  },
  {
    id: "winRate",
    label: "Aproveitamento",
    value: pct,
    format: (n) => `${Math.round(n)}%`,
    unit: () => "dos pontos",
    detail: record,
    hint: "Pontos ganhos (3 por vitória, 1 por empate) sobre os pontos disputados.",
  },
];

/** Mínimo de jogos para entrar nas médias: evita quem jogou uma vez liderar tudo */
function minGamesFor(list: RankingEntry[]) {
  const most = Math.max(0, ...list.map((e) => e.games));
  return most >= 10 ? 5 : most >= 4 ? 3 : 1;
}

/** Ordena (desempate: vitórias, gols, nome) e numera com empate na mesma posição */
function rank(list: RankingEntry[], m: Metric, minGames: number) {
  const sorted = list
    .filter((e) => m.value(e) > 0 && e.games >= minGames)
    .sort((a, b) => m.value(b) - m.value(a) || b.wins - a.wins || b.goals - a.goals || a.name.localeCompare(b.name));
  let place = 0;
  let last: number | null = null;
  return sorted.map((e, i) => {
    const v = m.value(e);
    if (v !== last) {
      place = i + 1;
      last = v;
    }
    return { entry: e, place };
  });
}

export default function RankingPage() {
  const { clubPath, key, can } = useActiveClub();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("total");
  const [metricId, setMetricId] = useState("goals");
  const [season, setSeason] = useState<string>(String(new Date().getFullYear()));
  const [viewing, setViewing] = useState<number | null>(null);
  const metrics = mode === "total" ? TOTALS : AVERAGES;
  const info = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const { data, isLoading } = useQuery({
    queryKey: key("ranking", season),
    queryFn: () => api.get<RankingResponse>(clubPath(`/ranking?temporada=${season}`)),
  });
  const members = useQuery({
    queryKey: key("members"),
    queryFn: () => api.get<MemberDTO[]>(clubPath("/members")),
  });

  const minGames = mode === "media" ? minGamesFor(data?.entries ?? []) : 0;
  const ranked = useMemo(() => rank(data?.entries ?? [], info, minGames), [data, info, minGames]);
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);
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

      <div className="mb-3 grid grid-cols-2 rounded-full border bg-card p-1" role="group" aria-label="Tipo de ranking">
        {(
          [
            ["total", "Totais"],
            ["media", "Médias"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setMetricId((m === "total" ? TOTALS : AVERAGES)[0].id);
            }}
            className={cn(
              "rounded-full py-1.5 text-sm font-semibold transition-colors",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Categoria">
        {metrics.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={info.id === c.id}
            onClick={() => setMetricId(c.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              info.id === c.id ? "border-gold bg-gold/15 text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
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
          title={`Ninguém no ranking de ${info.label.toLowerCase()} ${season === "todas" ? "ainda" : `em ${season}`}`}
          description={`${info.hint} Monte os times e lance o resultado para o ranking andar.`}
        />
      ) : (
        <>
          {/* Pódio: 2º, 1º, 3º */}
          <section aria-label="Pódio" className="stadium mb-4 overflow-hidden rounded-2xl border border-white/10 px-3 pt-8 text-white">
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
                    {first ? <Trophy className="mb-1 h-6 w-6 text-gold drop-shadow" aria-hidden /> : null}
                    <UserAvatar
                      name={p.entry.name}
                      url={p.entry.avatarUrl}
                      className={cn("ring-2 ring-pitch-foreground/60", first ? "h-16 w-16 text-xl" : "h-12 w-12")}
                    />
                    <span className="mt-2 line-clamp-1 max-w-full px-1 text-sm font-semibold">
                      {p.entry.nickname || p.entry.name.split(" ")[0]}
                    </span>
                    <span className="scoreline text-2xl">{info.format(info.value(p.entry))}</span>
                    <span className="text-[11px] opacity-80">{info.unit(info.value(p.entry))}</span>
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
                      <span className="block truncate text-xs text-muted-foreground">{info.detail(e)}</span>
                    </span>
                    <span className="text-right">
                      <span className="scoreline block text-2xl">{info.format(info.value(e))}</span>
                      <span className="text-xs text-muted-foreground">{info.unit(info.value(e))}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            {info.hint}
            {mode === "media" && minGames > 1 ? ` Entra quem tem pelo menos ${minGames} jogos.` : ""}
          </p>
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
