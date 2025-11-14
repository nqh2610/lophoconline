import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storage } from '@/lib/storage';

// GET /api/users/me - Get current user with fresh roles from database
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch fresh user data from database
    const user = await storage.getUserById(parseInt(session.user.id));

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse roles from JSON string
    let roles: string[] = [];
    try {
      roles = JSON.parse(user.role);
    } catch {
      roles = [];
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      roles, // Fresh from database!
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate', // Always fetch fresh
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
