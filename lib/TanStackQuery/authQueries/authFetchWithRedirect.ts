import { useRouter } from "next/navigation";
import { queryClient } from "@/lib/TanStackQuery/queryClient";

export async function authFetchWithRedirect(input: RequestInfo, init?: RequestInit) {
  const router = useRouter(); // this can only be used inside a hook
  try {
    const res = await fetch(input, { ...init, credentials: "include" });
    if (res.status === 401) {
      queryClient.setQueryData(["current-user"], null);
      router.replace("/login");
      throw new Error("UNAUTHORIZED");
    }
    return res;
  } catch (err) {
    router.replace("/login");
    throw err;
  }
}
