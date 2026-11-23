import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { listItems, subscribeConnection, type Connection } from "@/services/api";
import type { Item, Role } from "@/data/types";

export interface SessionUser {
  id: number;
  name: string;
  role: Role;
}

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  currentUser: SessionUser | null;
  loginAs: (user: SessionUser | null) => void;
  items: Item[];
  refresh: () => Promise<void>;
  loading: boolean;
  connection: Connection;
  error: string;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("visitante");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection>("conectando");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setItems(await listItems());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os objetos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = window.localStorage.getItem("ufscachados-user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as SessionUser;
        if (parsed?.id && parsed?.name && (parsed.role === "usuario" || parsed.role === "operador")) {
          setCurrentUser(parsed);
          setRoleState(parsed.role);
          return;
        }
      } catch {
        window.localStorage.removeItem("ufscachados-user");
      }
    }

    const saved = window.localStorage.getItem("ufscachados-role");
    if (saved === "usuario" || saved === "operador") setRoleState(saved);
  }, []);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
    window.localStorage.setItem("ufscachados-role", next);
    setCurrentUser(null);
    window.localStorage.removeItem("ufscachados-user");
  }, []);

  const loginAs = useCallback((user: SessionUser | null) => {
    if (!user || user.role === "visitante") {
      setCurrentUser(null);
      setRoleState("visitante");
      window.localStorage.removeItem("ufscachados-user");
      window.localStorage.setItem("ufscachados-role", "visitante");
      return;
    }
    setCurrentUser(user);
    setRoleState(user.role);
    window.localStorage.setItem("ufscachados-user", JSON.stringify(user));
    window.localStorage.setItem("ufscachados-role", user.role);
  }, []);

  useEffect(() => {
    const unsub = subscribeConnection(setConnection);
    void refresh();
    return unsub;
  }, [refresh]);

  return (
    <AppContext.Provider
      value={{ role, setRole, currentUser, loginAs, items, refresh, loading, connection, error }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppProvider não encontrado");
  return ctx;
}
