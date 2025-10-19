import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Lesson } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

export default function StudentTimetable() {
  // Get current user (mock - in real app would come from auth context)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const studentId = currentUser.id || 'student-1';

  // Fetch lessons
  const { data: lessons = [], isLoading } = useQuery<Lesson[]>({
    queryKey: ['/api/lessons/student', studentId],
    enabled: !!studentId,
  });

  // Group lessons by date
  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.date]) {
      acc[lesson.date] = [];
    }
    acc[lesson.date].push(lesson);
    return acc;
  }, {} as Record<string, Lesson[]>);

  // Sort lessons by date and time
  const sortedDates = Object.keys(groupedLessons).sort();
  Object.values(groupedLessons).forEach(dayLessons => {
    dayLessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    
    const labels: Record<string, string> = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "EEEE, dd/MM/yyyy", { locale: vi });
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const durationMins = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}p` : ''}` : `${mins}p`;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-timetable">
            Thời gian biểu học tập
          </h1>
          <p className="text-muted-foreground mt-2">
            Xem lịch học của bạn
          </p>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tóm tắt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-lessons">
                  {lessons.length}
                </p>
                <p className="text-sm text-muted-foreground">Tổng buổi học</p>
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-confirmed-lessons">
                  {lessons.filter(l => l.status === 'confirmed').length}
                </p>
                <p className="text-sm text-muted-foreground">Đã xác nhận</p>
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-lessons">
                  {lessons.filter(l => l.status === 'pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Chờ xác nhận</p>
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-lessons">
                  {lessons.filter(l => l.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timetable */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Đang tải...
            </CardContent>
          </Card>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-lessons">
                Bạn chưa có buổi học nào
              </p>
              <Link href="/tutors">
                <Button data-testid="button-find-tutors">
                  Tìm gia sư
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedDates.map(date => {
              const dayLessons = groupedLessons[date];
              
              return (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize">
                      {formatDate(date)}
                    </CardTitle>
                    <CardDescription>
                      {dayLessons.length} buổi học
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayLessons.map(lesson => (
                        <div
                          key={lesson.id}
                          className="flex items-start justify-between p-4 rounded-lg border hover-elevate"
                          data-testid={`lesson-${lesson.id}`}
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-medium" data-testid={`lesson-time-${lesson.id}`}>
                                  {lesson.startTime} - {lesson.endTime}
                                </p>
                                <Badge variant="outline">
                                  {calculateDuration(lesson.startTime, lesson.endTime)}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-4 w-4" />
                                  <span data-testid={`lesson-subject-${lesson.id}`}>
                                    {lesson.subject}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>Gia sư ID: {lesson.tutorId}</span>
                                </div>
                              </div>
                              {lesson.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {lesson.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(lesson.status)}
                            <p className="text-sm font-medium">
                              {lesson.price.toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
