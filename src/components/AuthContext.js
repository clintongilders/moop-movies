import React, { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext({ account: null, loading: true });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ account: null, csrf: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) throw new Error('Unable to load your account.');
      setAuth(await response.json());
      setError('');
    } catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function mutate(path, body = {}) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': auth.csrf || '' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Account request failed.');
    return data;
  }
  return <AuthContext.Provider value={{ ...auth, loading, error, refresh, mutate }}>{children}</AuthContext.Provider>;
}
