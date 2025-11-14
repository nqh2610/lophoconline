import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { tutorId: string } }
) {
  try {
    const tutorId = parseInt(params.tutorId);
    const lessons = await storage.getLessonsByTutor(tutorId);
    return NextResponse.json(lessons);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}
