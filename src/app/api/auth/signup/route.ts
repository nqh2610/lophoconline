import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { insertUserSchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = insertUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await storage.getUserByUsername(data.username);
    if (existingUser) {
      return NextResponse.json(
        { error: "Username đã tồn tại" },
        { status: 400 }
      );
    }

    if (data.email) {
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email đã được sử dụng" },
          { status: 400 }
        );
      }
    }

    // Create user (password will be hashed in storage.createUser)
    const user = await storage.createUser(data);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        message: "Đăng ký thành công",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Có lỗi xảy ra khi đăng ký" },
      { status: 500 }
    );
  }
}
