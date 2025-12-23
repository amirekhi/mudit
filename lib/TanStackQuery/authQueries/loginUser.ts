export interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser({ email, password }: LoginInput) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
 

  return data;
}
