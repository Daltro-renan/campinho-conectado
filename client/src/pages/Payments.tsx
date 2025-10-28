import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Check, X, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Payment, Player } from "@shared/schema";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

export default function Payments() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    } else if (!isLoading && user && !isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas presidente e diretoria podem acessar esta página.",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, isLoading, isAdmin, setLocation, toast]);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: !!user && isAdmin,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
    enabled: !!user && isAdmin,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/payments", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setIsAddOpen(false);
      toast({
        title: "Mensalidade criada!",
        description: "A mensalidade foi registrada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar mensalidade",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/payments/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Pagamento atualizado!",
        description: "O status do pagamento foi atualizado.",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/payments/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      toast({
        title: "Mensalidade excluída",
        description: "A mensalidade foi removida com sucesso.",
      });
    },
  });

  const handleCreatePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const month = parseInt(formData.get("month") as string);
    const year = parseInt(formData.get("year") as string);
    const dueDate = new Date(year, month - 1, 10).toISOString().split('T')[0];

    createPaymentMutation.mutate({
      playerId: parseInt(formData.get("playerId") as string),
      amount: parseFloat(formData.get("amount") as string) * 100,
      dueDate,
      month,
      year,
      status: "pending",
      paymentMethod: paymentMethod || undefined,
      notes: formData.get("notes") as string || undefined,
    });
    setPaymentMethod("");
  };

  const markAsPaid = (payment: Payment) => {
    updatePaymentMutation.mutate({
      id: payment.id,
      data: {
        status: "paid",
        paidDate: new Date().toISOString().split('T')[0],
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      paid: { variant: "default", label: "Pago" },
      pending: { variant: "secondary", label: "Pendente" },
      overdue: { variant: "destructive", label: "Atrasado" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  const filteredPayments = payments.filter((payment) => {
    if (statusFilter !== "all" && payment.status !== statusFilter) return false;
    if (selectedPlayer !== "all" && payment.playerId.toString() !== selectedPlayer) return false;
    return true;
  });

  const totalPending = payments.filter(p => p.status === "pending").length;
  const totalPaid = payments.filter(p => p.status === "paid").length;
  const totalOverdue = payments.filter(p => p.status === "overdue").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-orange-900 pb-20">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2" data-testid="title-payments">
              <DollarSign className="h-8 w-8 text-orange-500" />
              Mensalidades
            </h1>
            <p className="text-gray-400 mt-1">Gerenciamento de pagamentos dos jogadores</p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" data-testid="button-add-payment">
                <Plus className="h-4 w-4 mr-2" />
                Nova Mensalidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
              <form onSubmit={handleCreatePayment}>
                <DialogHeader>
                  <DialogTitle>Adicionar Mensalidade</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Registre uma nova mensalidade para um jogador
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="playerId">Jogador</Label>
                    <Select name="playerId" required>
                      <SelectTrigger className="bg-gray-700 border-gray-600" data-testid="select-player">
                        <SelectValue placeholder="Selecione um jogador" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="month">Mês</Label>
                      <Select name="month" required>
                        <SelectTrigger className="bg-gray-700 border-gray-600" data-testid="select-month">
                          <SelectValue placeholder="Mês" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {new Date(2024, i).toLocaleString('pt-BR', { month: 'long' })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="year">Ano</Label>
                      <Input
                        type="number"
                        name="year"
                        defaultValue={new Date().getFullYear()}
                        min="2024"
                        max="2030"
                        required
                        className="bg-gray-700 border-gray-600"
                        data-testid="input-year"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      className="bg-gray-700 border-gray-600"
                      data-testid="input-amount"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="bg-gray-700 border-gray-600" data-testid="select-payment-method">
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      name="notes"
                      placeholder="Observações opcionais..."
                      className="bg-gray-700 border-gray-600"
                      data-testid="input-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700" data-testid="button-submit-payment">
                    Criar Mensalidade
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800/50 border-gray-700" data-testid="card-stat-paid">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{totalPaid}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700" data-testid="card-stat-pending">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{totalPending}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700" data-testid="card-stat-overdue">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">Atrasados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{totalOverdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white" data-testid="filter-status">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="overdue">Atrasados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-white" data-testid="filter-player">
              <SelectValue placeholder="Filtrar por jogador" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Todos os jogadores</SelectItem>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id.toString()}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Payments List */}
        {paymentsLoading ? (
          <div className="text-center text-white py-12">Carregando mensalidades...</div>
        ) : filteredPayments.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma mensalidade encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPayments.map((payment) => {
              const player = players.find(p => p.id === payment.playerId);
              const dueDate = new Date(payment.dueDate + 'T00:00:00');
              const paidDate = payment.paidDate ? new Date(payment.paidDate + 'T00:00:00') : null;

              return (
                <Card key={payment.id} className="bg-gray-800/50 border-gray-700" data-testid={`card-payment-${payment.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <User className="h-5 w-5 text-orange-500" />
                          <h3 className="font-semibold text-white text-lg" data-testid={`text-player-name-${payment.id}`}>
                            {player?.name || "Jogador não encontrado"}
                          </h3>
                          {getStatusBadge(payment.status)}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Mês/Ano</p>
                            <p className="text-white font-medium" data-testid={`text-month-year-${payment.id}`}>
                              {payment.month.toString().padStart(2, '0')}/{payment.year}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-400">Valor</p>
                            <p className="text-white font-medium" data-testid={`text-amount-${payment.id}`}>
                              R$ {(payment.amount / 100).toFixed(2)}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-400">Vencimento</p>
                            <p className="text-white font-medium" data-testid={`text-due-date-${payment.id}`}>
                              {format(dueDate, "dd/MM/yyyy")}
                            </p>
                          </div>

                          {paidDate && (
                            <div>
                              <p className="text-gray-400">Data de Pagamento</p>
                              <p className="text-white font-medium" data-testid={`text-paid-date-${payment.id}`}>
                                {format(paidDate, "dd/MM/yyyy")}
                              </p>
                            </div>
                          )}
                        </div>

                        {payment.notes && (
                          <p className="text-gray-400 text-sm mt-2" data-testid={`text-notes-${payment.id}`}>
                            {payment.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        {payment.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => markAsPaid(payment)}
                            disabled={updatePaymentMutation.isPending}
                            data-testid={`button-mark-paid-${payment.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePaymentMutation.mutate(payment.id)}
                          disabled={deletePaymentMutation.isPending}
                          data-testid={`button-delete-payment-${payment.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}
