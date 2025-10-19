import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tutors, lessons, transactions } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, eq, and, gte } from 'drizzle-orm';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Total users (students)
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'student'));

    // Total tutors (verified)
    const [totalTutorsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tutors)
      .where(eq(tutors.verificationStatus, 'verified'));

    // Pending tutors
    const [pendingTutorsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tutors)
      .where(eq(tutors.verificationStatus, 'pending'));

    // Total revenue this month
    const [revenueResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, monthStart)
        )
      );

    // Lessons this month
    const [lessonsThisMonthResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(gte(lessons.date, monthStartStr));

    // Completed lessons this month
    const [completedLessonsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(
        and(
          eq(lessons.status, 'completed'),
          gte(lessons.date, monthStartStr)
        )
      );

    const stats = {
      totalUsers: totalUsersResult?.count || 0,
      totalTutors: totalTutorsResult?.count || 0,
      pendingTutors: pendingTutorsResult?.count || 0,
      revenueThisMonth: revenueResult?.total || 0,
      lessonsThisMonth: lessonsThisMonthResult?.count || 0,
      completedLessons: completedLessonsResult?.count || 0,
    };

    return NextResponse.json(stats, {
      status: 200,
      headers: {
        'Cache-Control': 'private, s-maxage=60'
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
