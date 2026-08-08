import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Resolves the currently authenticated user's id from the request's
 * session cookie, for use in Next.js Server Components and Route Handlers.
 * Returns null if there's no valid session — callers decide whether that
 * means "redirect to login" or "treat as anonymous" (e.g. the public
 * share-link routes never call this at all).
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
