import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertLessonSchema, addRole, users } from "@/lib/schema";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

// ✅ PERFORMANCE: Batch create lesson with enrollment for package-based bookings
export async function POST(request: NextRequest) {
  try {
    // ⚠️ SECURITY: Verify authentication
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Extract fields for package-based booking
    const {
      tutorId,
      availabilityId, // For package enrollment (null for trial)
      subjects = [],
      grade,
      notes = "", // ✅ UX: Mô tả thêm từ học sinh
      isTrial = 0,
      totalSessions = 1,
      packageId,
      packageMonths = 1, // Số tháng đăng ký (1, 2, 3, 6, 12)
      pricePerSession = 0,
      totalAmount = 0, // Tổng tiền sau giảm giá (đã tính ở frontend)
    } = body;

    // ✅ VALIDATION: Check required fields
    if (!tutorId) {
      return NextResponse.json(
        { error: "Thiếu thông tin giáo viên" },
        { status: 400 }
      );
    }

    // ✅ VALIDATION: Both trial and regular bookings need availability slot
    if (!availabilityId) {
      return NextResponse.json(
        { error: "Vui lòng chọn ca học" },
        { status: 400 }
      );
    }

    // ✅ OPTIMIZATION: Parallel fetch ALL needed data upfront in ONE round-trip
    let tutor, availability, tutorUser, studentUser, student, allSubjects, allGrades;

    try {
      // ✅ PARALLEL: Fetch ALL data in ONE Promise.all (minimizes latency)
      [tutor, availability, studentUser, allSubjects, allGrades] = await Promise.all([
        storage.getTutorById(parseInt(tutorId)),
        storage.getTutorAvailabilityById(parseInt(availabilityId)),
        storage.getUserById(parseInt(session.user.id)),
        isTrial === 1 ? Promise.resolve([]) : storage.getAllSubjects(), // Cached!
        isTrial === 1 ? Promise.resolve([]) : storage.getAllGradeLevels(), // Cached!
      ]);

      if (!tutor) {
        return NextResponse.json({ error: "Không tìm thấy giáo viên" }, { status: 404 });
      }

      if (!availability) {
        return NextResponse.json({ error: "Không tìm thấy ca học" }, { status: 404 });
      }

      // ✅ PARALLEL: Fetch tutor user and student profile together
      [tutorUser, student] = await Promise.all([
        storage.getUserById(tutor.userId),
        studentUser ? storage.getStudentByUserId(studentUser.id) : Promise.resolve(null),
      ]);

      if (!tutorUser) {
        return NextResponse.json({ error: "Không tìm thấy tài khoản giáo viên" }, { status: 404 });
      }

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: "Lỗi kết nối cơ sở dữ liệu. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    // Get tutor's full name from users table (after 3NF refactoring)
    const tutorFullName = tutorUser.fullName || tutorUser.username || "Giáo viên";

    // ✅ FIX: Ensure student profile exists BEFORE validation
    if (!student && studentUser) {
      // Create minimal student profile (grade will be updated later if needed)
      const defaultGrade = 1; // Default to grade 1
      const createdStudent = await storage.createOrUpdateStudentProfile({
        userId: studentUser.id,
        fullName: studentUser.fullName,
        gradeLevelId: defaultGrade,
      });
      student = createdStudent;
    }

    if (!student) {
      return NextResponse.json(
        { error: "Không thể tạo hồ sơ học sinh" },
        { status: 500 }
      );
    }

    // ✅ CRITICAL FIX: Always ensure "student" role is added, even if profile already exists
    // This handles cases where role was reset or student profile existed before role logic was added
    if (studentUser) {
      const currentUser = await storage.getUserById(studentUser.id);
      if (currentUser) {
        const updatedRoles = addRole(currentUser.role, 'student');
        // Only update if roles actually changed
        if (updatedRoles !== currentUser.role) {
          await db.update(users)
            .set({ role: updatedRoles })
            .where(eq(users.id, studentUser.id));
          console.log(`[API /lessons] ✅ Added "student" role to user ${studentUser.id}`);
        }
      }
    }

    // ✅ OPTIMIZED: Validate booking (includes trial count check)
    const validation = await storage.validateBooking({
      studentId: student.id, // ✅ FIX: Use student.id not user.id
      tutorId: parseInt(tutorId),
      isTrial: isTrial === 1, // Convert to boolean - used to determine which validations to run
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (isTrial === 1) {
      // ========== TRIAL LESSON FLOW ==========
      // Note: trial count already checked in validateBooking above

      // Create a trial booking record (no specific date yet - tutor will schedule)
      let trialData;
      try {
        trialData = insertLessonSchema.parse({
          tutorId: parseInt(tutorId),
          studentId: student.id, // ✅ FIX: Use student.id not user.id
          availabilityId: availabilityId ? parseInt(availabilityId) : undefined, // ✅ Link to availability slot
          subject: subjects.length > 0 ? subjects.join(", ") : "Học thử",
          date: new Date().toISOString().split("T")[0], // Placeholder - will be updated when tutor confirms
          startTime: "00:00", // Placeholder
          endTime: "00:30", // Placeholder
          status: "pending",
          // ✅ REMOVED: price field - not in trial_bookings table anymore
          notes: notes || `Học thử - Lớp ${grade || "N/A"}`, // ✅ UX: Lưu mô tả từ học sinh
          tutorConfirmed: 0,
          studentConfirmed: 1,
        });
      } catch (validationError) {
        console.error('Trial booking validation error:', validationError);
        return NextResponse.json(
          { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin." },
          { status: 400 }
        );
      }

      // ✅ FIX: Create trial booking in trial_bookings table
      let trialBooking;
      try {
        trialBooking = await storage.createTrialBooking(trialData);
      } catch (createError) {
        console.error('Create trial booking error:', createError);
        return NextResponse.json(
          { error: "Không thể tạo buổi học thử. Vui lòng thử lại." },
          { status: 500 }
        );
      }
      
      // Create transaction record (free trial)
      try {
        await storage.createTransaction({
          lessonId: trialBooking.id,
          studentId: student.id,
          tutorId: parseInt(tutorId),
          amount: 0,
          method: 'free', // Free trial
          status: 'completed', // Auto-complete for free trials
          paymentData: JSON.stringify({
            type: 'trial',
            subjects: subjects,
            grade: grade,
          })
        });
      } catch (transactionError) {
        console.error('Create transaction error:', transactionError);
        // Don't fail the whole request if transaction fails
      }

      // ✅ PERFORMANCE: Send notifications and email in parallel
      await Promise.all([
        // Notification to tutor
        storage.createNotification({
          userId: tutorUser.id,
          type: 'booking',
          title: '📚 Yêu cầu học thử mới',
          message: `${studentUser?.username || 'Học sinh'} đã đăng ký học thử${subjects.length > 0 ? ` môn ${subjects.join(", ")}` : ''}${grade ? ` - Lớp ${grade}` : ''}. Vui lòng xác nhận và đề xuất lịch học.`,
          link: `/tutor/lessons/${trialBooking.id}`,
          isRead: 0,
        }),
        // Notification to student
        storage.createNotification({
          userId: studentUser.id,
          type: 'booking',
          title: '✅ Đã gửi yêu cầu học thử',
          message: `Yêu cầu học thử với ${tutorFullName} đã được gửi. Giáo viên sẽ liên hệ với bạn để xác nhận lịch học.`,
          link: `/student/lessons/${trialBooking.id}`,
          isRead: 0,
        }),
        // ✅ EMAIL: Send email to tutor
        sendEmail({
          to: tutorUser.email || '',
          subject: '📚 Yêu cầu học thử mới từ LopHoc.Online',
          html: `
            <h2>Xin chào ${tutorFullName},</h2>
            <p>Bạn có yêu cầu học thử mới từ <strong>${studentUser?.username || 'học sinh'}</strong>:</p>
            <ul>
              ${subjects.length > 0 ? `<li><strong>Môn học:</strong> ${subjects.join(", ")}</li>` : ''}
              ${grade ? `<li><strong>Lớp:</strong> ${grade}</li>` : ''}
              <li><strong>Loại:</strong> Học thử miễn phí (30-45 phút)</li>
            </ul>
            <p>Vui lòng đăng nhập vào hệ thống để xác nhận và đề xuất lịch học phù hợp.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/tutor/lessons/${trialBooking.id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xem chi tiết</a></p>
            <p>Trân trọng,<br/>Đội ngũ LopHoc.Online</p>
          `,
        }).catch(err => console.error('Email error:', err)), // Don't block on email errors
      ]);

      return NextResponse.json({
        lesson: trialBooking, // Return trial booking as lesson for backward compatibility
        message: 'Yêu cầu học thử đã được gửi! Giáo viên sẽ liên hệ với bạn sớm nhất.',
      }, { status: 201 });

    } else {
      // ========== PACKAGE ENROLLMENT FLOW ==========
      
      if (!availability) {
        return NextResponse.json(
          { error: "Không tìm thấy ca học" },
          { status: 404 }
        );
      }

      // Calculate total amount
      const finalTotalAmount = totalAmount > 0 ? totalAmount : (pricePerSession * totalSessions);

      // Get student ID (will create if not exists later, after we resolve gradeLevelId)
      let studentId = student?.id;

      // ✅ OPTIMIZATION: Use pre-fetched subjects (no more DB queries!)
      let subjectId: number | undefined;

      if (allSubjects.length === 0) {
        return NextResponse.json(
          { error: "Hệ thống chưa có dữ liệu môn học. Vui lòng liên hệ quản trị viên." },
          { status: 500 }
        );
      }

      if (subjects && subjects.length > 0) {
        const matchedSubject = allSubjects.find(s => s.name === subjects[0]);
        subjectId = matchedSubject?.id;
      }

      // Fallback to first subject
      if (!subjectId) {
        subjectId = allSubjects[0].id;
      }

      // ✅ OPTIMIZATION: Use pre-fetched grades (no more DB queries!)
      let gradeLevelId: number;

      if (allGrades.length === 0) {
        return NextResponse.json(
          { error: "Hệ thống chưa có dữ liệu lớp học. Vui lòng liên hệ quản trị viên." },
          { status: 500 }
        );
      }

      if (grade) {
        const parsedGrade = parseInt(grade);
        let matchedGrade;

        // Try matching by grade number
        if (!isNaN(parsedGrade)) {
          matchedGrade = allGrades.find(g =>
            g.id === parsedGrade ||
            g.sortOrder === parsedGrade ||
            g.name.includes(`${parsedGrade}`) ||
            g.name.includes(`Lớp ${parsedGrade}`)
          );
        }

        // Fallback: exact or contains match
        if (!matchedGrade) {
          matchedGrade = allGrades.find(g => g.name === grade || g.name.includes(grade));
        }

        if (!matchedGrade) {
          return NextResponse.json(
            { error: `Lớp học không hợp lệ. Không tìm thấy lớp "${grade}" trong hệ thống.` },
            { status: 400 }
          );
        }

        gradeLevelId = matchedGrade.id;
      } else {
        // Use first available grade
        gradeLevelId = allGrades[0].id;
      }

      // Ensure student profile exists now that we have gradeLevelId
      if (!studentId && studentUser) {
        const createdOrUpdated = await storage.createOrUpdateStudentProfile({
          userId: studentUser.id,
          fullName: studentUser.fullName,
          gradeLevelId,
        });
        studentId = createdOrUpdated.id;
      }

      if (!studentId) {
        return NextResponse.json(
          { error: "Không thể tạo hồ sơ học sinh" },
          { status: 500 }
        );
      }

      // ✅ OPTIMIZATION: Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Creating enrollment with:', {
          studentId,
          tutorId: tutor.id,
          subjectId,
          gradeLevelId,
          totalSessions,
          pricePerSession,
          totalAmount: finalTotalAmount
        });
      }

      // Create enrollment record
      const enrollment = await storage.createClassEnrollment({
        studentId: studentId,
        tutorId: tutor.id,
        subjectId: subjectId,
        gradeLevelId: gradeLevelId,
        totalSessions: totalSessions,
        pricePerSession: pricePerSession,
        totalAmount: finalTotalAmount,
        status: 'pending', // Pending tutor confirmation
        schedule: JSON.stringify({
          availabilityId: availabilityId,
          dayLabels: availability.recurringDays,
          startTime: availability.startTime,
          endTime: availability.endTime,
          sessionsPerWeek: Math.round(totalSessions / (packageMonths * 4)), // Calculate from total
        }),
        notes: notes || `Gói ${packageMonths} tháng - Môn: ${subjects.join(", ")} - Lớp ${grade || "N/A"}`, // ✅ UX: Lưu mô tả từ học sinh
      });

      // ✅ PERFORMANCE: Send notifications and email in parallel
      await Promise.all([
        // Notification to tutor
        storage.createNotification({
          userId: tutorUser.id,
          type: 'booking',
          title: '🎓 Đăng ký học mới',
          message: `${studentUser?.username || 'Học sinh'} đã đăng ký gói ${packageMonths} tháng (${totalSessions} buổi)${subjects.length > 0 ? ` môn ${subjects.join(", ")}` : ''}${grade ? ` - Lớp ${grade}` : ''}. Tổng: ${finalTotalAmount.toLocaleString('vi-VN')}₫. Vui lòng xác nhận.`,
          link: `/tutor/enrollments/${enrollment.id}`,
          isRead: 0,
        }),
        // Notification to student
        storage.createNotification({
          userId: parseInt(session.user.id),
          type: 'booking',
          title: '✅ Đã gửi yêu cầu đăng ký',
          message: `Yêu cầu đăng ký gói ${packageMonths} tháng (${totalSessions} buổi) với ${tutorFullName} đã được gửi. Bạn sẽ nhận được thông báo về số tiền cần thanh toán sau khi giáo viên xác nhận.`,
          link: `/student/enrollments/${enrollment.id}`,
          isRead: 0,
        }),
        // ✅ EMAIL: Send email to tutor
        sendEmail({
          to: tutorUser.email || '',
          subject: '🎓 Yêu cầu đăng ký học mới từ LopHoc.Online',
          html: `
            <h2>Xin chào ${tutorFullName},</h2>
            <p>Bạn có yêu cầu đăng ký học mới từ <strong>${studentUser?.username || 'học sinh'}</strong>:</p>
            <ul>
              ${subjects.length > 0 ? `<li><strong>Môn học:</strong> ${subjects.join(", ")}</li>` : ''}
              ${grade ? `<li><strong>Lớp:</strong> ${grade}</li>` : ''}
              <li><strong>Gói đăng ký:</strong> ${packageMonths} tháng</li>
              <li><strong>Tổng số buổi:</strong> ${totalSessions} buổi</li>
              <li><strong>Học phí/buổi:</strong> ${pricePerSession.toLocaleString('vi-VN')}₫</li>
              <li><strong>Tổng tiền:</strong> ${finalTotalAmount.toLocaleString('vi-VN')}₫</li>
              <li><strong>Lịch học:</strong> ${availability.recurringDays} - ${availability.startTime} đến ${availability.endTime}</li>
            </ul>
            <p>Vui lòng đăng nhập vào hệ thống để xác nhận đăng ký này.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/tutor/enrollments/${enrollment.id}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Xác nhận đăng ký</a></p>
            <p><strong>Lưu ý:</strong> Sau khi bạn xác nhận, học sinh sẽ được thông báo để thanh toán. Lịch học sẽ tự động được tạo sau khi thanh toán hoàn tất.</p>
            <p>Trân trọng,<br/>Đội ngũ LopHoc.Online</p>
          `,
        }).catch(err => console.error('Email error:', err)),
      ]);

      return NextResponse.json({
        enrollment,
        message: `Đã gửi yêu cầu đăng ký gói ${packageMonths} tháng (${totalSessions} buổi)! Giáo viên sẽ xác nhận sớm nhất.`,
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Create booking error:', error);
    
    // Return detailed error in development
    const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500 }
    );
  }
}
