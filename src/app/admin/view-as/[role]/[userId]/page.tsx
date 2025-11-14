"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminViewAsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const role = params.role as string;
  const userId = params.userId as string;

  useEffect(() => {
    // Check if current user is admin
    if (session && !session.user.roles?.includes('admin')) {
      setError("Bạn không có quyền truy cập trang này");
      setLoading(false);
      return;
    }

    if (session) {
      // Valid roles
      if (!["admin", "tutor", "student"].includes(role)) {
        setError("Vai trò không hợp lệ");
        setLoading(false);
        return;
      }

      // Redirect to the appropriate dashboard
      const targetUrl = `/${role}/dashboard`;
      setLoading(false);

      // Use iframe to display the dashboard
      const iframe = document.getElementById("dashboard-frame") as HTMLIFrameElement;
      if (iframe) {
        iframe.src = targetUrl;
      }
    }
  }, [session, role, userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-yellow-50 border-b border-yellow-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại quản lý users
            </Button>
            <Alert className="mb-0 py-2 bg-yellow-100 border-yellow-300">
              <AlertCircle className="h-4 w-4 text-yellow-800" />
              <AlertDescription className="text-yellow-800 text-sm">
                Bạn đang xem dashboard với vai trò: <strong>{role === "admin" ? "Quản trị viên" : role === "tutor" ? "Gia sư" : "Học viên"}</strong> (User ID: {userId})
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Dashboard iframe */}
      <div className="flex-1">
        <iframe
          id="dashboard-frame"
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 80px)" }}
          title={`Dashboard ${role}`}
        />
      </div>
    </div>
  );
}
