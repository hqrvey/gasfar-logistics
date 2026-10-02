import { createContext, useContext, useMemo } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = usePersistedState(STORAGE_KEYS.loggedIn, false);
  const [role, setRole] = usePersistedState(STORAGE_KEYS.authRole, null);
  const [name, setName] = usePersistedState(STORAGE_KEYS.adminName, "Admin User");
  const [email, setEmail] = usePersistedState(STORAGE_KEYS.adminEmail, "admin@gasfar.com");
  const [photo, setPhoto] = usePersistedState(STORAGE_KEYS.adminPhoto, "");

  const login = (userRole) => {
    setLoggedIn(true);
    setRole(userRole);
  };

  const logout = () => {
    setLoggedIn(false);
    setRole(null);
  };

  const value = useMemo(
    () => ({
      loggedIn,
      role,
      name,
      email,
      photo,
      login,
      logout,
      setName,
      setEmail,
      setPhoto,
    }),
    [loggedIn, role, name, email, photo, setLoggedIn, setRole, setName, setEmail, setPhoto]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return context;
}
