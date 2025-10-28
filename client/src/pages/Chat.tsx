import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, MessageCircle, Lock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Message, Team } from "@shared/schema";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

export default function Chat() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<"geral" | "tecnicos" | "diretoria">("geral");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "presidente" || user?.role === "diretoria";
  const isTecnico = user?.role === "tecnico";
  const canAccessTecnicos = isAdmin || isTecnico;
  const canAccessDiretoria = isAdmin;

  // Use default club ID = 1 (Campinho Conectado)
  const clubId = 1;

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat", clubId, selectedChannel],
    refetchInterval: 3000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; channel: string; clubId: number }) =>
      apiRequest("/api/chat/send", "POST", data),
    onSuccess: () => {
      setMessage("");
      // Invalidar cache para forçar atualização imediata
      queryClient.invalidateQueries({ queryKey: ["/api/chat", clubId, selectedChannel] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      toast({
        title: "Mensagem enviada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      content: message,
      channel: selectedChannel,
      clubId,
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "diretoria":
        return <Lock className="w-4 h-4" />;
      case "tecnicos":
        return <Users className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getChannelDescription = (channel: string) => {
    switch (channel) {
      case "diretoria":
        return "Apenas presidente e diretoria";
      case "tecnicos":
        return "Diretoria e técnicos";
      default:
        return "Todos os membros";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-orange-950 pb-20">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-black/50 border-b border-primary/20">
        <div className="max-w-lg mx-auto p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-white">Chat da Associação</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <Tabs value={selectedChannel} onValueChange={(value: any) => setSelectedChannel(value)}>
          <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-primary/20">
            <TabsTrigger value="geral" className="data-[state=active]:bg-primary" data-testid="tab-geral">
              Geral
            </TabsTrigger>
            <TabsTrigger
              value="tecnicos"
              className="data-[state=active]:bg-primary"
              disabled={!canAccessTecnicos}
              data-testid="tab-tecnicos"
            >
              Técnicos
            </TabsTrigger>
            <TabsTrigger
              value="diretoria"
              className="data-[state=active]:bg-primary"
              disabled={!canAccessDiretoria}
              data-testid="tab-diretoria"
            >
              Diretoria
            </TabsTrigger>
          </TabsList>

          {["geral", "tecnicos", "diretoria"].map((channel) => (
            <TabsContent key={channel} value={channel} className="mt-4">
              <Card className="bg-gray-900/50 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-primary/20">
                    {getChannelIcon(channel)}
                    <div>
                      <p className="font-semibold text-white">#{channel}</p>
                      <p className="text-xs text-gray-400">{getChannelDescription(channel)}</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto mb-4" data-testid="messages-container">
                    {messages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">Nenhuma mensagem ainda</p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.authorId === user?.id
                              ? "bg-primary/20 ml-8"
                              : "bg-gray-800 mr-8"
                          }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-sm text-primary">
                              {msg.authorId === user?.id ? "Você" : `Usuário #${msg.authorId}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(msg.createdAt), "HH:mm")}
                            </p>
                          </div>
                          <p className="text-white text-sm">{msg.content}</p>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 bg-gray-800 border-primary/20 text-white"
                      maxLength={1000}
                      data-testid="input-message"
                    />
                    <Button
                      type="submit"
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                      data-testid="button-send"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <BottomNav />
    </div>
  );
}
