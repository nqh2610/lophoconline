import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { storage } from "./storage";
import { db } from "./db";
import { lessons } from "./schema";
import { eq, or, and } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await storage.getUserByUsername(credentials.username);

        if (!user) {
          return null;
        }

        // Check if user is active
        if (user.isActive === 0) {
          throw new Error("Tài khoản đã bị khóa");
        }

        const isValidPassword = await storage.verifyPassword(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          return null;
        }

        // Check if user is a student (has enrolled or trial lessons)
        let isStudent = false;
        try {
          const userLessons = await db
            .select()
            .from(lessons)
            .where(
              and(
                eq(lessons.studentId, user.id.toString()),
                or(
                  eq(lessons.isTrial, 1),
                  eq(lessons.status, "confirmed"),
                  eq(lessons.status, "completed")
                )
              )
            )
            .limit(1);
          isStudent = userLessons.length > 0;
        } catch (error) {
          console.error("Error checking student status:", error);
        }

        // Return user without password
        return {
          id: user.id.toString(),
          name: user.username,
          email: user.email || undefined,
          role: user.role,
          isStudent,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isStudent = user.isStudent;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isStudent = token.isStudent as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
