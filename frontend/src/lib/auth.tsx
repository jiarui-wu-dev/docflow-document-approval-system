import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { User } from "./types";
import { authenticate, clearCredentials, setUnauthorizedHandler } from "./api";
interface Auth {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  function logout() {
    clearCredentials();
    setUser(null);
    void queryClient.cancelQueries();
    queryClient.clear();
  }
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast.error("Your session ended. Sign in to continue.");
    });
  }, []); // Authentication lives only in memory.
  async function login(username: string, password: string) {
    const identity = await authenticate(username, password);
    queryClient.clear();
    setUser(identity);
  }
  return (
    <Context.Provider value={{ user, login, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const auth = useContext(Context);
  if (!auth) throw new Error("AuthProvider is required");
  return auth;
}
