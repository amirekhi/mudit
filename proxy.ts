import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Page routes that need a signed-in user. Add your own (e.g. "/playlists(.*)").
// Defence in depth: the (protected) layout also checks auth + onboarding on the server,
// and every API route checks via getCurrentUser(), so this list is the first line, not the only one.
// API routes are deliberately NOT listed here: they return their own JSON 401s.
const isProtectedPage = createRouteMatcher([
  "/onboarding(.*)",
  "/profile(.*)",
  "/createPlaylist(.*)",
  "/createSong(.*)",
  "/tracks",
  "/playlists",
  "/edit(.*)",
]);
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
