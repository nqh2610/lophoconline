"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  Calendar,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Video,
  Star,
  MessageSquare,
} from "lucide-react";

interface Lesson {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  price: string;
  isTrial: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  cancelledBy?: string;
  cancellationReason?: string;
  meetingLink?: string;
  createdAt: string;
  tutor?: {
    id: number;
    fullName: string;
    avatar?: string;
    rating?: number;
  };
  transaction?: {
    id: number;
    amount: string;
    status: string;
  };
}

interface StudentLessonsListProps {
  studentId: number;
}

const StatusBadge = ({ status, cancelledBy }: { status: string; cancelledBy?: string }) => {
  const statusConfig = {
    pending: {
      variant: "secondary" as const,
      icon: Clock,
      text: "Đang chờ xác nhận",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
    confirmed: {
      variant: "default" as const,
      icon: CheckCircle,
      text: "Đã xác nhận",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    },
    completed: {
      variant: "default" as const,
      icon: CheckCircle,
      text: "Đã hoàn thành",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    },
    cancelled: {
      variant: "destructive" as const,
      icon: XCircle,
      text: cancelledBy === 'tutor' ? "Gia sư đã từ chối" : "Đã hủy",
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  );
};

export default function StudentLessonsList({ studentId }: StudentLessonsListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    fetchLessons();
  }, [studentId]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/students/${studentId}/lessons`);

      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }

      const data = await response.json();
      setLessons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLessons = () => {
    const now = new Date();

    return lessons.filter(lesson => {
      const lessonDate = new Date(`${lesson.date} ${lesson.startTime}`);

      if (filter === 'upcoming') {
        return lessonDate >= now && (lesson.status === 'pending' || lesson.status === 'confirmed');
      } else if (filter === 'past') {
        return lessonDate < now || lesson.status === 'completed' || lesson.status === 'cancelled';
      }
      return true;
    });
  };

  const filteredLessons = getFilteredLessons();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch học của bạn</CardTitle>
          <CardDescription>Quản lý các buổi học đã đặt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch học của bạn</CardTitle>
          <CardDescription>Quản lý các buổi học đã đặt</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lịch học của bạn</CardTitle>
            <CardDescription>
              {lessons.length === 0
                ? "Bạn chưa có buổi học nào"
                : `${lessons.length} buổi học tổng cộng`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tất cả
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              Sắp tới
            </Button>
            <Button
              variant={filter === 'past' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('past')}
            >
              Đã qua
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLessons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Không có buổi học nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLessons.map((lesson) => {
              const lessonDate = new Date(`${lesson.date} ${lesson.startTime}`);
              const now = new Date();
              const isPast = lessonDate < now;
              const canJoin = lesson.status === 'confirmed' &&
                             lesson.meetingLink &&
                             !isPast &&
                             lessonDate.getTime() - now.getTime() < 3600000; // Within 1 hour

              return (
                <Card key={lesson.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {lesson.tutor?.fullName || 'Unknown Tutor'}
                            </p>
                            {lesson.tutor?.rating && (
                              <div className="flex items-center gap-1 text-sm">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{lesson.tutor.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <StatusBadge status={lesson.status} cancelledBy={lesson.cancelledBy} />
                          {lesson.isTrial === 1 && (
                            <Badge variant="outline">Học thử</Badge>
                          )}
                        </div>
                      </div>

                      {/* Lesson Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(lesson.date).toLocaleDateString('vi-VN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {lesson.startTime} - {lesson.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{lesson.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {parseInt(lesson.price).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>

                      {/* Status Alerts */}
                      {lesson.status === 'pending' && (
                        <Alert>
                          <Clock className="h-4 w-4" />
                          <AlertDescription>
                            Đang chờ gia sư xác nhận. Bạn sẽ nhận được thông báo khi gia sư phản hồi.
                          </AlertDescription>
                        </Alert>
                      )}

                      {lesson.status === 'cancelled' && lesson.cancellationReason && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Lý do hủy:</strong> {lesson.cancellationReason}
                            {lesson.transaction?.status === 'refunded' &&
                              ' Học phí đã được hoàn lại.'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {lesson.status === 'confirmed' && !isPast && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Lịch học đã được xác nhận!
                            {lesson.meetingLink
                              ? ' Link học online sẽ được gửi trước giờ học 1 tiếng.'
                              : ' Bạn sẽ nhận được link học online trước giờ học.'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        {canJoin && lesson.meetingLink && (
                          <Button
                            className="flex-1"
                            onClick={() => window.open(lesson.meetingLink, '_blank')}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Tham gia học
                          </Button>
                        )}

                        {lesson.status === 'completed' && (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.location.href = `/tutor/${lesson.tutor?.id}?review=true`}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Đánh giá
                          </Button>
                        )}

                        {lesson.tutor && (
                          <Button
                            variant="outline"
                            onClick={() => window.location.href = `/tutor/${lesson.tutor!.id}`}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Xem hồ sơ gia sư
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
