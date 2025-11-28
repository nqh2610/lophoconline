import Link from "next/link";
import { Users, GraduationCap, DollarSign, BookOpen, Clock, CheckCircle, UserCircle, Receipt, AlertCircle } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const recentActivities = [
    {
      id: 1,
      type: 'tutor_registered',
      message: 'Giáo viên mới đăng ký: Nguyễn Văn A',
      time: '5 phút trước',
      icon: GraduationCap,
      color: 'text-blue-500',
    },
    {
      id: 2,
      type: 'payment_success',
      message: 'Thanh toán thành công: 200.000 VNĐ',
      time: '15 phút trước',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      id: 3,
      type: 'new_student',
      message: 'Học viên mới: Trần Thị B',
      time: '30 phút trước',
      icon: Users,
      color: 'text-purple-500',
    },
    {
      id: 4,
      type: 'lesson_completed',
      message: 'Buổi học hoàn thành: Toán lớp 10',
      time: '1 giờ trước',
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      id: 5,
      type: 'review_posted',
      message: 'Đánh giá mới: 5 sao cho giáo viên Lê Văn C',
      time: '2 giờ trước',
      icon: BookOpen,
      color: 'text-yellow-500',
    },
  ];

  const pendingTutors = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor1',
      subjects: 'Toán, Vật Lý',
      registeredDate: '12/10/2025',
    },
    {
      id: 2,
      name: 'Trần Thị B',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor2',
      subjects: 'Tiếng Anh, IELTS',
      registeredDate: '12/10/2025',
    },
    {
      id: 3,
      name: 'Lê Văn C',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor3',
      subjects: 'Hóa học',
      registeredDate: '11/10/2025',
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive" data-testid="text-admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Quản lý và giám sát hệ thống LopHoc.Online</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Tổng người dùng"
            value="1,234"
            icon={Users}
            trend="+12% so với tháng trước"
            testId="stat-total-users"
          />
          <StatsCard
            title="Giáo viên chờ duyệt"
            value="45"
            icon={Clock}
            trend="Cần xem xét"
            testId="stat-pending-tutors"
          />
          <StatsCard
            title="Doanh thu tháng này"
            value="125M VNĐ"
            icon={DollarSign}
            trend="+8% so với tháng trước"
            testId="stat-revenue"
          />
          <StatsCard
            title="Buổi học tháng này"
            value="856"
            icon={BookOpen}
            trend="+15% so với tháng trước"
            testId="stat-lessons"
          />
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>Các chức năng quản lý chính</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Link href="/admin/users">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <Users className="h-6 w-6" />
                  <span className="text-xs">Người dùng</span>
                </Button>
              </Link>
              <Link href="/admin/students">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <UserCircle className="h-6 w-6" />
                  <span className="text-xs">Học viên</span>
                </Button>
              </Link>
              <Link href="/admin/tutors">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <GraduationCap className="h-6 w-6" />
                  <span className="text-xs">Giáo viên</span>
                </Button>
              </Link>
              <Link href="/admin/transactions">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <Receipt className="h-6 w-6" />
                  <span className="text-xs">Giao dịch</span>
                </Button>
              </Link>
              <Link href="/admin/financial">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <DollarSign className="h-6 w-6" />
                  <span className="text-xs">Tài chính</span>
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-xs">Báo cáo</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Tutors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Giáo viên chờ phê duyệt
              </CardTitle>
              <CardDescription>
                {pendingTutors.length} giáo viên đang chờ xét duyệt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingTutors.map((tutor) => (
                  <div
                    key={tutor.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                    data-testid={`pending-tutor-${tutor.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={tutor.avatar} />
                        <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground">{tutor.subjects}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        Chờ duyệt
                      </Badge>
                      <p className="text-xs text-muted-foreground">{tutor.registeredDate}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/admin/tutors">
                <Button className="w-full mt-4" variant="outline">
                  Xem tất cả giáo viên
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
              <CardDescription>
                Các hoạt động mới nhất trên hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3"
                      data-testid={`activity-${activity.id}`}
                    >
                      <div className={`p-2 rounded-md bg-muted ${activity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Giáo viên hoạt động</p>
                  <p className="text-2xl font-bold">342</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Học viên hoạt động</p>
                  <p className="text-2xl font-bold">892</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reviews hôm nay</p>
                  <p className="text-2xl font-bold">28</p>
                </div>
                <BookOpen className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
