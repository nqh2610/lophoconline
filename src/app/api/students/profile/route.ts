import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storage } from "@/lib/storage";

// ✅ GET: Get student profile by userId
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

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const userId = userIdParam ? parseInt(userIdParam) : parseInt(session.user.id);

    // ⚠️ SECURITY: Users can only access their own profile
    if (userId !== parseInt(session.user.id)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get user with full profile (users + students table)
    const user = await storage.getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get student profile if exists
    const student = await storage.getStudentByUserId(userId);

    return NextResponse.json({
      userId: user.id,
      fullName: user.fullName, // ✅ From users table
      phone: user.phone, // ✅ From users table
      email: user.email,
      gradeLevelId: student?.gradeLevelId || null, // From students table
      dateOfBirth: student?.dateOfBirth || null,
      parentName: student?.parentName || null,
      parentPhone: student?.parentPhone || null,
      address: student?.address || null,
    });

  } catch (error) {
    console.error("Get student profile error:", error);
    return NextResponse.json(
      { error: "Failed to get student profile" },
      { status: 500 }
    );
  }
}

// ✅ PUT: Update student profile
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

    // Update profile using new method
    const updatedStudent = await storage.createOrUpdateStudentProfile({
      userId: parseInt(session.user.id),
      fullName,
      gradeLevelId: gradeLevelId ? parseInt(gradeLevelId) : undefined,
      phone,
    });

    // Get updated user info
    const user = await storage.getUserById(parseInt(session.user.id));

    return NextResponse.json({
      success: true,
      userId: user?.id,
      fullName: user?.fullName,
      phone: user?.phone,
      gradeLevelId: updatedStudent.gradeLevelId,
    });

  } catch (error) {
    console.error("Update student profile error:", error);
    return NextResponse.json(
      { error: "Failed to update student profile" },
      { status: 500 }
    );
  }
}
