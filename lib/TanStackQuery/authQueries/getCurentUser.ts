import { authFetch } from "./authFetch";

export interface CurrentUser {
  _id?: string;
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
    _id: data.user._id,  
    username: data.user.username,
    email: data.user.email,
    profileImageUrl: data.user.profileImageUrl || null,
    role: data.user.role,
    createdAt: data.user.createdAt,
  };
}
