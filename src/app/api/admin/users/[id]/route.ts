import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, tutors, students } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const userId = parseInt(params.id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Fetch user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch profile data based on role
    let profileData = null;

    if (user.role === "tutor") {
      const [tutorProfile] = await db
        .select()
        .from(tutors)
        .where(eq(tutors.userId, userId));
      profileData = tutorProfile;
    } else if (user.role === "student") {
      const [studentProfile] = await db
        .select()
        .from(students)
        .where(eq(students.userId, userId));
      profileData = studentProfile;
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        profileData,
      },
    });
  } catch (error) {
    console.error("Error fetching user detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
