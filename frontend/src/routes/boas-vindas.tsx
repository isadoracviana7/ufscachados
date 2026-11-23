import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { logo } from "@/data/assets";
import { Button } from "@/components/ui/button";
import { metadata } from "@/features/common";
export const Route = createFileRoute("/boas-vindas")({
  head: () =>
    metadata(
      "Bem-vindo",
      "Conheça o UFSCAchados: o mural comunitário para reportar e encontrar objetos perdidos na UFSC.",
    ),
  component: Welcome,
});
function Welcome() {
  return (
    <main className="welcome fade-in">
      <img src={logo} alt="Lupa sobre o brasão com garrafa, chaves e caderno" />
      <div>
        <div className="eyebrow justify-center">
          <HeartHandshake size={14} />
          Conectando a nossa comunidade
        </div>
        <h1>
          Bem-vindo ao
          <br />
          <span className="text-primary">UFSCAchados.</span>
        </h1>
      </div>
      <p>
        Seu mural comunitário para reportar e encontrar objetos perdidos nas dependências da UFSC.
        Conectando pessoas e devolvendo bens com facilidade e segurança.
      </p>
      <div className="welcome-actions">
        <Button size="lg" asChild>
          <Link to="/acesso">
            Vamos começar <ArrowRight />
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link to="/">Explorar mural</Link>
        </Button>
      </div>
      <div className="pagination-dots" aria-label="Etapa 1 de 2">
        <span className="active" />
        <span />
      </div>
    </main>
  );
}
