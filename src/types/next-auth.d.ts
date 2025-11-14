import "next-auth";
import type { UserRole } from "@/lib/schema";

declare module "next-auth" {
  interface User {
    id: string;
    roles: UserRole[]; // Array of roles: ["admin"], ["tutor"], ["student"], ["tutor","student"]
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string; // JSON string for backward compatibility
      roles: UserRole[]; // Parsed array
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string; // JSON string for backward compatibility
    roles: UserRole[];
  }
}
