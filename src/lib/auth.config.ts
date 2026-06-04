import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Edge-safe auth config — no Node.js-only imports (no bcrypt, no Prisma)
// Used by middleware/proxy for session checking only.
// The full config in auth.ts adds the Prisma adapter and password hashing.
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      // authorize is only called in auth.ts (full config), not here
      authorize: () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      const isAppRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/upload") ||
        pathname.startsWith("/sessions") ||
        pathname.startsWith("/tracks") ||
        pathname.startsWith("/cars") ||
        pathname.startsWith("/goals") ||
        pathname.startsWith("/achievements") ||
        pathname.startsWith("/setups") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/onboarding")

      if (isAppRoute) return isLoggedIn
      return true
    },
  },
}
