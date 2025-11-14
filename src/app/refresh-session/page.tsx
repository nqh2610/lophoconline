"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RefreshSessionPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const handleRefresh = async () => {
    try {
      // Try to update session first
      await update();

      // Wait a bit for session to update
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 500);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // If refresh fails, force logout
      await signOut({ redirect: false });
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>Cần làm mới phiên đăng nhập</CardTitle>
          </div>
          <CardDescription>
            Phiên đăng nhập của bạn cần được cập nhật để sử dụng các tính năng mới
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Hệ thống đã được cập nhật với các tính năng mới. Vui lòng làm mới phiên đăng nhập
              để tiếp tục sử dụng.
            </p>
          </div>

          {session && (
            <div className="text-sm text-gray-600">
              <p>Tài khoản: <strong>{session.user?.name}</strong></p>
              <p className="mt-1">Email: {session.user?.email || 'Chưa có'}</p>
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleRefresh}
              className="w-full gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới phiên đăng nhập
            </Button>

            <Button
              onClick={handleLogout}
              className="w-full"
              variant="outline"
            >
              Đăng xuất và đăng nhập lại
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Nếu vấn đề vẫn tiếp diễn, vui lòng đăng xuất và đăng nhập lại
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
