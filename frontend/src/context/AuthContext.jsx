// AUTH CONTEXT: Makes the current logged-in account available to all React pages.
// React Context is NOT a database. It only stores the user returned by Express.
import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // The current user from GET /api/auth/me.
  const [loading, setLoading] = useState(true); // Check login on startup.


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

  // Fetch updated profile after a user edits their account.
  async function refreshUser() {
    const result = await authService.me();
    setUser(result.user);
    return result.user;
  }

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
      refreshUser,
      name: displayName,
      email: user?.email || "",
      photo: user?.hasProfilePhoto ? (import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/extra/me/photo" : "",
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
