import { createContext, useContext } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Demo-only authentication. Replace with real backend sessions later.
  const [loggedIn, setLoggedIn] = usePersistedState(STORAGE_KEYS.loggedIn, false);
  const [role, setRole] = usePersistedState(STORAGE_KEYS.authRole, null);
  const [name, setName] = usePersistedState(STORAGE_KEYS.adminName, "Admin User");
  const [email, setEmail] = usePersistedState(STORAGE_KEYS.adminEmail, "admin@gasfar.com");
  const [photo, setPhoto] = usePersistedState(STORAGE_KEYS.adminPhoto, "");

  function login(userRole) {
    setLoggedIn(true);
    setRole(userRole);
  }

  function logout() {
    setLoggedIn(false);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{
      loggedIn,
      role,
      login,
      logout,
      name,
      email,
      photo,
      setName,
      setEmail,
      setPhoto,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return auth;
}
