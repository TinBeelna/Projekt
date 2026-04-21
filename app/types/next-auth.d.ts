import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * The shape of the user object returned in the OAuth profile or database
   */
  interface User {
    id?: string; // Ensure this is string to match the login logic
    role?: string;
    stripeId?: string | null;
  }

  /**
   * The shape of the session object
   */
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
  }
}
