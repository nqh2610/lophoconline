import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { storage } from "./storage";
import { parseRoles } from "./schema";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        try {
          console.log("🔐 Login attempt for username:", credentials?.username);

          if (!credentials?.username || !credentials?.password) {
            console.log("❌ Missing credentials");
            return null;
          }

          // OPTIMIZED: Check account lock and delay in ONE query
          const loginStatus = await storage.getLoginStatus(credentials.username);

          if (loginStatus.isLocked) {
            console.log("❌ Account locked:", credentials.username, `(${loginStatus.failedAttempts} failed attempts)`);
            throw new Error("Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút");
          }

          if (loginStatus.requiredDelay > 0) {
            const delaySeconds = Math.ceil(loginStatus.requiredDelay / 1000);
            console.log(`⏳ Delay required: ${delaySeconds} seconds (${loginStatus.failedAttempts} failed attempts)`);
            throw new Error(`Vui lòng đợi ${delaySeconds} giây trước khi thử lại`);
          }

          const user = await storage.getUserByUsername(credentials.username);

          if (!user) {
            console.log("❌ User not found:", credentials.username);
            // Record failed attempt (even if user doesn't exist, to prevent enumeration timing attacks)
            const ipAddress = null; // IP tracking simplified for now
            await storage.recordLoginAttempt(credentials.username, ipAddress, false);
            return null;
          }

          console.log("✅ User found:", user.username, "ID:", user.id);

          // Check if user is active
          if (user.isActive === 0) {
            console.log("❌ User account disabled:", credentials.username);
            throw new Error("Tài khoản đã bị khóa");
          }

          const isValidPassword = await storage.verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            console.log("❌ Invalid password for:", credentials.username);
            // Record failed login attempt
            const ipAddress = null; // IP tracking simplified for now
            await storage.recordLoginAttempt(credentials.username, ipAddress, false);
            return null;
          }

          console.log("✅ Password verified for:", credentials.username);

          // Record successful login
          const ipAddress = null; // IP tracking simplified for now
          await storage.recordLoginAttempt(credentials.username, ipAddress, true);

          // Parse roles from JSON string
          const roles = parseRoles(user.role);
          console.log("✅ User roles:", roles);

          console.log("✅ Login successful for:", credentials.username);

          // Return user without password
          return {
            id: user.id.toString(),
            name: user.fullName || user.username, // ✅ Use fullName if available, fallback to username
            email: user.email || undefined,
            roles,
          };
        } catch (error) {
          console.error("❌ Auth error:", error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Initial sign-in
        token.id = user.id;
        token.name = user.name; // Store user's full name for video call display
        token.email = user.email;
        token.roles = user.roles;
        token.role = JSON.stringify(user.roles); // Store as JSON string for backward compatibility
      } else if (trigger === "update") {
        // Session update triggered - refresh roles from database
        console.log("[JWT] Session update triggered, refreshing roles from DB for user:", token.id);
        try {
          const freshUser = await storage.getUserById(parseInt(token.id as string));
          if (freshUser) {
            const freshRoles = parseRoles(freshUser.role);
            console.log("[JWT] ✅ Refreshed roles:", freshRoles);
            token.name = freshUser.fullName || freshUser.username; // Refresh name as well
            token.email = freshUser.email || undefined;
            token.roles = freshRoles;
            token.role = JSON.stringify(freshRoles);
          }
        } catch (error) {
          console.error("[JWT] ⚠️ Failed to refresh roles:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string; // Include name in session for video call
        session.user.email = token.email as string;
        session.user.roles = token.roles as UserRole[];
        session.user.role = token.role as string; // Backward compatibility
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: false // Set to true in production with HTTPS
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
