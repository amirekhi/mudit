export interface SignupData {
  username: string;
  email: string;
  password: string;
  profileImageUrl?: string | null;
}

export async function signupUser(data: SignupData) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || "Something went wrong");
  }

  return result;
}
