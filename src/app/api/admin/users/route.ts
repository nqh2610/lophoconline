import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, students, tutors } from '@/lib/schema';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sql, eq, and, desc, or, like, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Get all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const searchText = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const isActive = searchParams.get('isActive');
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (searchText) {
      conditions.push(
        or(
          like(users.username, `%${searchText}%`),
          like(users.email, `%${searchText}%`)
        )
      );
    }

    if (role) {
      conditions.push(eq(users.role, role));
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      conditions.push(eq(users.isActive, parseInt(isActive)));
    }

    // Get users with pagination
    let query = db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      phone: users.phone,
      avatar: users.avatar,
      isActive: users.isActive,
      lastLogin: users.lastLogin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allUsers = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [{ count: total }] = await countQuery;

    // Optimize: Batch fetch profiles in 2 queries instead of N queries
    const studentUserIds = allUsers.filter(u => u.role === 'student').map(u => u.id);
    const tutorUserIds = allUsers.filter(u => u.role === 'tutor').map(u => u.id);

    const studentProfiles = studentUserIds.length > 0
      ? await db.select().from(students).where(inArray(students.userId, studentUserIds))
      : [];

    const tutorProfiles = tutorUserIds.length > 0
      ? await db.select().from(tutors).where(inArray(tutors.userId, tutorUserIds))
      : [];

    // Create maps for O(1) lookup
    const studentMap = new Map(studentProfiles.map(s => [s.userId, s]));
    const tutorMap = new Map(tutorProfiles.map(t => [t.userId, t]));

    // Enrich users with profile data (now O(n) instead of O(n) queries)
    const enrichedUsers = allUsers.map(user => ({
      ...user,
      profileData: user.role === 'student'
        ? (studentMap.get(user.id) || null)
        : user.role === 'tutor'
        ? (tutorMap.get(user.id) || null)
        : null,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !session.user.roles?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, email, password, role, phone, avatar, isActive } = body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: username, email, password, role' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const [existingUsername] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existingEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      role,
      phone: phone || null,
      avatar: avatar || null,
      isActive: isActive !== undefined ? isActive : 1,
    });

    const userId = Number(result[0].insertId);

    // Create profile based on role
    if (role === 'student') {
      await db.insert(students).values({
        userId,
        fullName: username,
      });
    } else if (role === 'tutor') {
      await db.insert(tutors).values({
        userId,
        fullName: username,
        subjects: '[]', // Empty JSON array, admin can update later
        hourlyRate: 0, // Default rate, admin can update later
        experience: 0,
        verificationStatus: 'pending',
      });
    }

    // Get created user
    const [newUser] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        phone: users.phone,
        avatar: users.avatar,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json(
      { message: 'User created successfully', user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
