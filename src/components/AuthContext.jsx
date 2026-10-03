import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
const AuthContext = createContext({ account: null, loading: true });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const client = useQueryClient();
  const [auth, setAuth] = useState({ account: null, csrf: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) throw new Error("Unable to load your account.");
      setAuth(await response.json());
      setError("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    client.removeQueries({
      predicate: (query) =>
        (query.queryKey[0] === "watchlist-ids" &&
          query.queryKey[1] !== auth.account?.id) ||
        (["api", "media"].includes(query.queryKey[0]) &&
          String(query.queryKey[1]).startsWith("/api/account/") &&
          query.queryKey[2] !== auth.account?.id),
    });
  }, [auth.account?.id, client]);
  const mutate = useCallback(
    async (path, body = {}) => {
      const response = await fetch(path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": auth.csrf || "",
        },
        body: JSON.stringify(body),
      });
      // Proxies and gateways can answer errors without a JSON body.
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setAuth({ account: null, csrf: auth.csrf });
      }
      if (!response.ok)
        throw new Error(data.error || "Account request failed.");
      return data;
    },
    [auth.csrf],
  );
  const value = useMemo(
    () => ({ ...auth, loading, error, refresh, mutate }),
    [auth, loading, error, refresh, mutate],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
