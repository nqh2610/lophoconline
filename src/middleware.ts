import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { UserRole } from "@/lib/schema";

export async function middleware(request: NextRequest) {
  // Get token with proper cookie configuration
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const path = request.nextUrl.pathname;

  // Allow public access to tutor detail pages (/tutor/[id])
  if (path.match(/^\/tutor\/\d+$/)) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login page
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // Check role-based access
  // Support both old (role as JSON string) and new (roles as array) formats
  let roles: UserRole[] = [];

  // Debug logging
  console.log('[Middleware] Path:', path);
  console.log('[Middleware] Token.roles:', token.roles);
  console.log('[Middleware] Token.role:', token.role);

  if (token.roles && Array.isArray(token.roles)) {
    // New format: roles is already an array
    roles = token.roles as UserRole[];
    console.log('[Middleware] Using roles array:', roles);
  } else if (token.role && typeof token.role === 'string') {
    // Old format: role is a JSON string, parse it
    try {
      const parsed = JSON.parse(token.role as string);
      if (Array.isArray(parsed)) {
        roles = parsed;
        console.log('[Middleware] Parsed roles from string:', roles);
      }
    } catch (e) {
      console.error('[Middleware] Failed to parse role from token:', e);
    }
  }

  // If no roles found, this might be a legacy session - redirect to refresh page
  if (roles.length === 0 && path !== '/refresh-session') {
    console.warn('[Middleware] ⚠️ No roles found in token for path:', path);
    console.warn('[Middleware] Token keys:', Object.keys(token));
    console.warn('[Middleware] Redirecting to refresh-session page');
    return NextResponse.redirect(new URL('/refresh-session', request.url));
  }

  // Helper function to check if user has a specific role
  const hasRole = (role: UserRole) => {
    const result = roles.includes(role);
    console.log(`[Middleware] hasRole("${role}"):`, result, '(roles:', roles, ')');
    return result;
  };

  // Check for admin impersonation mode
  const impersonateUserId = request.nextUrl.searchParams.get("_impersonate");
  const impersonateRole = request.nextUrl.searchParams.get("_role");

  // If admin is impersonating, allow access to other role dashboards
  const isAdminImpersonating = hasRole("admin") && impersonateUserId && impersonateRole;

  // Admin routes
  if (path.startsWith("/admin")) {
    if (!hasRole("admin")) {
      // Not admin - redirect to appropriate dashboard
      if (hasRole("tutor")) {
        return NextResponse.redirect(new URL("/tutor/dashboard", request.url));
      }
      if (hasRole("student")) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      // No roles - go home
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  // Tutor dashboard routes (protected)
  // Note: /tutors (plural) is public, /tutor/[id] is public (already handled above)
  // Only /tutor/dashboard, /tutor/profile-setup etc. are protected
  if (path.startsWith("/tutor/")) {
    if (!hasRole("tutor") && !isAdminImpersonating) {
      // Not tutor and not admin impersonating - redirect to appropriate dashboard
      if (hasRole("student")) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      // No tutor role - go home
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  // Student routes (protected)
  if (path.startsWith("/student/")) {
    // Only allow if user has student role OR admin impersonating
    if (!hasRole("student") && !isAdminImpersonating) {
      // Not student - redirect to appropriate dashboard
      if (hasRole("tutor")) {
        return NextResponse.redirect(new URL("/tutor/dashboard", request.url));
      }
      // No student role - go home
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protect admin, tutor, student dashboards
  // Note: /tutor-registration removed - handled by client-side with better UX
  // Note: /refresh-session is public but requires authentication
  matcher: ["/admin/:path*", "/tutor/:path*", "/student/:path*", "/refresh-session"],
};
