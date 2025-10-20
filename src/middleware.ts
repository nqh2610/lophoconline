import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  const path = request.nextUrl.pathname;

  // Allow public access to tutor detail pages (/tutor/[id])
  if (path.match(/^\/tutor\/\d+$/)) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to home with login prompt
  if (!token) {
    const url = new URL("/", request.url);
    url.searchParams.set("login", "required");
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  // Check role-based access
  const role = token.role as string;
  const isStudent = token.isStudent as boolean;

  // Check for admin impersonation mode
  const impersonateUserId = request.nextUrl.searchParams.get("_impersonate");
  const impersonateRole = request.nextUrl.searchParams.get("_role");

  // If admin is impersonating, allow access to other role dashboards
  const isAdminImpersonating = role === "admin" && impersonateUserId && impersonateRole;

  // Admin routes
  if (path.startsWith("/admin")) {
    if (role !== "admin") {
      // Not admin - check if student
      if (isStudent) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      // Not admin and not student - go home
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  // Tutor dashboard routes (protected)
  // Note: /tutors (plural) is public, /tutor/[id] is public (already handled above)
  // Only /tutor/dashboard, /tutor/profile-setup etc. are protected
  if (path.startsWith("/tutor/")) {
    if (role !== "tutor" && !isAdminImpersonating) {
      // Not tutor and not admin impersonating - check if student
      if (isStudent) {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
      // Not tutor and not student - go home
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  // Student routes (protected)
  if (path.startsWith("/student/")) {
    // Only allow if user is actually a student OR admin impersonating
    if (!isStudent && role !== "student" && !isAdminImpersonating) {
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only protect singular routes, not plural (plural are public pages)
  matcher: ["/admin/:path*", "/tutor/:path*", "/student/:path*"],
};
