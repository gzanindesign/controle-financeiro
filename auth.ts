import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      if (ALLOWED_EMAILS.length === 0) return true; // sem restrição se não configurado
      return ALLOWED_EMAILS.includes(user.email.toLowerCase());
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
