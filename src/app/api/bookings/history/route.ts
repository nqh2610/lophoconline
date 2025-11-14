import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storage } from "@/lib/storage";

/**
 * ✅ UX: Check if student has booked this tutor before
 * Used to show booking history hint in dialog
 */
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

    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get("tutorId");

    if (!tutorId) {
      return NextResponse.json(
        { error: "Missing tutorId parameter" },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);
    const student = await storage.getStudentByUserId(userId);

    if (!student) {
      return NextResponse.json({
        count: 0,
        hasHistory: false,
      });
    }

    // ✅ PERFORMANCE: Count bookings with this tutor
    const bookings = await storage.getBookingsByStudentAndTutor(
      student.id,
      parseInt(tutorId)
    );

    return NextResponse.json({
      count: bookings.length,
      hasHistory: bookings.length > 0,
      lastBookingDate: bookings.length > 0 
        ? bookings[0].createdAt 
        : null,
    });

  } catch (error) {
    console.error("Get booking history error:", error);
    return NextResponse.json(
      { error: "Failed to get booking history" },
      { status: 500 }
    );
  }
}
