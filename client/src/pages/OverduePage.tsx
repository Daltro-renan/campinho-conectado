import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, MessageCircle, PartyPopper } from "lucide-react";
import type { DueDTO, OverdueMemberDTO, OverdueReport } from "@shared/api";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@shared/validation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, LoadingRows } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import NotFoundPage from "./NotFoundPage";
import { api } from "@/lib/api";
import { useActiveClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";
import { fmtDate, fmtMonth, money, parseDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Telefone brasileiro → formato do WhatsApp (55 + DDD + número) */
function whatsappNumber(phone: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
}

function reminderMessage(m: OverdueMemberDTO, clubName: string, pixKey: string | null, onlinePayments: boolean) {
  const first = m.name.split(" ")[0];
  const months = m.dues.map((d) => fmtMonth(d.referenceMonth).split(" ")[0].toLowerCase()).join(", ");
  const how = onlinePayments
    ? `Dá para pagar com PIX ou cartão direto no app, em Mensalidades.`
    : pixKey
      ? `Chave PIX do clube: ${pixKey}`
      : `Fale com a diretoria para combinar o pagamento.`;
  return `Olá, ${first}! Aqui é da diretoria do ${clubName}. Consta em aberto a mensalidade de ${months}, total de ${money(m.overdueAmount)}. ${how} Qualquer dúvida, é só chamar. Valeu!`;
}

const severity = (days: number) =>
  days > 60 ? "bg-danger text-white" : days > 30 ? "bg-danger/15 text-danger" : "bg-warn/25 text-warn-foreground dark:text-warn";

export default function OverduePage() {
  const { club, clubPath, key, can } = useActiveClub();
  const allowed = can("finance.manage");
  const [open, setOpen] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: key("dues", "overdue"),
    queryFn: () => api.get<OverdueReport>(clubPath("/dues/overdue")),
    enabled: allowed,
  });

  const markPaid = useClubMutation(
    (vars: { due: DueDTO; method: string }) => api.patch(clubPath(`/dues/${vars.due.id}`), { paid: true, method: vars.method }),
    { success: "Baixa registrada" },
  );

  if (!allowed) return <NotFoundPage />;

  const rate =
    data && data.payingMembers + data.memberCount > 0
      ? Math.round((data.payingMembers / (data.payingMembers + data.memberCount)) * 100)
      : null;

  return (
    <div>
      <PageHeader title="Inadimplência" description="Associados com mensalidade vencida e não paga." />

      {club.monthlyFee <= 0 ? (
        <div className="mb-5 rounded-lg border border-warn/60 bg-warn/10 px-4 py-3 text-sm">
          O clube ainda não cobra mensalidade. Defina o valor em{" "}
          <Link href="/clube" className="font-semibold underline underline-offset-2">
            Clube
          </Link>{" "}
          e as cobranças passam a ser geradas automaticamente todo mês.
        </div>
      ) : null}

      {isLoading || !data ? (
        <LoadingRows rows={4} />
      ) : (
        <>
          <section className="mb-6 grid grid-cols-3 divide-x rounded-lg border bg-card text-center">
            <div className="py-4">
              <p className="scoreline text-3xl text-danger">{money(data.totalAmount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Em atraso</p>
            </div>
            <div className="py-4">
              <p className="scoreline text-3xl">{data.memberCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Inadimplente{data.memberCount === 1 ? "" : "s"}</p>
            </div>
            <div className="py-4">
              <p className="scoreline text-3xl text-ok">{rate == null ? "–" : `${rate}%`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Em dia</p>
            </div>
          </section>

          {data.members.length === 0 ? (
            <EmptyState
              icon={PartyPopper}
              title="Ninguém em atraso"
              description="Todas as mensalidades vencidas estão pagas."
            />
          ) : (
            <ul className="space-y-3">
              {data.members.map((m) => {
                const wa = whatsappNumber(m.phone);
                const text = reminderMessage(m, club.name, club.pixKey, club.onlinePayments);
                const expanded = open === m.memberId;
                return (
                  <li key={m.memberId} className="rounded-lg border bg-card">
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <UserAvatar name={m.name} url={m.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.overdueCount} mensalidade{m.overdueCount === 1 ? "" : "s"}, desde{" "}
                          {fmtDate(parseDay(m.oldestDueDate))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{money(m.overdueAmount)}</p>
                        <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", severity(m.daysLate))}>
                          {m.daysLate} dia{m.daysLate === 1 ? "" : "s"} de atraso
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                      {wa ? (
                        <Button asChild size="sm" className="bg-[#1FAF38] text-white hover:bg-[#1a9a31]">
                          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-1.5 h-4 w-4" /> Cobrar no WhatsApp
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigator.clipboard.writeText(text).then(() => toast.success("Mensagem de cobrança copiada"))
                          }
                          title="O associado não cadastrou celular no perfil"
                        >
                          <MessageCircle className="mr-1.5 h-4 w-4" /> Copiar mensagem
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : m.memberId)}
                      >
                        Ver meses <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", expanded && "rotate-180")} />
                      </Button>
                    </div>
                    {expanded ? (
                      <ul className="divide-y border-t">
                        {m.dues.map((d) => (
                          <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                            <span className="flex-1">
                              {fmtMonth(d.referenceMonth)}
                              <span className="block text-xs text-muted-foreground">
                                venceu em {fmtDate(parseDay(d.dueDate))}
                              </span>
                            </span>
                            <span className="tabular-nums">{money(d.amount)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Dar baixa
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                                  Pago via
                                </DropdownMenuLabel>
                                {PAYMENT_METHODS.map((method) => (
                                  <DropdownMenuItem key={method} onSelect={() => markPaid.mutate({ due: d, method })}>
                                    {PAYMENT_METHOD_LABELS[method]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            As mensalidades são geradas automaticamente todo mês para os associados não isentos. Pagamentos feitos
            pelo app saem desta lista sozinhos.
          </p>
        </>
      )}
    </div>
  );
}
