import nodemailer from "nodemailer";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || "LopHoc Online <noreply@lophoc.online>",
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    console.log("   To:", options.to);
    console.log("   Subject:", options.subject);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

// Email template for password reset
export function generatePasswordResetEmail(username: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">LopHoc Online</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin-top: 0; margin-bottom: 20px; font-size: 24px;">Đặt lại mật khẩu</h2>

              <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                Xin chào <strong>${username}</strong>,
              </p>

              <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn vào nút bên dưới để tạo mật khẩu mới:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; padding: 14px 40px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Đặt lại mật khẩu
                </a>
              </div>

              <p style="color: #666666; line-height: 1.6; margin-bottom: 20px;">
                Hoặc copy và paste link này vào trình duyệt:
              </p>

              <p style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; color: #495057; font-size: 14px; border-left: 4px solid #667eea;">
                ${resetLink}
              </p>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px; border-radius: 4px;">
                <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Lưu ý:</strong><br>
                  • Link này chỉ có hiệu lực trong <strong>1 giờ</strong><br>
                  • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br>
                  • Không chia sẻ link này với bất kỳ ai
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; margin: 0; font-size: 14px; line-height: 1.6;">
                Email này được gửi tự động, vui lòng không trả lời.<br>
                Nếu bạn cần hỗ trợ, vui lòng liên hệ: <a href="mailto:support@lophoc.online" style="color: #667eea; text-decoration: none;">support@lophoc.online</a>
              </p>

              <p style="color: #6c757d; margin: 20px 0 0 0; font-size: 12px;">
                © 2025 LopHoc Online. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Plain text version for email clients that don't support HTML
export function generatePasswordResetTextEmail(username: string, resetLink: string): string {
  return `
Đặt lại mật khẩu - LopHoc Online

Xin chào ${username},

Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.

Để đặt lại mật khẩu, vui lòng truy cập link sau:
${resetLink}

LƯU Ý:
- Link này chỉ có hiệu lực trong 1 giờ
- Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
- Không chia sẻ link này với bất kỳ ai

---
Email này được gửi tự động, vui lòng không trả lời.
Nếu bạn cần hỗ trợ, vui lòng liên hệ: support@lophoc.online

© 2025 LopHoc Online. All rights reserved.
  `.trim();
}

// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Email server connection successful");
    return true;
  } catch (error) {
    console.error("❌ Email server connection failed:", error);
    return false;
  }
}
