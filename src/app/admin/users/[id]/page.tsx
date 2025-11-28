"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, LayoutDashboard, User as UserIcon, Mail, Phone, Calendar, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  phone?: string;
  avatar?: string;
  isActive: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: Date;
  profileData?: any;
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = params.id as string;

  useEffect(() => {
    // Check if current user is admin
    if (session && !session.user.roles?.includes('admin')) {
      toast({
        title: "Không có quyền",
        description: "Bạn không có quyền truy cập trang này",
        variant: "destructive",
      });
      router.push("/");
      return;
    }

    if (session) {
      fetchUserDetail();
    }
  }, [session, userId]);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      } else {
        toast({
          title: "Lỗi",
          description: data.error || "Không thể tải thông tin người dùng",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi tải dữ liệu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return "Chưa có";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      admin: { label: "Quản trị viên", variant: "destructive" },
      tutor: { label: "Giáo viên", variant: "default" },
      student: { label: "Học viên", variant: "secondary" },
    };

    const roleInfo = roleMap[role] || { label: role, variant: "secondary" as const };

    return (
      <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-8">
        <Button onClick={() => router.push("/admin/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <p className="mt-4 text-muted-foreground">Không tìm thấy người dùng</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/users")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>

          <h1 className="text-3xl font-bold text-destructive">
            Chi tiết người dùng
          </h1>
        </div>

        {/* User Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl">{user.username[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold">{user.username}</h2>
                  {getRoleBadge(user.role)}
                  <Badge
                    variant={user.isActive ? "default" : "destructive"}
                    className={user.isActive ? "bg-green-500" : "bg-red-500"}
                  >
                    {user.isActive ? "Hoạt động" : "Đã khóa"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                  )}

                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tạo lúc: {formatDate(user.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Đăng nhập cuối: {formatDate(user.lastLogin)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Xem thông tin chi tiết</CardTitle>
            <CardDescription>
              Truy cập dashboard và hồ sơ của người dùng này
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* View Dashboard with Impersonation */}
              {(user.role === 'admin' || user.role === 'tutor' || user.role === 'student') && (
                <Link
                  href={`/${user.role}/dashboard?_impersonate=${user.id}&_role=${user.role}`}
                  target="_blank"
                >
                  <Button
                    variant="outline"
                    className="w-full h-auto flex flex-col gap-2 py-6"
                  >
                    <LayoutDashboard className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-semibold">Dashboard {user.role === "admin" ? "Admin" : user.role === "tutor" ? "Giáo viên" : "Học viên"}</p>
                      <p className="text-xs text-muted-foreground">Xem với quyền {user.role}</p>
                    </div>
                  </Button>
                </Link>
              )}

              {/* View Tutor Public Profile */}
              {user.role === 'tutor' && user.profileData?.id && (
                <Link
                  href={`/tutor/${user.profileData.id}`}
                  target="_blank"
                >
                  <Button
                    variant="outline"
                    className="w-full h-auto flex flex-col gap-2 py-6"
                  >
                    <ExternalLink className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-semibold">Hồ sơ giáo viên</p>
                      <p className="text-xs text-muted-foreground">Xem trang chi tiết</p>
                    </div>
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Info for Tutor/Student */}
        {user.profileData && (
          <Card>
            <CardHeader>
              <CardTitle>Thông tin {user.role === "tutor" ? "giáo viên" : "học viên"}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(user.profileData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
