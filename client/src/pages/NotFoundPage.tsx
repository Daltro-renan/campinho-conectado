import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="scoreline text-7xl text-muted-foreground">404</p>
      <h1 className="mt-3 text-3xl font-bold">Bola fora</h1>
      <p className="mt-2 text-muted-foreground">Essa página não existe ou foi removida.</p>
      <Button asChild className="mt-6">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
