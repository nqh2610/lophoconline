import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/notifications - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await storage.getNotificationsByUser(
      parseInt(session.user.id),
      limit,
      unreadOnly
    );

    return NextResponse.json(notifications, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache'
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// GET /api/notifications/count - Get unread notification count
export async function HEAD(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse(null, { status: 401 });
    }

    const count = await storage.getUnreadNotificationCount(parseInt(session.user.id));

    return NextResponse.json({ count }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-cache'
      }
    });
  } catch (error) {
    console.error('Error counting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to count notifications' },
      { status: 500 }
    );
  }
}
