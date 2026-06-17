import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /auth/login (login page)
     * - /api/auth (NextAuth)
     * - /api/bot/telegram/webhook (Telegram webhook)
     * - /_next (Next.js internals)
     * - /static (static files)
     */
    "/((?!auth/login|api/auth|api/bot/telegram/webhook|_next|static|favicon.ico).*)",
  ],
};
