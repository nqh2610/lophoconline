"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
  
  // Check if redirected from tutor registration
  const isFromTutorRegistration = redirectTo === "/tutor-registration";
  
  // Check if redirected from booking (tutor detail page)
  const isFromBooking = redirectTo.startsWith("/tutor/");

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

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Show specific error message from server if available
        // Otherwise show generic error
        setError(result.error === "CredentialsSignin"
          ? "Tên đăng nhập hoặc mật khẩu không đúng"
          : result.error);
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Redirect to the intended page or home
        router.push(redirectTo);
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
            <CardTitle className="text-2xl font-bold">Đăng nhập</CardTitle>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Trang chủ
              </Button>
            </Link>
          </div>
          <CardDescription>
            Nhập thông tin đăng nhập của bạn để tiếp tục
          </CardDescription>
          {isFromTutorRegistration && (
            <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Đăng ký làm gia sư:</strong> Vui lòng đăng nhập trước. Nếu chưa có tài khoản, hãy{" "}
                <Link href={`/signup?redirectTo=/tutor-registration`} className="underline font-semibold">
                  đăng ký tại đây
                </Link>.
              </AlertDescription>
            </Alert>
          )}
          {isFromBooking && !isFromTutorRegistration && (
            <Alert className="mt-4 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Đặt lịch học:</strong> Vui lòng đăng nhập để tiếp tục đặt lịch. Nếu chưa có tài khoản, hãy{" "}
                <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="underline font-semibold">
                  nhấn vào đây để đăng ký
                </Link>.
              </AlertDescription>
            </Alert>
          )}
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
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
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
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
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
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Đăng nhập
                </>
              )}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link
                href={`/signup${redirectTo !== "/" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
                className="text-primary hover:underline font-medium"
              >
                Đăng ký ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
