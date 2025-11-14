"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Clock, Star, TrendingUp, Search, CreditCard, User, Video, MessageSquare, FileText } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UpcomingVideoCallsCard } from "@/components/UpcomingVideoCallCard";
import { TrialLessonsCard } from "@/components/TrialLessonsCard";

export default function StudentDashboard() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Chào mừng, {session?.user?.name || "Học viên"}!
          </h1>
          <p className="text-muted-foreground">
            Quản lý học tập và theo dõi tiến độ của bạn
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lớp đang học</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">+1 so với tháng trước</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buổi học tuần này</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">2 buổi sắp tới</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Giờ học tháng này</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.5h</div>
              <p className="text-xs text-muted-foreground">+2.5h so với tháng trước</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8.5</div>
              <p className="text-xs text-muted-foreground">+0.5 điểm</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chức năng học viên</CardTitle>
            <CardDescription>Tất cả các tính năng quản lý dành cho học viên</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link href="/tutors">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <Search className="h-6 w-6" />
                  <span className="text-xs">Tìm gia sư</span>
                </Button>
              </Link>
              <Link href="/student/booking">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <Calendar className="h-6 w-6" />
                  <span className="text-xs">Đặt lịch học</span>
                </Button>
              </Link>
              <Link href="/student/my-lessons">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-xs">Lịch học của tôi</span>
                </Button>
              </Link>
              <Link href="/student/financial">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <CreditCard className="h-6 w-6" />
                  <span className="text-xs">Tài chính</span>
                </Button>
              </Link>
              <Link href="/student/register">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4">
                  <User className="h-6 w-6" />
                  <span className="text-xs">Hồ sơ</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Trial Lessons Section */}
        <div className="mb-6">
          <TrialLessonsCard />
        </div>

        {/* Video Calls Section */}
        <div className="mb-6">
          <UpcomingVideoCallsCard />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Lịch học sắp tới</CardTitle>
              <CardDescription>Các buổi học trong tuần này</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: "Toán", tutor: "Nguyễn Văn A", time: "14:00 - 16:00", day: "Thứ 2" },
                  { subject: "Vật lý", tutor: "Trần Thị B", time: "09:00 - 11:00", day: "Thứ 4" },
                  { subject: "Hóa học", tutor: "Lê Văn C", time: "15:00 - 17:00", day: "Thứ 6" },
                ].map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{lesson.subject}</p>
                      <p className="text-sm text-muted-foreground">Gia sư: {lesson.tutor}</p>
                      <p className="text-sm text-muted-foreground">{lesson.day}, {lesson.time}</p>
                    </div>
                    <Button size="sm" variant="outline">Chi tiết</Button>
                  </div>
                ))}
              </div>
              <Link href="/student/timetable">
                <Button className="w-full mt-4" variant="outline">
                  Xem tất cả lịch học
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Learning Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ học tập</CardTitle>
              <CardDescription>Theo dõi quá trình học tập của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: "Toán", progress: 75, lessons: 12, total: 16 },
                  { subject: "Vật lý", progress: 60, lessons: 9, total: 15 },
                  { subject: "Hóa học", progress: 45, lessons: 6, total: 13 },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.subject}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.lessons}/{item.total} buổi
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "Hoàn thành buổi học Toán", time: "2 giờ trước", type: "success", icon: BookOpen },
                { action: "Thanh toán học phí tháng 10", time: "1 ngày trước", type: "info", icon: CreditCard },
                { action: "Đánh giá gia sư Nguyễn Văn A - 5 sao", time: "2 ngày trước", type: "success", icon: Star },
                { action: "Đăng ký lớp Vật lý mới", time: "3 ngày trước", type: "info", icon: Calendar },
              ].map((activity, idx) => {
                const Icon = activity.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 p-2">
                    <div className={`p-2 rounded-lg ${activity.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
