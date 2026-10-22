import { createContext, useContext, useEffect, useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { authService } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Retain the original admin profile UI preferences for now.
  const [savedName, setName] = usePersistedState(STORAGE_KEYS.adminName, "Admin User");
  const [savedEmail, setEmail] = usePersistedState(STORAGE_KEYS.adminEmail, "");
  const [photo, setPhoto] = usePersistedState(STORAGE_KEYS.adminPhoto, "");

  useEffect(() => {
    let active = true;
    authService.me()
      .then(({ user }) => { if (active) setUser(user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function login(identifier, password, remember) {
    const result = await authService.login(identifier, password, remember);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    try { await authService.logout(); }
    finally { setUser(null); }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, loggedIn: Boolean(user), role: user?.role || null,
      login, logout,
      name: user?.role === "admin" ? savedName : `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      email: user?.role === "admin" ? (savedEmail || user.email) : (user?.email || ""),
      photo, setName, setEmail, setPhoto,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
