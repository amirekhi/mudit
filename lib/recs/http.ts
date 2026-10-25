import { errorResponse, isAdmin } from "@/lib/auth/authz";
import { RecError } from "./validate";
import type { Actor } from "./service";

type AuthUser = Parameters<typeof isAdmin>[0];

/** Who is calling, in the shape the service layer expects. */
export function actorFrom(user: AuthUser & { _id: unknown }): Actor {
  return { userId: String(user._id), isAdmin: isAdmin(user), via: "ui" };
}

/** Known errors go back to the caller as-is; anything else is a generic 500. */
export function recFail(err: unknown, label: string) {
  if (err instanceof RecError) return errorResponse(err.status, err.message);
  console.error(label, err);
  return errorResponse(500, "Something went wrong");
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({}));
}