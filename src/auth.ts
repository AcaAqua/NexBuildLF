import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPage = nextUrl.pathname === "/login" || nextUrl.pathname.startsWith("/api/auth");
      
      if (!isLoggedIn && !isPublicPage) {
        return false; // Redirect to login
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
})
