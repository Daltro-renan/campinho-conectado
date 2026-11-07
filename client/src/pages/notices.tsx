import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/Field";
import { api } from "@/lib/api";
import { useClub } from "@/lib/club";
import { useClubMutation } from "@/lib/mutation";

/** Botão + formulário para a diretoria publicar um aviso no mural */
export function NoticeComposer() {
  const { clubPath } = useClub();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });

  const publish = useClubMutation(() => api.post(clubPath("/notices"), form), {
    success: "Aviso publicado",
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", body: "", pinned: false });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" /> Novo aviso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Novo aviso</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            publish.mutate(undefined);
          }}
        >
          <Field label="Título" htmlFor="notice-title">
            <Input
              id="notice-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Uniforme novo chegou"
              required
            />
          </Field>
          <Field label="Mensagem" htmlFor="notice-body">
            <Textarea
              id="notice-body"
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              id="notice-pinned"
              checked={form.pinned}
              onCheckedChange={(pinned) => setForm({ ...form, pinned })}
            />
            <Label htmlFor="notice-pinned">Fixar no topo</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={publish.isPending}>
              {publish.isPending ? "Publicando…" : "Publicar aviso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
