import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, ShieldCheck, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { logo } from "@/data/assets";
import { metadata } from "@/features/common";
import { useApp, type SessionUser } from "@/features/app-context";
import { listResource } from "@/services/api";

export const Route = createFileRoute("/acesso")({
  head: () =>
    metadata(
      "Acesso à comunidade",
      "Entre no UFSCAchados como membro da comunidade UFSC ou explore o mural público de objetos.",
    ),
  component: Access,
});

function Access() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SessionUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { loginAs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingUsers(true);

    Promise.all([
      listResource("usuarios"),
      listResource("usuarios/operador").catch(() => []),
    ])
      .then(([rawUsers, rawOperators]) => {
        if (!active) return;
        const operatorIds = new Set(
          rawOperators.map((op) => Number(op["id_usuario"] ?? op["id_operador"])),
        );

        const mapped: SessionUser[] = rawUsers
          .map((u) => {
            const id = Number(u["id_usuario"]);
            const name = String(u["name"] ?? u["nome"] ?? `Usuário #${id}`);
            const isOp = operatorIds.has(id);
            return {
              id,
              name,
              role: isOp ? ("operador" as const) : ("usuario" as const),
            };
          })
          .filter((u) => Number.isFinite(u.id) && u.id > 0);

        setUsers(mapped);
      })
      .catch(() => {
        if (active) setUsers([]);
      })
      .finally(() => {
        if (active) setLoadingUsers(false);
      });

    return () => {
      active = false;
    };
  }, [open]);

  function handleSelectUser(user: SessionUser | null) {
    loginAs(user);
    void navigate({ to: "/" });
  }

  return (
    <>
      <main className="welcome fade-in">
        <img src={logo} alt="Logotipo UFSCAchados" />
        <div>
          <h1>
            UFSC<span className="text-primary">Achados</span>
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-xs">
            <Globe size={13} />
            https://ufscachados.ufsc.br
          </p>
        </div>
        <p>
          Encontre o que procura.
          <br />
          Ajude alguém a reencontrar o que importa.
        </p>
        <div className="welcome-actions">
          <Button size="lg" className="h-12 justify-between" onClick={() => setOpen(true)}>
            Login <ArrowRight />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Você será direcionado para um navegador web
          </span>
          <Button variant="outline" className="mt-3 h-11" onClick={() => handleSelectUser(null)}>
            Explorar mural <ArrowRight />
          </Button>
        </div>
        <div className="pagination-dots" aria-label="Etapa 2 de 2">
          <span />
          <span className="active" />
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="modal-content max-h-[80vh] overflow-y-auto">
          <DialogTitle className="modal-title">Como você quer entrar?</DialogTitle>
          <DialogDescription className="modal-subtitle">
            Selecione um usuário cadastrado no banco de dados para esta sessão.
          </DialogDescription>

          {loadingUsers ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando usuários do banco...
            </div>
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado no banco de dados.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <Button
                  key={u.id}
                  variant="ghost"
                  className="role-option"
                  onClick={() => handleSelectUser(u)}
                >
                  {u.role === "operador" ? <ShieldCheck /> : <GraduationCap />}
                  <div className="text-left">
                    <strong>{u.name}</strong>
                    <small>
                      {u.role === "operador"
                        ? `Operador do Protocolo (ID ${u.id}) · Conferências e gestão`
                        : `Comunidade UFSC (ID ${u.id}) · Publicar e reivindicar`}
                    </small>
                  </div>
                  <ArrowRight className="ml-auto shrink-0" />
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
