"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TutorRegistrationForm } from "@/components/TutorRegistrationForm";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function TutorRegistration() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Nếu chưa đăng nhập, chuyển đến trang đăng nhập
    if (status === "unauthenticated") {
      // Lưu URL hiện tại để redirect sau khi đăng nhập
      const currentUrl = encodeURIComponent("/tutor-registration");
      router.push(`/?login=true&redirectTo=${currentUrl}`);
    }
  }, [status, router]);

  // Đang kiểm tra trạng thái đăng nhập
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!session) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Yêu cầu đăng nhập
              </CardTitle>
              <CardDescription>
                Bạn cần đăng nhập để đăng ký làm gia sư
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Để đăng ký làm gia sư, bạn cần có tài khoản và đăng nhập vào hệ thống.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="flex-1">
                  <Link href="/?login=true&redirectTo=/tutor-registration">
                    Đăng nhập
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/?signup=true&redirectTo=/tutor-registration">
                    Đăng ký tài khoản mới
                  </Link>
                </Button>
              </div>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay về trang chủ
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Đã đăng nhập - hiển thị form đăng ký
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trang chủ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-tutor-registration">
            Đăng ký làm gia sư
          </h1>
          <p className="text-muted-foreground mt-2">
            Xin chào <span className="font-semibold">{session.user?.name || session.user?.email}</span>! Điền thông tin bên dưới để trở thành gia sư trên LopHoc.Online
          </p>
        </div>

        {/* Registration Form */}
        <TutorRegistrationForm />
      </div>
    </div>
  );
}
