import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { tutors } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters'),
});

/**
 * POST /api/admin/tutors/[id]/reject
 * Reject a tutor profile (Admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate and check admin role
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await storage.getUserById(parseInt(session.user.id));
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // 2. Get tutor
    const tutorId = parseInt(params.id);
    const tutor = await storage.getTutorById(tutorId);

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    // 3. Get rejection reason from request body
    const body = await request.json();
    const validationResult = rejectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // 4. Update tutor: reject and deactivate
    const now = new Date();
    await db
      .update(tutors)
      .set({
        approvalStatus: 'rejected',
        isActive: 0, // Deactivate tutor
        approvedBy: parseInt(session.user.id),
        approvedAt: now,
        rejectionReason: validationResult.data.reason,
        updatedAt: now,
      })
      .where(eq(tutors.id, tutorId));

    // Get updated tutor
    const updatedTutor = await storage.getTutorById(tutorId);

    console.log(`[API] ❌ Tutor ${tutorId} rejected by admin ${session.user.id}`);

    // TODO: Send email notification to tutor
    // await sendEmail({
    //   to: tutor.email,
    //   subject: 'Hồ sơ giáo viên không được phê duyệt',
    //   body: `Rất tiếc, hồ sơ của bạn không được phê duyệt.\n\nLý do: ${validationResult.data.reason}`,
    // });

    return NextResponse.json(
      {
        message: 'Tutor rejected successfully',
        tutor: updatedTutor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error rejecting tutor:', error);
    return NextResponse.json(
      { error: 'Failed to reject tutor' },
      { status: 500 }
    );
  }
}
