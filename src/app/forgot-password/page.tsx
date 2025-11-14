"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetLink("");
    setMessage("");

    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
        setIsLoading(false);
        return;
      }

      // Check if email was sent successfully
      if (data.success) {
        setMessage(data.message);
        setSuccess(true);
      } else if (data.resetToken) {
        // Development mode - email failed but got token
        const link = data.resetLink || `${window.location.origin}/reset-password?token=${data.resetToken}`;
        setResetLink(link);
        setMessage(data.message);
        setSuccess(true);
      }

      setIsLoading(false);
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resetLink);
    alert("Đã copy link reset password!");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              {resetLink ? "Link Reset Password (Dev Mode)" : "Kiểm tra email"}
            </CardTitle>
            <CardDescription className="text-center">
              {message || "Vui lòng kiểm tra email để đặt lại mật khẩu"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetLink ? (
              // Development mode - show link
              <>
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-sm">
                    <strong>⚠️ Development Mode:</strong> Email gửi không thành công. Link reset password hiển thị dưới đây (chỉ trong môi trường dev).
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Link Reset Password</Label>
                  <div className="flex gap-2">
                    <Input
                      value={resetLink}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button onClick={copyToClipboard} variant="outline" type="button">
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href={`/reset-password?token=${resetLink.split('token=')[1]}`} className="w-full">
                    <Button className="w-full" size="lg">
                      Đặt lại mật khẩu ngay
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              // Production mode - email sent
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm">
                    <strong>📧 Email đã được gửi!</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Kiểm tra hộp thư đến (Inbox)</li>
                      <li>Kiểm tra cả thư mục spam/junk</li>
                      <li>Link có hiệu lực trong 1 giờ</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại đăng nhập
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>
            </Link>
          </div>
          <CardDescription>
            Nhập tên đăng nhập để nhận link đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Lấy link reset password"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Đã nhớ mật khẩu?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Đăng nhập
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
