import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Update tutor availability
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    const updates = await request.json();

    // Get current slot
    const currentSlot = await storage.getTutorAvailabilityById(id);

    if (!currentSlot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    // Prevent changing tutorId
    if (updates.tutorId && updates.tutorId !== currentSlot.tutorId) {
      return NextResponse.json(
        { error: "Cannot change tutor ID" },
        { status: 400 }
      );
    }

    // Merge updates
    const merged = {
      tutorId: currentSlot.tutorId,
      dayOfWeek: updates.dayOfWeek !== undefined ? parseInt(updates.dayOfWeek) : currentSlot.dayOfWeek,
      startTime: updates.startTime || currentSlot.startTime,
      endTime: updates.endTime || currentSlot.endTime,
      isActive: updates.isActive !== undefined ? parseInt(updates.isActive) : currentSlot.isActive,
    };

    // Validate
    if (isNaN(merged.dayOfWeek) || merged.dayOfWeek < 0 || merged.dayOfWeek > 6) {
      return NextResponse.json(
        { error: "Invalid day of week" },
        { status: 400 }
      );
    }

    if (merged.startTime >= merged.endTime) {
      return NextResponse.json(
        { error: "Giờ kết thúc phải sau giờ bắt đầu" },
        { status: 400 }
      );
    }

    // Check conflicts
    const hasConflict = await storage.checkAvailabilityConflict(
      merged.tutorId,
      merged.dayOfWeek,
      merged.startTime,
      merged.endTime,
      id
    );

    if (hasConflict) {
      return NextResponse.json(
        { error: "Khung giờ này trùng với ca dạy đã tồn tại" },
        { status: 409 }
      );
    }

    // Update
    const sanitizedUpdates: Partial<typeof merged> = {};
    if (updates.dayOfWeek !== undefined) sanitizedUpdates.dayOfWeek = merged.dayOfWeek;
    if (updates.startTime) sanitizedUpdates.startTime = merged.startTime;
    if (updates.endTime) sanitizedUpdates.endTime = merged.endTime;
    if (updates.isActive !== undefined) sanitizedUpdates.isActive = merged.isActive;

    const updated = await storage.updateTutorAvailability(id, sanitizedUpdates);

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update availability error:', error);
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }
}

// Delete tutor availability
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = parseInt(params.id);
    const deleted = await storage.deleteTutorAvailability(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete availability error:', error);
    return NextResponse.json(
      { error: "Failed to delete availability" },
      { status: 500 }
    );
  }
}
