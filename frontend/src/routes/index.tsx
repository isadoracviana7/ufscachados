import { logo } from "@/data/assets";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  Laptop,
  Wallet,
  BottleWine,
  Backpack,
  KeyRound,
  Shirt,
  BookOpen,
  LayoutGrid,
  Check,
  X,
  ArrowRight,
  LoaderCircle,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/features/app-context";
import { ItemDetails } from "@/features/item-details";
import { ErrorMessage, Field, formatDate, metadata } from "@/features/common";
import { canPublish, isPublic, normalize, type Item, type Match } from "@/data/types";
import { semanticSearch } from "@/services/api";
export const Route = createFileRoute("/")({
  head: () =>
    metadata(
      "Mural de objetos",
      "O mural da comunidade UFSC. Encontre objetos perdidos, publique achados e ajude a criar novos reencontros.",
    ),
  component: Mural,
});
const icons = [LayoutGrid, Laptop, Wallet, BottleWine, Backpack, KeyRound, BookOpen, Shirt];
function Mural() {
  const { items, role, loading, error, connection } = useApp();
  const [type, setType] = useState<"achado" | "perdido">("achado");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<Item | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const publicItems = items.filter(isPublic);
  const typeItems = publicItems.filter((i) => i.type === type);
  const categories = [...new Set(items.map((i) => i.category))];
  const locations = [...new Set(items.map((i) => i.location))];
  const filtered = useMemo(
    () =>
      publicItems
        .filter(
          (i) =>
            i.type === type &&
            (!query ||
              normalize(`${i.title} ${i.description} ${i.location}`).includes(normalize(query))) &&
            (!category || i.category === category) &&
            (!location || i.location === location) &&
            (!date || i.date.slice(0, 10) === date) &&
            (!matches || matches.some((m) => m.id_objeto === i.id)),
        )
        .sort((a, b) =>
          matches
            ? matches.findIndex((m) => m.id_objeto === a.id) -
              matches.findIndex((m) => m.id_objeto === b.id)
            : sort === "recent"
              ? b.date.localeCompare(a.date)
              : a.date.localeCompare(b.date),
        ),
    [items, type, query, category, location, date, sort, matches],
  );
  const reset = () => {
    setCategory("");
    setLocation("");
    setDate("");
    setQuery("");
    setMatches(null);
  };
  const active = !!(category || location || date);
  const filters = (
    <>
      <div className="filter-heading">
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={14} />
          Filtrar objetos
        </span>
        {active && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Limpar filtros"
            className="size-6"
            onClick={reset}
          >
            <X size={12} />
          </Button>
        )}
      </div>
      <div className="filter-group">
        <div className="filter-label">Categorias</div>
        {["Todas as categorias", ...categories].map((c, index) => {
          const Icon = icons[index] ?? TagIcon;
          const value = index === 0 ? "" : c;
          return (
            <Button
              variant="ghost"
              className={`category-option ${category === value ? "active" : ""}`}
              key={c}
              onClick={() => setCategory(value)}
            >
              <Icon />
              {c}
              <span className="count">
                {index === 0 ? typeItems.length : typeItems.filter((i) => i.category === c).length}
              </span>
            </Button>
          );
        })}
      </div>
      <div className="filter-group">
        <div className="filter-label">Local / Bloco</div>
        <select
          aria-label="Filtrar por local"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">Todos os locais</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <div className="filter-label">Data do registro</div>
        <input
          type="date"
          aria-label="Filtrar por data"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="security-note">
        <ShieldCheck size={23} />
        <strong>Um mural seguro para todos.</strong>Alguns detalhes dos objetos são reservados para
        garantir que cada item volte ao seu verdadeiro dono.
      </div>
    </>
  );
  async function searchAI() {
    setAiBusy(true);
    setAiError("");
    try {
      const result = await semanticSearch(aiText);
      setMatches(result);
      setType("achado");
      setCategory("");
      setLocation("");
      setDate("");
      setQuery("");
      setAiOpen(false);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  }
  return (
    <>
      <main className="page-width main-content fade-in">
        <div className="intro-row">
          <div>
            <div className="eyebrow">
              <span className="inline-block size-1 rounded-full bg-primary" /> Cuidar também é
              ajudar a encontrar
            </div>
            <h1 className="page-title">
              Pequenos objetos. <span className="text-primary">Grandes reencontros.</span>
            </h1>
            <p className="page-description">
              Perdeu ou encontrou algo na UFSC? O próximo reencontro começa aqui.
            </p>
          </div>
          <div className="intro-community">
            <div className="community-icons">
              <span>AC</span>
              <span>LM</span>
              <span>MC</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Uma comunidade que
              <br />
              <strong className="text-foreground font-medium">cuida do que é de todos.</strong>
            </p>
          </div>
        </div>
        <div className="search-wrap">
          <Search size={20} />
          <input
            aria-label="Buscar objetos"
            placeholder="O que você está procurando?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="ai-cta">
            <Button variant="ghost" onClick={() => setAiOpen(true)} title="Busca Inteligente (IA)">
              <Sparkles />
              Busca Inteligente <span className="text-primary">IA</span>
            </Button>
          </div>
        </div>
        <div className="mural-toolbar">
          <div className="mural-tabs" role="tablist" aria-label="Tipo de registro">
            <Button
              variant="ghost"
              role="tab"
              aria-selected={type === "perdido"}
              className={type === "perdido" ? "selected" : ""}
              onClick={() => {
                setType("perdido");
                setMatches(null);
              }}
            >
              Perdidos{" "}
              <span className="tab-count">
                {publicItems.filter((i) => i.type === "perdido").length}
              </span>
            </Button>
            <Button
              variant="ghost"
              role="tab"
              aria-selected={type === "achado"}
              className={type === "achado" ? "selected" : ""}
              onClick={() => setType("achado")}
            >
              Achados{" "}
              <span className="tab-count">
                {publicItems.filter((i) => i.type === "achado").length}
              </span>
            </Button>
          </div>
          <span className="security-inline text-[10px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck size={13} />
            Cada objeto tem uma história. Vamos continuar a sua.
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="mobile-filter"
            onClick={() => setMobileFilters(true)}
          >
            <SlidersHorizontal />
            Filtros {active && "•"}
          </Button>
        </div>
        <div className="mural-layout">
          <aside className="filters-sidebar">{filters}</aside>
          <section aria-label="Mural de objetos">
            <div className="results-heading">
              <span>
                <strong>Mural</strong>
                <span className="mx-2 opacity-40">/</span>
                {loading
                  ? "Carregando..."
                  : `${filtered.length} objeto${filtered.length === 1 ? "" : "s"} ${type === "achado" ? "encontrado" : "perdido"}${filtered.length === 1 ? "" : "s"}`}
              </span>
              <select
                className="sort-select"
                aria-label="Ordenar registros"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Mais recentes primeiro</option>
                <option value="oldest">Mais antigos primeiro</option>
              </select>
            </div>
            {matches && (
              <div className="notice mb-5 items-center">
                <Sparkles />
                <div className="flex-1">
                  {matches.length
                    ? `${matches.length} correspondência(s) para “${aiText}”`
                    : "Nenhum item compatível com a descrição."}
                  {connection === "demo" && (
                    <div className="text-[10px]">
                      Demonstração por palavras-chave · IA indisponível offline
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Limpar busca inteligente"
                  onClick={() => setMatches(null)}
                >
                  <X />
                </Button>
              </div>
            )}
            <ErrorMessage message={error} />
            <div className="item-grid">
              {loading ? (
                <div className="empty-state">
                  <LoaderCircle size={28} className="spin" />
                  <p>Conectando ao mural...</p>
                </div>
              ) : (
                filtered.map((item) => {
                  const match = matches?.find((m) => m.id_objeto === item.id);
                  return (
                    <article
                      className={`item-card ${match ? "item-match" : ""}`}
                      key={item.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalhes de ${item.title}`}
                      onClick={() => setSelected(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(item);
                        }
                      }}
                    >
                      <div className="item-photo">
                        <img src={item.image || logo} alt={item.title} loading="lazy" />
                        <span className={`item-badge ${item.type === "achado" ? "found" : ""}`}>
                          {item.type === "achado" ? <Check size={9} /> : <Search size={9} />}
                          {item.type === "achado" ? "Achado" : "Perdido"}
                        </span>
                      </div>
                      <div className="card-content">
                        <div className="card-category">{item.category}</div>
                        <h2 className="card-title">{item.title}</h2>
                        <div className="card-location">
                          <MapPin />
                          {item.location}
                        </div>
                        <p className="card-description">{item.description}</p>
                        {match && (
                          <div className="match-label">
                            <Sparkles size={12} />
                            Compatibilidade {match.grau_compatibilidade.toLowerCase()}
                          </div>
                        )}
                        <div className="card-footer">
                          <span>{formatDate(item.date)}</span>
                          <span className="flex gap-1 items-center">
                            Ver detalhes <ArrowUpRight />
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
              {!loading && !filtered.length && (
                <div className="empty-state">
                  <Search size={36} />
                  <h3>A busca continua.</h3>
                  <p>Nenhum objeto encontrado com esses filtros.</p>
                  <Button variant="outline" className="mt-5" onClick={reset}>
                    Limpar busca e filtros
                  </Button>
                </div>
              )}
            </div>
            {!loading && filtered.length > 0 && (
              <div className="bottom-message">
                <HeartHandshake size={14} /> Você está em dia com o mural. Cada ajuda faz a
                diferença.
              </div>
            )}
          </section>
        </div>
      </main>
      {canPublish(role) && (
        <Button asChild className="floating-publish" title="Publicar registro">
          <Link to="/publicar" aria-label="Publicar novo registro">
            <Plus />
          </Link>
        </Button>
      )}
      {selected && (
        <ItemDetails key={selected.id} item={selected} onClose={() => setSelected(null)} />
      )}
      <Dialog open={mobileFilters} onOpenChange={setMobileFilters}>
        <DialogContent className="modal-content">
          <DialogTitle className="sr-only">Filtros do mural</DialogTitle>
          <DialogDescription className="sr-only">
            Filtre por categoria, local ou data.
          </DialogDescription>
          {filters}
          <Button onClick={() => setMobileFilters(false)}>
            Ver {filtered.length} objetos <ArrowRight />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="modal-content">
          <Sparkles size={30} className="text-primary" />
          <DialogTitle className="modal-title">Às vezes, uma descrição basta.</DialogTitle>
          <DialogDescription className="modal-subtitle">
            Conte o que perdeu. Vamos procurar objetos compatíveis no mural.
          </DialogDescription>
          <Field label="O que você lembra do objeto?">
            <textarea
              autoFocus
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Esqueci um fone branco num estojo na hora do almoço no RU..."
            />
          </Field>
          {connection === "demo" && (
            <div className="notice">
              <Sparkles />
              No modo demonstração, a busca usa palavras-chave, sem inteligência artificial.
            </div>
          )}
          <ErrorMessage message={aiError} />
          <Button disabled={aiBusy || aiText.trim().length < 5} onClick={() => void searchAI()}>
            {aiBusy ? <LoaderCircle className="spin" /> : <Sparkles />}
            {aiBusy ? "Procurando..." : "Encontrar correspondências"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
const TagIcon = LayoutGrid;
