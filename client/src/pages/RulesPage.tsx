import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";

const EXAMPLE = `Mensalidade
Vence todo dia 10. Quem atrasar mais de 2 meses não joga até acertar.

Racha
Chegar 15 minutos antes. Times sorteados entre quem confirmou presença no app.

Cartões
Cartão vermelho: fica fora do próximo racha.`;

/**
 * Regras da associação: um texto único, visível a todos.
 * Linhas sozinhas e curtas viram títulos de seção; o resto é parágrafo.
 */
export default function RulesPage() {
  const { club, clubPath, can } = useActiveClub();
  const canEdit = can("club.edit");
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(club.rules ?? "");
  useEffect(() => setText(club.rules ?? ""), [club.rules]);

  const save = useClubMutation(() => api.patch(clubPath(), { rules: text.trim() || null }), {
    success: "Regras salvas",
    refreshClubs: true,
    onSuccess: () => setEditing(false),
  });

  const blocks = (club.rules ?? "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div>
      <PageHeader
        title="Regras"
        description={`Estatuto e combinados do ${club.name}. Valem para todos os associados.`}
        actions={
          canEdit && !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              {blocks.length ? "Editar regras" : "Escrever regras"}
            </Button>
          ) : undefined
        }
      />

      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={18}
            maxLength={10_000}
            placeholder={EXAMPLE}
            className="font-sans text-[15px] leading-relaxed"
            aria-label="Regras da associação"
          />
          <p className="text-xs text-muted-foreground">
            Deixe uma linha em branco entre as regras. Uma linha curta sozinha no começo do bloco vira título.
            {` ${text.length.toLocaleString("pt-BR")} de 10.000 caracteres.`}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setText(club.rules ?? "");
                setEditing(false);
              }}
            >
              Voltar
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate(undefined)}>
              {save.isPending ? "Salvando…" : "Salvar regras"}
            </Button>
          </div>
        </div>
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nenhuma regra escrita ainda"
          description={
            canEdit
              ? "Escreva o estatuto e os combinados do clube: mensalidade, horários, cartões, convidados."
              : "Quando a diretoria publicar as regras do clube, elas aparecem aqui."
          }
        />
      ) : (
        <article className="rule-sheet space-y-5 rounded-2xl border bg-card px-5 py-6 md:px-8">
          {blocks.map((b, i) => {
            const [first, ...rest] = b.split("\n");
            const isTitle = rest.length > 0 && first.length <= 60 && !/[.:;]$/.test(first);
            return (
              <section key={i} className="flex gap-4">
                <span className="scoreline w-7 shrink-0 pt-0.5 text-right text-2xl text-gold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  {isTitle ? <h2 className="mb-1 text-xl font-semibold">{first}</h2> : null}
                  <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                    {isTitle ? rest.join("\n") : b}
                  </p>
                </div>
              </section>
            );
          })}
        </article>
      )}
    </div>
  );
}
