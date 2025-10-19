import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Update lesson
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

    // Get current lesson
    const current = await storage.getLessonById(id);
    if (!current) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    // Prevent changing tutorId or studentId
    if (updates.tutorId && updates.tutorId !== current.tutorId) {
      return NextResponse.json(
        { error: "Cannot change tutor ID" },
        { status: 400 }
      );
    }
    if (updates.studentId && updates.studentId !== current.studentId) {
      return NextResponse.json(
        { error: "Cannot change student ID" },
        { status: 400 }
      );
    }

    // Merge updates
    const merged = {
      tutorId: current.tutorId,
      studentId: current.studentId,
      date: updates.date || current.date,
      startTime: updates.startTime || current.startTime,
      endTime: updates.endTime || current.endTime,
      subject: updates.subject || current.subject,
      price: updates.price !== undefined ? parseInt(updates.price) : current.price,
      status: updates.status || current.status,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
    };

    // Validate time range
    if (merged.startTime >= merged.endTime) {
      return NextResponse.json(
        { error: "Giờ kết thúc phải sau giờ bắt đầu" },
        { status: 400 }
      );
    }

    // If time/date is being updated, check for conflicts
    if (updates.date || updates.startTime || updates.endTime) {
      // Check tutor conflict (excluding current lesson)
      const tutorLessons = await storage.getLessonsByTutor(merged.tutorId);
      const tutorConflict = tutorLessons
        .filter(l => l.id !== id && l.date === merged.date && l.status !== 'cancelled')
        .some(l => {
          const [h1Start, m1Start] = merged.startTime.split(':').map(Number);
          const [h1End, m1End] = merged.endTime.split(':').map(Number);
          const [h2Start, m2Start] = l.startTime.split(':').map(Number);
          const [h2End, m2End] = l.endTime.split(':').map(Number);

          const mins1Start = h1Start * 60 + m1Start;
          const mins1End = h1End * 60 + m1End;
          const mins2Start = h2Start * 60 + m2Start;
          const mins2End = h2End * 60 + m2End;

          return mins1Start < mins2End && mins2Start < mins1End;
        });

      if (tutorConflict) {
        return NextResponse.json(
          { error: "Gia sư đã có lớp khác trong khung giờ này" },
          { status: 409 }
        );
      }

      // Check student conflict
      const studentLessons = await storage.getLessonsByStudent(merged.studentId);
      const studentConflict = studentLessons
        .filter(l => l.id !== id && l.date === merged.date && l.status !== 'cancelled')
        .some(l => {
          const [h1Start, m1Start] = merged.startTime.split(':').map(Number);
          const [h1End, m1End] = merged.endTime.split(':').map(Number);
          const [h2Start, m2Start] = l.startTime.split(':').map(Number);
          const [h2End, m2End] = l.endTime.split(':').map(Number);

          const mins1Start = h1Start * 60 + m1Start;
          const mins1End = h1End * 60 + m1End;
          const mins2Start = h2Start * 60 + m2Start;
          const mins2End = h2End * 60 + m2End;

          return mins1Start < mins2End && mins2Start < mins1End;
        });

      if (studentConflict) {
        return NextResponse.json(
          { error: "Học sinh đã có lớp khác trong khung giờ này" },
          { status: 409 }
        );
      }
    }

    // Build sanitized updates
    const sanitizedUpdates: Partial<typeof merged> = {};
    if (updates.date) sanitizedUpdates.date = merged.date;
    if (updates.startTime) sanitizedUpdates.startTime = merged.startTime;
    if (updates.endTime) sanitizedUpdates.endTime = merged.endTime;
    if (updates.subject) sanitizedUpdates.subject = merged.subject;
    if (updates.price !== undefined) sanitizedUpdates.price = merged.price;
    if (updates.status) sanitizedUpdates.status = merged.status;
    if (updates.notes !== undefined) sanitizedUpdates.notes = updates.notes;

    const updated = await storage.updateLesson(id, sanitizedUpdates);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update lesson" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: "Invalid data" },
      { status: 400 }
    );
  }
}
