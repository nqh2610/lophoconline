import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storage } from "@/lib/storage";

// ✅ API: Get trial lesson count for a student
export async function GET(request: NextRequest) {
  try {
    // ⚠️ SECURITY: Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get student ID from query or use session user ID
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    const studentId = studentIdParam ? parseInt(studentIdParam) : parseInt(session.user.id);

    // ⚠️ SECURITY: Users can only check their own trial count
    if (studentId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // ✅ PERFORMANCE: Single query to get trial count
    const count = await storage.getTrialBookingCount(studentId);

    return NextResponse.json({
      count,
      remaining: Math.max(0, 3 - count),
      maxAllowed: 3
    });

  } catch (error) {
    console.error("Trial count check error:", error);
    return NextResponse.json(
      { error: "Failed to check trial lesson count" },
      { status: 500 }
    );
  }
}
