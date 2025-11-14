import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storage } from "@/lib/storage";

/**
 * ✅ OPTIMIZED: Single API call for booking dialog
 * Returns: user profile + trial count + validation
 * Performance: 1 API call instead of 2
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

    const userId = parseInt(session.user.id);

    // ✅ PERFORMANCE: Parallel fetch all needed data
    const [user, student, trialCount] = await Promise.all([
      storage.getUserById(userId),
      storage.getStudentByUserId(userId),
      storage.getTrialBookingCount(userId),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ UX: Return all data needed for booking form
    return NextResponse.json({
      // User info (from users table - can be edited)
      fullName: user.fullName || "",
      phone: user.phone || "",
      email: user.email || "",
      
      // Student info (from students table)
      gradeLevelId: student?.gradeLevelId || null,
      gradeLevel: student?.gradeLevelId?.toString() || "",
      
      // Trial info
      trialCount: trialCount || 0,
      trialRemaining: Math.max(0, 3 - (trialCount || 0)),
      canBookTrial: (trialCount || 0) < 3,
      
      // Profile status
      hasProfile: !!student,
      profileComplete: !!(user.fullName && user.phone && student?.gradeLevelId),
    });

  } catch (error) {
    console.error("Get booking profile error:", error);
    return NextResponse.json(
      { error: "Failed to get booking profile" },
      { status: 500 }
    );
  }
}

/**
 * ✅ UPDATE: Save profile changes from booking dialog
 * Auto-saves when user edits name/phone/grade before booking
 */
export async function PUT(request: NextRequest) {
  try {
    // ⚠️ SECURITY: Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fullName, phone, gradeLevelId } = body;

    // ✅ VALIDATION
    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: "Họ tên phải có ít nhất 2 ký tự" },
        { status: 400 }
      );
    }

    if (phone && !/^(0|\+84)[0-9]{9,10}$/.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: "Số điện thoại không hợp lệ" },
        { status: 400 }
      );
    }

    // ✅ ATOMIC: Update both users and students table
    const updatedStudent = await storage.createOrUpdateStudentProfile({
      userId: parseInt(session.user.id),
      fullName: fullName.trim(),
      phone: phone?.trim() || null,
      gradeLevelId: gradeLevelId ? parseInt(gradeLevelId) : undefined,
    });

    // Get fresh data
    const user = await storage.getUserById(parseInt(session.user.id));

    return NextResponse.json({
      success: true,
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      gradeLevelId: updatedStudent.gradeLevelId,
      message: "Cập nhật thông tin thành công",
    });

  } catch (error) {
    console.error("Update booking profile error:", error);
    return NextResponse.json(
      { error: "Lỗi cập nhật thông tin" },
      { status: 500 }
    );
  }
}
