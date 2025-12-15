import { authFetch } from "./authFetch";

export interface CurrentUser {
  username: string;
  email: string;
  profileImageUrl?: string | null;
  role: string;
  createdAt: string;
  // Add more fields if needed
}


export async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await authFetch("/api/auth/me");

  if (!res.ok) {
    return null;
  }

  const data = await res.json();

  return {
    username: data.username,
    email: data.email,
    profileImageUrl: data.profileImageUrl || null,
    role: data.role,
    createdAt: data.createdAt,
  };
}
