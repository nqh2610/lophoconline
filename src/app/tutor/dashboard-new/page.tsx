"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Star,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  Bell,
} from "lucide-react";
import PendingLessonRequests from "@/components/PendingLessonRequests";

interface TutorStats {
  totalLessons: number;
  completedLessons: number;
  pendingLessons: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  completionRate: number;
}

export default function TutorDashboardNew() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tutor, setTutor] = useState<any>(null);
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchTutorData();
    }
  }, [status]);

  const fetchTutorData = async () => {
    try {
      setLoading(true);

      // Fetch tutor profile
      const tutorResponse = await fetch('/api/tutors/me');
      if (!tutorResponse.ok) {
        throw new Error('Failed to fetch tutor profile');
      }
      const tutorData = await tutorResponse.json();
      setTutor(tutorData);

      // Calculate stats (in production, this should be a dedicated API endpoint)
      const lessonsResponse = await fetch(`/api/tutors/${tutorData.id}/lessons`);
      if (lessonsResponse.ok) {
        const lessons = await lessonsResponse.json();

        const completed = lessons.filter((l: any) => l.status === 'completed').length;
        const pending = lessons.filter((l: any) => l.status === 'pending').length;

        const earnings = lessons
          .filter((l: any) => l.status === 'completed')
          .reduce((sum: number, l: any) => sum + parseFloat(l.price), 0);

        setStats({
          totalLessons: lessons.length,
          completedLessons: completed,
          pendingLessons: pending,
          totalEarnings: earnings,
          averageRating: tutorData.rating || 0,
          totalReviews: tutorData.totalReviews || 0,
          responseRate: tutorData.responseRate || 0,
          completionRate: tutorData.completionRate || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching tutor data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Không tìm thấy hồ sơ giáo viên. Vui lòng hoàn thành đăng ký giáo viên.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Giáo Viên</h1>
          <p className="text-muted-foreground">
            Chào mừng trở lại, {tutor.fullName}
          </p>
        </div>

        {/* Verification Status Alert */}
        {tutor.verificationStatus === 'pending' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Hồ sơ của bạn đang được xem xét. Bạn sẽ nhận được thông báo khi được phê duyệt.
            </AlertDescription>
          </Alert>
        )}

        {tutor.verificationStatus === 'rejected' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Hồ sơ của bạn đã bị từ chối. Vui lòng cập nhật thông tin và đăng ký lại.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng buổi học</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLessons}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.completedLessons} đã hoàn thành
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đang chờ</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLessons}</div>
                <p className="text-xs text-muted-foreground">
                  Yêu cầu cần xác nhận
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalEarnings.toLocaleString('vi-VN')}đ
                </div>
                <p className="text-xs text-muted-foreground">
                  Từ {stats.completedLessons} buổi học
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Đánh giá</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  {stats.averageRating.toFixed(1)}
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalReviews} đánh giá
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Yêu cầu đang chờ
              {stats && stats.pendingLessons > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.pendingLessons}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Lịch sắp tới</TabsTrigger>
            <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          </TabsList>

          {/* Pending Lessons Tab */}
          <TabsContent value="pending">
            {tutor.verificationStatus === 'verified' ? (
              <PendingLessonRequests tutorId={tutor.id} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Bạn cần được xác minh trước khi có thể nhận yêu cầu đặt lịch.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Upcoming Lessons Tab */}
          <TabsContent value="upcoming">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sắp tới</CardTitle>
                <CardDescription>Các buổi học đã được xác nhận</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chức năng đang phát triển</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completed Lessons Tab */}
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Buổi học đã hoàn thành</CardTitle>
                <CardDescription>Lịch sử các buổi học</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chức năng đang phát triển</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tỷ lệ phản hồi</CardTitle>
                  <CardDescription>
                    Tỷ lệ phản hồi yêu cầu đặt lịch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">
                        {stats?.responseRate || 0}%
                      </span>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mục tiêu: {'>'} 90%
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tỷ lệ hoàn thành</CardTitle>
                  <CardDescription>
                    Tỷ lệ hoàn thành các buổi học đã xác nhận
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">
                        {stats?.completionRate || 0}%
                      </span>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mục tiêu: {'>'} 95%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
