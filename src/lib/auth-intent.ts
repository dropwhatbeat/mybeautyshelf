const KEY = "shelf-auth-intent";

export type AuthIntent = "/add";

export function saveAuthIntent(intent: AuthIntent) {
  try {
    localStorage.setItem(KEY, intent);
  } catch {
    /* storage unavailable */
  }
}

export function takeAuthIntent(): AuthIntent | null {
  try {
    const value = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    return value === "/add" ? value : null;
  } catch {
    return null;
  }
}