// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [role, setRole]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agriwise_user');
      if (raw) { const p = JSON.parse(raw); setUser(p.user); setRole(p.role); }
    } catch { localStorage.removeItem('agriwise_user'); }
    finally { setLoading(false); }
  }, []);

  /**
   * Replace mock with your real auth (Supabase / Firebase / custom API).
   * Must resolve to { user: { id, name, email }, role }
   */
  const login = async ({ email, password, role: r }) => {
    if (!email || !password) throw new Error('Email and password are required');
    // ── MOCK (replace with real API call) ──────────────────────────────────
    const userData = { id: Date.now().toString(), name: email.split('@')[0], email };
    // ──────────────────────────────────────────────────────────────────────
    setUser(userData); setRole(r);
    localStorage.setItem('agriwise_user', JSON.stringify({ user: userData, role: r }));
    return { user: userData, role: r };
  };

  const logout = () => {
    setUser(null); setRole(null);
    localStorage.removeItem('agriwise_user');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>');
  return ctx;
}
