// AUTH CONTEXT: Makes the current logged-in account available to all React pages.
// React Context is NOT a database. It only stores the user returned by Express.
import { createContext, useContext, useEffect, useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";
import { authService } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // The current user from GET /api/auth/me.
  const [loading, setLoading] = useState(true); // Check login on startup.

  // Existing admin profile UI preferences remain local until profile APIs exist.
  const [savedName, setName] = usePersistedState(STORAGE_KEYS.adminName, "Admin User");
  const [savedEmail, setEmail] = usePersistedState(STORAGE_KEYS.adminEmail, "");
  const [photo, setPhoto] = usePersistedState(STORAGE_KEYS.adminPhoto, "");

  useEffect(() => {
    let active = true; // Avoid changing state after this component unmounts.

    // Browser sends its saved HttpOnly cookie automatically.
    authService.me()
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        if (active) setUser(null); // No valid cookie = logged out.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; }; // Cleanup if the app unmounts.
  }, []);

  // Called from LoginPage. Express verifies the password before returning.
  async function login(identifier, password, remember) {
    const result = await authService.login(identifier, password, remember);
    setUser(result.user); // Makes the navbar and protected routes update.
    return result.user;
  }

  // Called when the user clicks Logout in the header.
  async function logout() {
    try {
      await authService.logout();
    } finally {
      setUser(null); // Clear React state even if the server cannot be reached.
    }
  }

  const displayName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  // All components inside <AuthProvider> can call useAuth() to read this data.
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loggedIn: Boolean(user),
      role: user?.role || null,
      login,
      logout,
      name: user?.role === "admin" ? savedName : displayName,
      email: user?.role === "admin" ? (savedEmail || user.email) : (user?.email || ""),
      photo,
      setName,
      setEmail,
      setPhoto,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// A tiny helper so pages can use const { user } = useAuth().
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
