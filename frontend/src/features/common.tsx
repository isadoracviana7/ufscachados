import type { ReactNode } from "react";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { logo } from "@/data/assets";
export const metadata = (title: string, description: string) => ({
  meta: [
    { title: `${title} | UFSCAchados` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | UFSCAchados` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Processing({ publication = false }: { publication?: boolean }) {
  return (
    <div className="processing" role="status">
      <img src={logo} alt="UFSCAchados" />
      <LoaderCircle size={32} className="spin text-primary" />
      <h2 className="text-xl font-semibold">
        {publication ? "Uma boa ação faz a diferença." : "Quase lá..."}
      </h2>
      <p>
        {publication
          ? "Agradecemos por ajudar um objeto a voltar para o seu dono com a sua publicação..."
          : "Mudança de status em andamento..."}
      </p>
    </div>
  );
}
export function Restricted() {
  return (
    <main className="page-width main-content">
      <div className="empty-state">
        <ShieldCheck size={40} />
        <h3>Acesso restrito ao Protocolo</h3>
        <p>Entre com o perfil de operador para continuar.</p>
        <Button asChild className="mt-5">
          <Link to="/acesso">Ir para o acesso</Link>
        </Button>
      </div>
    </main>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="error-text">
      {message}
    </p>
  ) : null;
}
export function formatDate(value: string) {
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime())
    ? "Data não informada"
    : d
        .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
        .replaceAll(".", "");
}
