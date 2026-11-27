import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Settings2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Wrench,
  ShieldCheck,
  Eye,
  Play,
  LoaderCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/features/app-context";
import { ErrorMessage, Field, metadata, Restricted } from "@/features/common";
import { resources, fieldLabel } from "@/data/resources";
import type { RecordData } from "@/data/types";
import {
  clearDatabase,
  conferClaim,
  deleteResource,
  listResource,
  operation,
  request,
  retryConnection,
  saveResource,
} from "@/services/api";

export const Route = createFileRoute("/gestao")({
  head: () =>
    metadata(
      "Gestão do sistema",
      "Administração de objetos, usuários, locais, catálogos, reivindicações e rotinas do Protocolo UFSCAchados.",
    ),
  component: Admin,
});

function Admin() {
  const { role, currentUser, refresh, connection } = useApp();
  const [path, setPath] = useState("objetos");
  const [rows, setRows] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<RecordData | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [remove, setRemove] = useState<RecordData | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [confirmOperation, setConfirmOperation] = useState("");
  const [matchId, setMatchId] = useState("");
  const [consultId, setConsultId] = useState("");
  const [search, setSearch] = useState("");

  const resource = resources.find((r) => r.path === path);
  const operations = path === "operacoes";

  const load = useCallback(async () => {
    if (role !== "operador" || path === "operacoes") return;
    setLoading(true);
    setError("");
    try {
      setRows(await listResource(path));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [path, role]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resource || !edit) return;
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const fields = isNew
      ? resource.fields
      : resource.fields.filter((f) => resource.editFields.includes(f.key));
    const body: RecordData = {};
    fields.forEach((f) => {
      const value = String(form.get(f.key) ?? "");
      if (value !== "") body[f.key] = f.type === "number" ? Number(value) : value;
    });
    body[resource.idKey] = Number(edit[resource.idKey]);
    try {
      await saveResource(path, body, resource.idKey, !isNew);
      setEdit(null);
      await load();
      await refresh();
      toast.success(isNew ? "Registro criado." : "Alterações salvas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRow() {
    if (!resource || !remove) return;
    setBusy(true);
    setError("");
    try {
      await deleteResource(path, Number(remove[resource.idKey]), resource.idKey);
      setRemove(null);
      await load();
      await refresh();
      toast.success("Registro excluído.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      setResult(await fn());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setConfirmOperation("");
    }
  }

  const columns = rows.length
    ? Object.keys(rows[0] ?? {})
    : (resource?.fields.map((f) => f.key).filter((k) => k !== "detalhe_seguranca_oculto") ?? []);
  const displayRows = rows.filter((r) =>
    Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase())),
  );

  if (role !== "operador") return <Restricted />;

  return (
    <main className="page-width main-content fade-in">
      <div className="eyebrow">
        <Settings2 size={12} />
        Área do Protocolo
      </div>
      <h1 className="page-title">Gestão da comunidade</h1>
      <p className="page-description">Registros, catálogos e rotinas em um só lugar.</p>
      <div className="admin-layout">
        <nav className="admin-tabs" aria-label="Seções da gestão">
          {resources.map((r) => (
            <Button
              variant="ghost"
              key={r.path}
              className={path === r.path ? "active" : ""}
              onClick={() => {
                setPath(r.path);
                setSearch("");
                setError("");
              }}
            >
              {r.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            className={operations ? "active" : ""}
            onClick={() => {
              setPath("operacoes");
              setError("");
            }}
          >
            <Wrench />
            Operações
          </Button>
        </nav>
        <section className="admin-content">
          <ErrorMessage message={!edit && !remove ? error : ""} />
          {resource && (
            <>
              <div className="admin-toolbar">
                <h2>
                  {resource.label}
                  <span className="ml-2 text-xs text-muted-foreground">{rows.length}</span>
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Atualizar listagem"
                    onClick={() => void load()}
                  >
                    <RefreshCw className={loading ? "spin" : ""} />
                  </Button>
                  <Button
                    onClick={() => {
                      setIsNew(true);
                      setError("");
                      setEdit({
                        [resource.idKey]:
                          Math.max(99, ...rows.map((r) => Number(r[resource.idKey]))) + 1,
                      });
                    }}
                  >
                    <Plus />
                    Novo registro
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 mb-5">
                <input
                  placeholder="Buscar nesta listagem..."
                  aria-label="Buscar na gestão"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-sm text-xs"
                />
                {path === "objetos" && (
                  <div className="flex gap-2 ml-auto">
                    <input
                      className="max-w-24 text-xs"
                      aria-label="Consultar objeto por ID"
                      type="number"
                      min={1}
                      placeholder="ID objeto"
                      value={consultId}
                      onChange={(e) => setConsultId(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      title="Consultar objeto por ID"
                      disabled={!consultId}
                      onClick={() =>
                        void run(async () =>
                          connection === "demo"
                            ? (rows.find((r) => r["id_objeto"] === Number(consultId)) ?? {
                                mensagem: "Objeto não encontrado.",
                              })
                            : request(`/objetos/${consultId}`),
                        )
                      }
                    >
                      <Eye />
                    </Button>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" />
                  Carregando registros...
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="report-table">
                    <thead>
                      <tr>
                        {columns.map((k) => (
                          <th key={k}>{fieldLabel(k)}</th>
                        ))}
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((r, i) => (
                        <tr key={String(r[resource.idKey] ?? i)}>
                          {columns.map((k) => (
                            <td key={k} title={String(r[k] ?? "")}>
                              {String(r[k] ?? "—")}
                            </td>
                          ))}
                          <td>
                            <div className="table-actions">
                              {resource.editFields.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Editar registro"
                                  onClick={() => {
                                    setIsNew(false);
                                    setEdit(r);
                                    setError("");
                                  }}
                                >
                                  <Pencil />
                                </Button>
                              )}
                              {path === "reivindicacoes" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Conferir reivindicação"
                                  onClick={() =>
                                    void run(() => conferClaim(Number(r["id_reivindicacao"]), currentUser?.id ?? 2))
                                  }
                                >
                                  <ShieldCheck />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir registro"
                                onClick={() => {
                                  setRemove(r);
                                  setError("");
                                }}
                              >
                                <Trash2 className="text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!displayRows.length && (
                    <p className="empty-state">Nenhum registro encontrado.</p>
                  )}
                </div>
              )}
            </>
          )}
          {operations && (
            <>
              <h2 className="text-xl font-semibold mb-3">Operações do Protocolo</h2>
              <div className="operation-row">
                <div>
                  <h3>Conexão com o FastAPI</h3>
                  <p>
                    {connection === "demo"
                      ? "Offline · demonstração nesta sessão"
                      : "Conectado ao servidor"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      retryConnection();
                      await refresh();
                      return { mensagem: "Nova tentativa de conexão concluída." };
                    })
                  }
                >
                  <RefreshCw />
                  Reconectar
                </Button>
              </div>
              <div className="operation-row">
                <div>
                  <h3>Processar vencimentos</h3>
                  <p>Encaminhar itens com prazo de guarda expirado para doação.</p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmOperation("vencimentos")}
                >
                  <ClockIcon />
                  Processar
                </Button>
              </div>
              <div className="operation-row">
                <div>
                  <h3>Correspondência automática</h3>
                  <p>Comparar categoria e cor de um achado com alertas de perda.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    aria-label="ID do objeto para correspondência"
                    placeholder="ID do achado"
                    min={1}
                    value={matchId}
                    onChange={(e) => setMatchId(e.target.value)}
                    className="max-w-32 text-xs"
                  />
                  <Button
                    disabled={!matchId || busy}
                    onClick={() =>
                      void run(() => operation(`/operacoes/executar-match/${matchId}`))
                    }
                  >
                    <Play />
                    Executar
                  </Button>
                </div>
              </div>
              <div className="operation-row">
                <div>
                  <h3>Inicializar banco</h3>
                  <p>Criar a estrutura e os registros iniciais do sistema.</p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setConfirmOperation("inicializar")}
                >
                  Inicializar
                </Button>
              </div>
              <div className="operation-row">
                <div>
                  <h3 className="text-destructive">Limpar banco</h3>
                  <p>Remover todos os registros. Esta ação não pode ser desfeita.</p>
                </div>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setConfirmOperation("limpar")}
                >
                  <Trash2 />
                  Limpar
                </Button>
              </div>
            </>
          )}
          {result !== null && (
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <h3 className="text-sm">Resultado da consulta</h3>
                <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
                  Fechar
                </Button>
              </div>
              <pre className="api-result">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </section>
      </div>
      <Dialog
        open={edit !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setEdit(null);
        }}
      >
        <DialogContent className="modal-content">
          <DialogTitle>
            {isNew ? "Novo registro" : "Editar registro"} · {resource?.label}
          </DialogTitle>
          <DialogDescription className="modal-subtitle">
            {isNew
              ? "Preencha os dados abaixo."
              : "Altere os campos disponíveis para este registro."}
          </DialogDescription>
          {resource && edit && (
            <form className="form-stack" onSubmit={(e) => void save(e)}>
              {(isNew
                ? resource.fields
                : resource.fields.filter((f) => resource.editFields.includes(f.key))
              ).map((f) => (
                <Field key={f.key} label={`${fieldLabel(f.key)}${f.required && isNew ? " *" : ""}`}>
                  {f.key === "status" && path === "reivindicacoes" ? (
                    <select
                      name={f.key}
                      defaultValue={String(edit[f.key] ?? "EM_ANALISE")}
                      required={f.required && isNew}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) => {
                        setEdit({ ...edit, [f.key]: e.target.value });
                      }}
                    >
                      <option value="EM_ANALISE">EM_ANALISE</option>
                      <option value="APROVADA">APROVADA</option>
                      <option value="REJEITADA">REJEITADA</option>
                    </select>
                  ) : (
                    <input
                      name={f.key}
                      type={f.type}
                      defaultValue={String(edit[f.key] ?? "")}
                      placeholder={
                        !isNew && f.key === "detalhe_seguranca_oculto"
                          ? "Deixe em branco para manter o segredo atual"
                          : undefined
                      }
                      required={f.required && isNew}
                      min={f.type === "number" ? 1 : undefined}
                      onChange={(e) => {
                        if (f.key === resource.idKey)
                          setEdit({ ...edit, [f.key]: Number(e.target.value) });
                      }}
                    />
                  )}
                </Field>
              ))}
              <ErrorMessage message={error} />
              <Button type="submit" disabled={busy}>
                {busy ? "Salvando..." : "Salvar registro"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={remove !== null}
        onOpenChange={(o) => {
          if (!o && !busy) setRemove(null);
        }}
      >
        <DialogContent className="modal-content">
          <DialogTitle>Excluir este registro?</DialogTitle>
          <DialogDescription>
            Esta ação é permanente. Registros vinculados podem impedir a exclusão.
          </DialogDescription>
          <ErrorMessage message={error} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemove(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void deleteRow()}>
              Confirmar exclusão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmOperation}
        onOpenChange={(o) => {
          if (!o) setConfirmOperation("");
        }}
      >
        <DialogContent className="modal-content">
          <DialogTitle>Confirmar operação</DialogTitle>
          <DialogDescription>
            {confirmOperation === "limpar"
              ? "Todos os dados serão removidos permanentemente."
              : confirmOperation === "inicializar"
                ? "A estrutura e os registros iniciais serão criados."
                : "Os objetos vencidos serão encaminhados para doação."}
            {connection === "demo" ? " A operação afeta somente a demonstração desta sessão." : ""}
          </DialogDescription>
          <Button
            variant={confirmOperation === "limpar" ? "destructive" : "default"}
            disabled={busy}
            onClick={() =>
              void run(() =>
                confirmOperation === "limpar"
                  ? clearDatabase()
                  : operation(
                      confirmOperation === "inicializar"
                        ? "/banco/inicializar"
                        : `/operacoes/processar-vencimentos?id_operador=${currentUser?.id ?? 2}`,
                    ),
              )
            }
          >
            {busy ? "Processando..." : "Confirmar"}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const ClockIcon = RefreshCw;
