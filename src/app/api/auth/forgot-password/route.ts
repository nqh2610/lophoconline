import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail, generatePasswordResetEmail, generatePasswordResetTextEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Tên đăng nhập là bắt buộc" },
        { status: 400 }
      );
    }

    // Find user by username
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent user enumeration
      return NextResponse.json({
        message: "Nếu tài khoản có email, chúng tôi đã gửi link reset password. Vui lòng kiểm tra hộp thư.",
        success: true,
      });
    }

    // Check if user has email
    if (!user.email) {
      return NextResponse.json(
        { error: "Tài khoản này chưa có email. Vui lòng liên hệ admin để được hỗ trợ." },
        { status: 400 }
      );
    }

    // Check if user is active
    if (user.isActive === 0) {
      return NextResponse.json(
        { error: "Tài khoản đã bị khóa" },
        { status: 403 }
      );
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to database
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: 0,
    });

    // Generate reset link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email with reset link
    try {
      const htmlContent = generatePasswordResetEmail(user.username, resetLink);
      const textContent = generatePasswordResetTextEmail(user.username, resetLink);

      await sendEmail({
        to: user.email,
        subject: "Đặt lại mật khẩu - LopHoc Online",
        html: htmlContent,
        text: textContent,
      });

      console.log("✅ Password reset email sent to:", user.email);

      return NextResponse.json({
        message: "Chúng tôi đã gửi link reset password đến email của bạn. Vui lòng kiểm tra hộp thư.",
        success: true,
      });
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);

      // If email fails, still return the token for testing purposes in development
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          message: "Không thể gửi email. Link reset password (chỉ hiển thị trong môi trường dev):",
          resetToken,
          resetLink,
          success: false,
        });
      }

      return NextResponse.json(
        { error: "Không thể gửi email. Vui lòng thử lại sau." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
