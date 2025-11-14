"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate redirectTo to prevent open redirect vulnerability
  const getValidatedRedirectPath = () => {
    const redirect = searchParams.get("redirectTo") || searchParams.get("redirect");
    if (!redirect) return "/";

    // Only allow relative paths (must start with /)
    // Reject absolute URLs or protocol-relative URLs
    if (!redirect.startsWith("/") || redirect.startsWith("//")) {
      return "/";
    }

    // Decode and check again to prevent bypass with encoded slashes
    try {
      const decoded = decodeURIComponent(redirect);
      if (!decoded.startsWith("/") || decoded.startsWith("//")) {
        return "/";
      }
      return decoded;
    } catch {
      return "/";
    }
  };

  const redirectTo = getValidatedRedirectPath();

  // If already logged in, redirect
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push(redirectTo);
    }
  }, [status, session, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);

    // Validation
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      setIsLoading(false);
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      setError("Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số");
      setIsLoading(false);
      return;
    }

    // Check for common weak passwords
    const weakPasswords = ["password", "12345678", "qwerty123", "admin123"];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      setError("Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          email,
          password,
          // User mới không có role - sẽ được gán khi đăng ký học/dạy
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đăng ký thất bại");
        setIsLoading(false);
        return;
      }

      // Success - now login automatically
      setSuccess(true);

      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Redirect to the intended page
        router.push(redirectTo);
      } else {
        // If auto-login fails, redirect to login page
        router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      }
    } catch (err) {
      setError("Có lỗi xảy ra. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Đăng ký</CardTitle>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Trang chủ
              </Button>
            </Link>
          </div>
          <CardDescription>
            Tạo tài khoản mới để bắt đầu học tập
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert>
                <AlertDescription>Đăng ký thành công! Đang đăng nhập...</AlertDescription>
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
                autoFocus
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Nhập email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và số"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng ký...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Đăng ký
                </>
              )}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Đã có tài khoản?{" "}
              <Link
                href={`/login${redirectTo !== "/" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                className="text-primary hover:underline font-medium"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
