import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { db } from '@/lib/db';
import { tutors } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/admin/tutors/[id]/approve
 * Approve a tutor profile (Admin only)
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

    // 3. Check if already approved
    if (tutor.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: 'Tutor is already approved' },
        { status: 400 }
      );
    }

    // 4. Update tutor: approve and activate
    const now = new Date();
    await db
      .update(tutors)
      .set({
        approvalStatus: 'approved',
        isActive: 1, // Activate tutor
        approvedBy: parseInt(session.user.id),
        approvedAt: now,
        rejectionReason: null, // Clear any previous rejection reason
        updatedAt: now,
      })
      .where(eq(tutors.id, tutorId));

    // Add "tutor" role to user when approved
    await storage.addUserRole(tutor.userId, 'tutor');

    // Get updated tutor
    const updatedTutor = await storage.getTutorById(tutorId);

    console.log(`[API] ✅ Tutor ${tutorId} approved by admin ${session.user.id}`);

    // TODO: Send email notification to tutor
    // await sendEmail({
    //   to: tutor.email,
    //   subject: 'Hồ sơ giáo viên đã được phê duyệt',
    //   body: 'Chúc mừng! Hồ sơ của bạn đã được phê duyệt...',
    // });

    return NextResponse.json(
      {
        message: 'Tutor approved successfully',
        tutor: updatedTutor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error approving tutor:', error);
    return NextResponse.json(
      { error: 'Failed to approve tutor' },
      { status: 500 }
    );
  }
}
