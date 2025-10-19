import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/admin/tutors/[id]/verify - Approve or reject tutor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const tutorId = parseInt(params.id);
    const tutor = await storage.getTutorById(tutorId);

    if (!tutor) {
      return NextResponse.json(
        { error: 'Tutor not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, reason } = body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const verificationStatus = action === 'approve' ? 'verified' : 'rejected';

    // Update tutor status
    const updatedTutor = await storage.updateTutor(tutorId, {
      verificationStatus,
      isActive: action === 'approve' ? 1 : 0
    });

    // Create notification for tutor
    const tutorUser = await storage.getUserById(tutor.userId);
    if (tutorUser) {
      await storage.createNotification({
        userId: tutorUser.id,
        type: 'verification',
        title: action === 'approve' ? 'Hồ sơ đã được phê duyệt' : 'Hồ sơ bị từ chối',
        message: action === 'approve'
          ? 'Chúc mừng! Hồ sơ gia sư của bạn đã được phê duyệt. Bạn có thể bắt đầu nhận học sinh.'
          : `Hồ sơ gia sư của bạn bị từ chối. Lý do: ${reason || 'Không đủ điều kiện'}. Vui lòng cập nhật thông tin và đăng ký lại.`,
        link: action === 'approve' ? '/tutor/dashboard' : '/tutor/profile-setup',
        isRead: 0
      });
    }

    return NextResponse.json({
      tutor: updatedTutor,
      message: action === 'approve' ? 'Đã phê duyệt gia sư' : 'Đã từ chối gia sư'
    }, { status: 200 });
  } catch (error) {
    console.error('Error verifying tutor:', error);
    return NextResponse.json(
      { error: 'Failed to verify tutor' },
      { status: 500 }
    );
  }
}
