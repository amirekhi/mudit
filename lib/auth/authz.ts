import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export type Visibility = "private" | "public";

/** Field that holds the owner's Mongo _id on tracks and playlists. Change it if yours differs. */
export const OWNER_FIELD = "ownerId";

/** Upper bound for id lists in one request. */
export const MAX_IDS = 100;

/**
 * JSON error body. Both keys are sent because some of your client code reads `message`
 * and some reads `error`.
 */
export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message, message }, { status });
}

type Authed = { ok: true; user: any } | { ok: false; response: NextResponse };

/**
 * Usage in a route:
 *   const auth = await requireUser();
 *   if (!auth.ok) return auth.response;
 *   const user = auth.user;
 *
 * 401 = not signed in, 403 = signed in but not allowed. The role is read from Mongo on every
 * request, so demoting or disabling a user takes effect immediately.
 */
export async function requireUser(): Promise<Authed> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: errorResponse(401, "Unauthorized") };
  if (user.isActive === false) return { ok: false, response: errorResponse(403, "Account disabled") };
  return { ok: true, user };
}

export async function requireAdmin(): Promise<Authed> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  if (auth.user.role !== "admin") {
    return { ok: false, response: errorResponse(403, "Forbidden - Admins only") };
  }
  return auth;
}

export const isAdmin = (user: { role?: string } | null | undefined) => user?.role === "admin";

/* ───────────── input validation ───────────── */

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

/** Returns the id (lowercased) only if it is a 24-char hex string. Rejects objects like {"$ne": null}. */
export function parseObjectId(value: unknown): string | null {
  return typeof value === "string" && OBJECT_ID.test(value) ? value.toLowerCase() : null;
}

/** Array of valid ids, de-duplicated in order. null if invalid, too long, or shorter than `min`. */
export function parseIdList(value: unknown, opts: { min?: number; max?: number } = {}): string[] | null {
  const { min = 1, max = MAX_IDS } = opts;
  if (!Array.isArray(value) || value.length > max) return null;
  const ids: string[] = [];
  for (const v of value) {
    const id = parseObjectId(v);
    if (!id) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.length >= min ? ids : null;
}

/** Trimmed, non-empty string within the length limit, otherwise null. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 && v.length <= max ? v : null;
}

/** Optional text: missing -> "", valid -> trimmed, invalid (wrong type or too long) -> null. */
export function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) return null;
  return value.trim();
}

/**
 * https URL only. If MEDIA_ORIGIN is set (for example https://abcd1234.supabase.co), the URL
 * must also come from that origin, so nobody can point a track or cover at an arbitrary site.
 */
export function isTrustedUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const allowed = process.env.MEDIA_ORIGIN;
    return allowed ? url.origin === new URL(allowed).origin : true;
  } catch {
    return false;
  }
}

/* ───────────── visibility rule ───────────── */

/**
 * Only admins may publish. A missing value means private.
 *   non-admin asking for "public" -> 403, anything other than private/public -> 400.
 */
export function resolveVisibility(
  user: { role?: string } | null | undefined,
  requested: unknown
): { ok: true; visibility: Visibility } | { ok: false; response: NextResponse } {
  if (requested === undefined || requested === null || requested === "private") {
    return { ok: true, visibility: "private" };
  }
  if (requested === "public") {
    if (!isAdmin(user)) {
      return { ok: false, response: errorResponse(403, "Only admins can publish content") };
    }
    return { ok: true, visibility: "public" };
  }
  return { ok: false, response: errorResponse(400, "Invalid visibility") };
}