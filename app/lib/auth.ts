import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/app/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          omit: { password: false },
        });

        if (!user) return null;

        const isPasswordOk = await bcrypt.compare(
          credentials.password as string, 
          user.password
        );

        if (!isPasswordOk) return null;

        // Convert the numeric ID to a string to satisfy NextAuth's User type
        return {
          ...user,
          id: user.id.toString(),
        };
      }

    })
  ],
  callbacks: {

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // This tells the middleware that the session is valid
      return true; 
    },
    
    async jwt({ token, user }) {
      // 'user' is only available the first time the JWT is created (on sign in)
      if (user) {
        token.role = user.role ?? "USER";
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.email = token.email as string;
      }
      return session;
    }
  }
})
