import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trophy, Plus, Trash2, Edit, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Team } from "@shared/schema";
import BottomNav from "@/components/BottomNav";

const teamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  abbreviation: z.string().optional(),
  logo: z.string().url("Insira uma URL válida").optional().or(z.literal("")),
  colorPrimary: z.string().optional(),
  colorSecondary: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  founded: z.string().optional(),
  description: z.string().optional(),
});

type TeamForm = z.infer<typeof teamSchema>;

export default function TeamManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const form = useForm<TeamForm>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      logo: "",
      colorPrimary: "#FF6600",
      colorSecondary: "#000000",
      city: "",
      state: "",
      founded: "",
      description: "",
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: TeamForm) =>
      apiRequest("/api/teams", "POST", {
        ...data,
        clubId: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Time criado!",
        description: "Time cadastrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TeamForm> }) =>
      apiRequest(`/api/teams/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeam(null);
      form.reset();
      toast({
        title: "Time atualizado!",
        description: "Time atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/teams/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Time excluído!",
        description: "Time removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir time",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeamForm) => {
    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    form.reset({
      name: team.name,
      abbreviation: team.abbreviation || "",
      logo: team.logo || "",
      colorPrimary: team.colorPrimary || "#FF6600",
      colorSecondary: team.colorSecondary || "#000000",
      city: team.city || "",
      state: team.state || "",
      founded: team.founded || "",
      description: team.description || "",
    });
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setEditingTeam(null);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/50 border-b border-primary/20">
        <div className="max-w-lg mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-white">Gerenciar Times</h1>
          </div>
          {isAdmin && (
            <Dialog open={isCreateOpen || !!editingTeam} onOpenChange={(open) => {
              if (open) {
                setIsCreateOpen(true);
              } else {
                handleCloseDialog();
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90" 
                  data-testid="button-create-team"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Time
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 text-white border-primary/20 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTeam ? "Editar Time" : "Criar Novo Time"}</DialogTitle>
                  <DialogDescription>
                    {editingTeam ? "Atualize as informações do time" : "Adicione um novo time à associação"}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Time *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: Associação Futebol Inteligente"
                              data-testid="input-team-name"
                              className="bg-gray-800 border-primary/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="abbreviation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sigla / Abreviação</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Ex: AFI, CRF"
                              maxLength={5}
                              data-testid="input-abbreviation"
                              className="bg-gray-800 border-primary/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Escudo/Logo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://exemplo.com/logo.png"
                              data-testid="input-logo"
                              className="bg-gray-800 border-primary/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="colorPrimary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Primária</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  {...field}
                                  type="color"
                                  className="w-16 h-10 p-1 bg-gray-800 border-primary/20 cursor-pointer"
                                  data-testid="input-color-primary"
                                />
                                <Input
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#FF6600"
                                  className="flex-1 bg-gray-800 border-primary/20 text-white"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="colorSecondary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Secundária</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input
                                  {...field}
                                  type="color"
                                  className="w-16 h-10 p-1 bg-gray-800 border-primary/20 cursor-pointer"
                                  data-testid="input-color-secondary"
                                />
                                <Input
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="#000000"
                                  className="flex-1 bg-gray-800 border-primary/20 text-white"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="São Paulo"
                                data-testid="input-city"
                                className="bg-gray-800 border-primary/20 text-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="SP"
                                maxLength={2}
                                data-testid="input-state"
                                className="bg-gray-800 border-primary/20 text-white uppercase"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="founded"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano de Fundação</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="2020"
                              maxLength={4}
                              data-testid="input-founded"
                              className="bg-gray-800 border-primary/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva o time, sua história, missão..."
                              rows={3}
                              data-testid="input-description"
                              className="bg-gray-800 border-primary/20 text-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" className="bg-primary hover:bg-primary/90" data-testid="button-submit-team">
                        {editingTeam ? "Atualizar Time" : "Criar Time"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {isLoading ? (
          <Card className="bg-gray-900/50 border-primary/20">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">Carregando times...</p>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card className="bg-gray-900/50 border-primary/20">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-white mb-2">Nenhum time cadastrado</h3>
              <p className="text-gray-400 mb-4">
                {isAdmin 
                  ? "Crie o primeiro time da sua associação clicando no botão acima"
                  : "Nenhum time foi cadastrado ainda"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="bg-gray-900/50 border-primary/20 hover:border-primary/40 transition-all" data-testid={`card-team-${team.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 items-center flex-1">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.name}
                          className="w-12 h-12 object-contain rounded bg-white/5 p-1"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-white flex items-center gap-2">
                          {team.name}
                          {team.abbreviation && (
                            <span className="text-xs font-normal text-gray-400">({team.abbreviation})</span>
                          )}
                        </CardTitle>
                        {(team.city || team.state) && (
                          <CardDescription className="text-gray-400">
                            {team.city}{team.city && team.state && ', '}{team.state}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(team)}
                          className="text-primary hover:bg-primary/10"
                          data-testid={`button-edit-team-${team.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este time?")) {
                              deleteTeamMutation.mutate(team.id);
                            }
                          }}
                          className="text-red-400 hover:bg-red-400/10"
                          data-testid={`button-delete-team-${team.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(team.colorPrimary || team.colorSecondary) && (
                      <div>
                        <p className="text-xs text-gray-400 mb-2">Cores do Time</p>
                        <div className="flex gap-2">
                          {team.colorPrimary && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded border border-gray-700"
                                style={{ backgroundColor: team.colorPrimary }}
                              />
                              <span className="text-xs text-gray-400">Primária</span>
                            </div>
                          )}
                          {team.colorSecondary && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded border border-gray-700"
                                style={{ backgroundColor: team.colorSecondary }}
                              />
                              <span className="text-xs text-gray-400">Secundária</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {team.founded && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Fundação:</span>
                        <span className="text-white">{team.founded}</span>
                      </div>
                    )}

                    {team.description && (
                      <div className="pt-2 border-t border-gray-800">
                        <p className="text-sm text-gray-300 line-clamp-2">{team.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
