"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  AlertCircle,
  Loader2,
  BookOpen,
  Bell,
} from "lucide-react";
import StudentLessonsList from "@/components/StudentLessonsList";

interface StudentStats {
  totalLessons: number;
  upcomingLessons: number;
  completedLessons: number;
  totalSpent: number;
  activeTutors: number;
  unreadNotifications: number;
}

export default function StudentDashboardNew() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      fetchStudentData();
    }
  }, [status]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Fetch student profile
      const studentResponse = await fetch('/api/students/me');
      if (!studentResponse.ok) {
        throw new Error('Failed to fetch student profile');
      }
      const studentData = await studentResponse.json();
      setStudent(studentData);

      // Calculate stats (in production, this should be a dedicated API endpoint)
      const lessonsResponse = await fetch(`/api/students/${studentData.id}/lessons`);
      if (lessonsResponse.ok) {
        const lessons = await lessonsResponse.json();

        const now = new Date();
        const upcoming = lessons.filter((l: any) => {
          const lessonDate = new Date(`${l.date} ${l.startTime}`);
          return lessonDate >= now && (l.status === 'pending' || l.status === 'confirmed');
        }).length;

        const completed = lessons.filter((l: any) => l.status === 'completed').length;

        const spent = lessons
          .filter((l: any) => l.status === 'completed')
          .reduce((sum: number, l: any) => sum + parseFloat(l.price), 0);

        // Get unique tutors
        const uniqueTutors = new Set(lessons.map((l: any) => l.tutorId));

        setStats({
          totalLessons: lessons.length,
          upcomingLessons: upcoming,
          completedLessons: completed,
          totalSpent: spent,
          activeTutors: uniqueTutors.size,
          unreadNotifications: 0, // TODO: fetch from notifications API
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
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

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Không tìm thấy hồ sơ học sinh. Vui lòng hoàn thành đăng ký.
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
          <h1 className="text-3xl font-bold mb-2">Dashboard Học Sinh</h1>
          <p className="text-muted-foreground">
            Chào mừng trở lại, {student.fullName}
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng buổi học</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
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
                <CardTitle className="text-sm font-medium">Sắp tới</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingLessons}</div>
                <p className="text-xs text-muted-foreground">
                  Buổi học đã đặt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng chi phí</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalSpent.toLocaleString('vi-VN')}đ
                </div>
                <p className="text-xs text-muted-foreground">
                  Từ {stats.completedLessons} buổi học
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gia sư</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTutors}</div>
                <p className="text-xs text-muted-foreground">
                  Đang học cùng
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons List */}
          <div className="lg:col-span-2">
            <StudentLessonsList studentId={student.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Hành động nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => router.push('/tutors')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Tìm gia sư
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/notifications')}>
                  <Bell className="h-4 w-4 mr-2" />
                  Xem thông báo
                  {stats && stats.unreadNotifications > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {stats.unreadNotifications}
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Mẹo học tập</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <p>Chuẩn bị câu hỏi trước mỗi buổi học để tối ưu thời gian</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <p>Kiểm tra kết nối internet trước giờ học 15 phút</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <p>Ghi chú lại những điểm quan trọng trong buổi học</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <p>Đánh giá gia sư sau mỗi buổi học để giúp cộng đồng</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
