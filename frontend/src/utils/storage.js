export const STORAGE_KEYS = {
  loggedIn: "gasfar_logged_in",
  authRole: "gasfar_auth_role",
  sidebar: "gasfar_sidebar",
  adminName: "gasfar_admin_name",
  adminEmail: "gasfar_admin_email",
  adminPhoto: "gasfar_admin_photo",
  users: "gasfar_users",
  drivers: "gasfar_drivers",
  deliveries: "gasfar_deliveries",
  complaints: "gasfar_complaints",
  warningCount: "gasfar_warning_count",
  prefs: "gasfar_prefs",
};

export function getSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function putSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (e.g. private mode): fail silently.
  }
}
