import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/schema";
import { eq, or, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ isStudent: false }, { status: 200 });
    }

    // Check if user has any lessons (trial or enrolled)
    const userLessons = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.studentId, userId),
          or(
            eq(lessons.status, "confirmed"),
            eq(lessons.status, "completed")
          )
        )
      )
      .limit(1);

    const isStudent = userLessons.length > 0;

    return NextResponse.json({ isStudent }, { status: 200 });
  } catch (error) {
    console.error("Error checking student status:", error);
    return NextResponse.json({ isStudent: false }, { status: 200 });
  }
}
