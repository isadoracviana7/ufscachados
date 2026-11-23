import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  MapPin,
  ChevronDown,
  LogIn,
  LogOut,
  BarChart3,
  Settings2,
  Bell,
  ArrowUpRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { logo } from "@/data/assets";
import type { Role } from "@/data/types";
import { useApp } from "./app-context";
import { listResource } from "@/services/api";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { role, setRole, currentUser, connection } = useApp();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState<string[] | null>(null);

  const changeRole = (r: Role) => {
    setRole(r);
    setMenu(false);
  };

  const displayName =
    currentUser?.name ?? (role === "operador" ? "Lucas Mendes" : "Ana Carolina");
  const shortName = displayName.trim().split(/\s+/)[0] ?? displayName;
  const initials = getInitials(displayName);
  const activeUserId = currentUser?.id ?? (role === "operador" ? 2 : 1);

  return (
    <>
      <header className="top-header">
        <div className="page-width">
          <Link to="/" className="brand" aria-label="UFSCAchados, início">
            <img src={logo} alt="" />
            <div>
              <div className="brand-name">
                UFSC<span className="font-normal">achados</span>
              </div>
              <div className="brand-sub">Um reencontro começa aqui</div>
            </div>
          </Link>
          <nav className="top-nav" aria-label="Principal">
            <Link to="/" className={pathname === "/" ? "active" : ""}>
              Mural de objetos
            </Link>
            {role === "operador" ? (
              <>
                <Link to="/relatorios" className={pathname === "/relatorios" ? "active" : ""}>
                  Relatórios
                </Link>
                <Link to="/gestao" className={pathname === "/gestao" ? "active" : ""}>
                  Gestão
                </Link>
              </>
            ) : (
              <Link to="/boas-vindas" className={pathname === "/boas-vindas" ? "active" : ""}>
                Sobre o projeto
              </Link>
            )}
          </nav>
          <div className="session-area">
            <select
              className="session-select"
              aria-label="Simular perfil"
              title="Simulador de sessão"
              value={role}
              onChange={(e) => changeRole(e.target.value as Role)}
            >
              <option value="visitante">Visitante</option>
              <option value="usuario">Usuário UFSC</option>
              <option value="operador">Operador</option>
            </select>
            {role !== "visitante" && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notificações"
                className="hidden md:inline-flex"
                onClick={async () => {
                  const rows = await listResource("notificacoes");
                  setNotifications(
                    rows
                      .filter((r) => Number(r["id_usuario"]) === activeUserId)
                      .map((r) => String(r["mensagem"])),
                  );
                }}
              >
                <Bell />
              </Button>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                className="profile-button hover:bg-primary-foreground/10"
                onClick={() => setMenu(!menu)}
                aria-label="Menu do perfil"
                aria-expanded={menu}
              >
                {role === "visitante" ? (
                  <>
                    <LogIn />
                    <span className="profile-label text-xs">Entrar</span>
                  </>
                ) : (
                  <>
                    <span className="avatar">{initials}</span>
                    <span className="profile-label text-xs">{shortName}</span>
                  </>
                )}
                <ChevronDown className="chevron" />
              </Button>
              {menu && (
                <div className="profile-menu">
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {role === "visitante" ? (
                      "Acesso de visitante"
                    ) : (
                      <>
                        <div className="font-semibold text-foreground">{displayName}</div>
                        <div>
                          {role === "operador"
                            ? `Operador do Protocolo (ID ${activeUserId})`
                            : `Comunidade UFSC (ID ${activeUserId})`}
                        </div>
                      </>
                    )}
                  </div>
                  {role === "operador" && (
                    <>
                      <Link to="/relatorios" onClick={() => setMenu(false)}>
                        <BarChart3 size={16} />
                        Gerar relatórios
                      </Link>
                      <Link to="/gestao" onClick={() => setMenu(false)}>
                        <Settings2 size={16} />
                        Gestão do sistema
                      </Link>
                    </>
                  )}
                  {role === "visitante" ? (
                    <Link to="/acesso" onClick={() => setMenu(false)}>
                      <LogIn size={16} />
                      Login com idUFSC
                    </Link>
                  ) : (
                    <>
                      <Link to="/acesso" onClick={() => setMenu(false)}>
                        <UserCheck size={16} />
                        Trocar usuário
                      </Link>
                      <Button variant="ghost" onClick={() => changeRole("visitante")}>
                        <LogOut />
                        Sair
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="campus-strip">
        <div className="page-width">
          <div className="campus-text flex items-center gap-2">
            <MapPin size={12} />
            <span>
              Universidade Federal de Santa Catarina <span className="mx-2 opacity-40">/</span>{" "}
              Campus Araranguá
            </span>
          </div>
          <nav className="mobile-nav">
            <Link to="/" className={pathname === "/" ? "active" : ""}>
              Mural
            </Link>
            {role === "operador" ? (
              <>
                <Link to="/relatorios">Relatórios</Link>
                <Link to="/gestao">Gestão</Link>
              </>
            ) : (
              <Link to="/boas-vindas">Sobre</Link>
            )}
          </nav>
          <span
            className={`connection-label ${connection === "demo" ? "connection-demo" : ""}`}
            title={
              connection === "demo"
                ? "API local indisponível. Alterações mantidas somente nesta sessão."
                : "Conexão com o backend FastAPI"
            }
          >
            <i className="connection-dot" />
            {connection === "demo"
              ? "Modo demonstração"
              : connection === "online"
                ? "API conectada"
                : "Conectando à API..."}
          </span>
        </div>
      </div>
      {children}
      <footer className="footer">
        <div className="page-width">
          <div>
            <span className="footer-brand">UFSCAchados</span>Feito para conectar a nossa comunidade.
          </div>
          <div className="footer-links">
            <Link to="/boas-vindas">
              O projeto <ArrowUpRight size={10} className="inline" />
            </Link>
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} /> Privacidade em primeiro lugar
            </span>
            <span>UFSC · 2026</span>
          </div>
        </div>
      </footer>
      <Dialog open={notifications !== null} onOpenChange={() => setNotifications(null)}>
        <DialogContent className="modal-content">
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>Atualizações das suas solicitações.</DialogDescription>
          {notifications?.length ? (
            notifications.map((n, i) => (
              <div className="notice" key={i}>
                <Bell />
                {n}
              </div>
            ))
          ) : (
            <p className="modal-subtitle">Nenhuma notificação por enquanto.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
