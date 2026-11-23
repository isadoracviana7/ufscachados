import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  Package,
  HeartHandshake,
  Clock3,
  TrendingUp,
  Download,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/features/app-context";
import { metadata, Restricted, ErrorMessage } from "@/features/common";
import { API_URL, listResource, reports } from "@/services/api";
import {
  inPeriod,
  aggregateBlocks,
  aggregateCategories,
  returnRate,
  type Period,
} from "@/features/report-rules";
import type { RecordData } from "@/data/types";
export const Route = createFileRoute("/relatorios")({
  head: () =>
    metadata(
      "Relatórios do Protocolo",
      "Indicadores de objetos, reivindicações e devoluções da UFSC por bloco, categoria e período.",
    ),
  component: Reports,
});
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
function Reports() {
  const { role, items, connection } = useApp();
  const [period, setPeriod] = useState<Period>("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [semester, setSemester] = useState(2);
  const [raw, setRaw] = useState<RecordData[][]>([]);
  const [claims, setClaims] = useState<RecordData[]>([]);
  const [error, setError] = useState("");
  const [apiChart, setApiChart] = useState<{ title: string; url: string } | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);

  async function openApiChart(slug: string, title: string) {
    setLoadingChart(true);
    setError("");
    try {
      const baseUrl = (API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
      const res = await fetch(`${baseUrl}/relatorios/${slug}/grafico`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (!res.ok) throw new Error(`Erro ${res.status} ao carregar gráfico da API.`);
      const blob = await res.blob();
      if (apiChart?.url) URL.revokeObjectURL(apiChart.url);
      setApiChart({ title, url: URL.createObjectURL(blob) });
    } catch (e) {
      setError(`Não foi possível carregar o gráfico: ${String(e)}`);
    } finally {
      setLoadingChart(false);
    }
  }

  useEffect(() => {
    if (role !== "operador") return;
    void Promise.all([reports(), listResource("reivindicacoes")])
      .then(([r, c]) => {
        setRaw(r);
        setClaims(c);
      })
      .catch((e) => setError(String(e)));
  }, [role, items]);
  const filtered = useMemo(
    () => items.filter((i) => inPeriod(i.date, period, year, month, semester)),
    [items, period, year, month, semester],
  );
  const filteredClaims = claims.filter((c) =>
    inPeriod(String(c["data_hora"]), period, year, month, semester),
  );
  const blocks =
    period === "all" && raw[0]
      ? raw[0].map((r) => ({
          name: String(r["bloco_predio"]).replace(" - Jardim das Avenidas", ""),
          total: Number(r["total_objetos"]),
        }))
      : aggregateBlocks(filtered);
  const categories = aggregateCategories(filtered);
  const claimData = Object.entries(
    filteredClaims.reduce<Record<string, number>>((a, r) => {
      const key = String(r["status"]);
      a[key] = (a[key] ?? 0) + 1;
      return a;
    }, {}),
  ).map(([name, total]) => ({
    name:
      name === "EM_ANALISE"
        ? "Em análise"
        : name === "APROVADA"
          ? "Aprovada"
          : name === "REJEITADA"
            ? "Rejeitada"
            : name,
    total,
  }));
  const stats = [
    {
      label: "Registros no período",
      value: filtered.length,
      icon: Package,
      foot: "Perdidos e achados",
    },
    {
      label: "Devolvidos aos donos",
      value: filtered.filter((i) => i.status === 3).length,
      icon: HeartHandshake,
      foot: "Histórias com final feliz",
    },
    {
      label: "Aguardando retirada",
      value: filtered.filter((i) => [1, 2].includes(i.status)).length,
      icon: Clock3,
      foot: "Itens sob os cuidados do Protocolo",
    },
    {
      label: "Taxa de devolução",
      value: `${returnRate(filtered)}%`,
      icon: TrendingUp,
      foot: "Devolvidos / total de achados",
    },
  ];
  function exportCSV() {
    const rows = [
      ["ID", "Objeto", "Categoria", "Local", "Tipo", "Status", "Data"],
      ...filtered.map((i) => [i.id, i.title, i.category, i.location, i.type, i.status, i.date]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";"))
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ufscachados-relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  if (role !== "operador") return <Restricted />;
  return (
    <main className="page-width main-content fade-in">
      <div className="eyebrow">
        <BarChart3 size={12} />
        Protocolo UFSC
      </div>
      <div className="intro-row">
        <div>
          <h1 className="page-title">Cada reencontro conta.</h1>
          <p className="page-description">
            Um olhar sobre os objetos e as histórias que passam pelo campus.
          </p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download />
          Exportar CSV
        </Button>
      </div>
      <div className="report-controls">
        <select
          aria-label="Período do relatório"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="all">Todo o período</option>
          <option value="month">Mês</option>
          <option value="semester">Semestre</option>
          <option value="year">Ano</option>
        </select>
        {period !== "all" && (
          <input
            type="number"
            min={2000}
            max={2100}
            aria-label="Ano"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        )}{" "}
        {period === "month" && (
          <select aria-label="Mês" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthNames.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
        {period === "semester" && (
          <select
            aria-label="Semestre"
            value={semester}
            onChange={(e) => setSemester(Number(e.target.value))}
          >
            <option value={1}>1º semestre</option>
            <option value={2}>2º semestre</option>
          </select>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {filtered.length} registros selecionados
        </span>
      </div>
      <ErrorMessage message={error} />
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-label">
              {s.label}
              <s.icon size={16} className="text-primary" />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-foot">{s.foot}</div>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <section className="chart-panel">
          <h2>Onde os objetos aparecem</h2>
          <p>Quantidade de registros por bloco ou prédio</p>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blocks} margin={{ top: 10, right: 15, bottom: 20, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={75}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  cursor={{ fill: "var(--secondary)" }}
                />
                <Bar
                  dataKey="total"
                  name="Objetos"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="chart-panel">
          <h2>Categoria × situação</h2>
          <p>Distribuição e andamento dos registros</p>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories} margin={{ top: 10, right: 10, bottom: 20, left: -25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  angle={-20}
                  textAnchor="end"
                  height={65}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                  cursor={{ fill: "var(--secondary)" }}
                />
                <Legend />
                <Bar
                  dataKey="achados"
                  name="Achados"
                  stackId="a"
                  fill="var(--primary)"
                  maxBarSize={38}
                />
                <Bar
                  dataKey="perdidos"
                  name="Perdidos"
                  stackId="a"
                  fill="var(--muted-foreground)"
                />
                <Bar
                  dataKey="devolvidos"
                  name="Devolvidos"
                  stackId="a"
                  fill="var(--success)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="chart-panel">
          <h2>Reivindicações</h2>
          <p>Solicitações recebidas por situação</p>
          {claimData.length ? (
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={claimData} margin={{ left: -25, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    cursor={{ fill: "var(--secondary)" }}
                  />
                  <Bar
                    dataKey="total"
                    name="Solicitações"
                    fill="var(--success)"
                    maxBarSize={60}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty-state">Sem reivindicações neste período.</p>
          )}
        </section>
        <section className="chart-panel">
          <h2>Resumo dos locais</h2>
          <p>Todos os registros do período selecionado</p>
          <div className="table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Local / bloco</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td>{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
        {connection === "online" && (
     <section className="mt-10 border-t border-border pt-7">
       <h2 className="text-sm font-semibold mb-4">
         Gráficos originais da API · todos os períodos
       </h2>
       <div className="flex gap-3 flex-wrap">
         {[
           { slug: "consulta-1-blocos", label: "Por bloco" },
           { slug: "consulta-2-categorias-status", label: "Categoria × status" },
           { slug: "consulta-3-reivindicacoes", label: "Reivindicações" },
         ].map(({ slug, label }) => (
           <Button
             key={slug}
             variant="outline"
             disabled={loadingChart}
             onClick={() => void openApiChart(slug, label)}
           >
             {label}
             <ArrowUpRight />
           </Button>
         ))}
       </div>
       <p className="modal-subtitle mt-3">
         Os gráficos originais não recebem filtros de data do servidor.
       </p>

       {apiChart && (
         <div className="mt-6 rounded-xl border border-border bg-card p-4">
           <div className="flex items-center justify-between mb-3">
             <span className="text-sm font-semibold">
               Gráfico original (Matplotlib): {apiChart.title}
             </span>
             <div className="flex gap-2">
               <Button variant="outline" size="sm" asChild>
                 <a href={apiChart.url} download={`grafico-${apiChart.title}.png`}>
                   <Download size={14} /> Baixar PNG
                 </a>
               </Button>
               <Button variant="ghost" size="sm" onClick={() => setApiChart(null)}>
                 Fechar
               </Button>
             </div>
           </div>
           <img
             src={apiChart.url}
             alt={apiChart.title}
             className="w-full max-w-3xl rounded-lg border border-border bg-white mx-auto"
           />
         </div>
       )}
     </section>
    )}
  </main>
  );
}
