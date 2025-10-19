import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertTutorAvailabilitySchema } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Create tutor availability slot
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = insertTutorAvailabilitySchema.parse(body);

    // Check for conflicts
    const hasConflict = await storage.checkAvailabilityConflict(
      data.tutorId,
      data.dayOfWeek,
      data.startTime,
      data.endTime
    );

    if (hasConflict) {
      return NextResponse.json(
        { error: "Khung giờ này trùng với ca dạy đã tồn tại" },
        { status: 409 }
      );
    }

    const availability = await storage.createTutorAvailability(data);
    return NextResponse.json(availability, { status: 201 });
  } catch (error) {
    console.error('Create availability error:', error);
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }
}
