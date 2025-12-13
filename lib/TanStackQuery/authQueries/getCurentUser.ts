import { authFetch } from "./authFetch";

export type CurrentUser =
  | { loggedIn: false }
  | { loggedIn: true; user: any };

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await authFetch("/api/auth/me");

  if (!res.ok) {
    return { loggedIn: false };
  }

  return res.json();
}
