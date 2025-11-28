"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Video,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

interface Lesson {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  type: string;
  totalPrice: number;
  createdAt: string;
  cancellationReason?: string;
  tutor: {
    id: number;
    fullName: string;
    avatar: string | null;
    rating: number | null;
  } | null;
  transaction: {
    id: number;
    amount: number;
    status: string;
    method: string;
  } | null;
}

const statusConfig = {
  pending: {
    label: 'Chờ xác nhận',
    variant: 'secondary' as const,
    icon: Clock,
    color: 'text-yellow-600',
  },
  confirmed: {
    label: 'Đã xác nhận',
    variant: 'default' as const,
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  completed: {
    label: 'Hoàn thành',
    variant: 'outline' as const,
    icon: CheckCircle2,
    color: 'text-blue-600',
  },
  cancelled: {
    label: 'Đã hủy',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600',
  },
};

export default function MyLessonsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (session?.user) {
      fetchLessons();
    }
  }, [session]);

  const fetchLessons = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get student profile first
      const studentResponse = await fetch('/api/students/me');
      if (!studentResponse.ok) {
        throw new Error('Failed to fetch student profile');
      }
      const studentData = await studentResponse.json();

      // Fetch lessons
      const response = await fetch(`/api/students/${studentData.id}/lessons`);
      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }

      const data = await response.json();
      setLessons(data);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const filterLessonsByStatus = (status?: string) => {
    if (!status || status === 'all') return lessons;
    return lessons.filter(lesson => lesson.status === status);
  };

  const upcomingLessons = lessons.filter(l => {
    if (l.status !== 'confirmed') return false;
    const lessonDateTime = new Date(`${l.date}T${l.startTime}`);
    return lessonDateTime > new Date();
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getTimeUntilLesson = (date: string, startTime: string) => {
    const lessonDateTime = new Date(`${date}T${startTime}`);
    const now = new Date();
    const diff = lessonDateTime.getTime() - now.getTime();

    if (diff < 0) return 'Đã qua';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `Còn ${days} ngày`;
    if (hours > 0) return `Còn ${hours} giờ`;
    return 'Sắp bắt đầu';
  };

  const LessonCard = ({ lesson }: { lesson: Lesson }) => {
    const config = statusConfig[lesson.status];
    const StatusIcon = config.icon;
    const isUpcoming = lesson.status === 'confirmed' && new Date(`${lesson.date}T${lesson.startTime}`) > new Date();
    const canJoinNow = isUpcoming && getTimeUntilLesson(lesson.date, lesson.startTime) === 'Sắp bắt đầu';

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={lesson.tutor?.avatar || undefined} />
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {lesson.tutor?.fullName || 'Giáo viên'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {lesson.tutor?.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {(lesson.tutor.rating / 10).toFixed(1)}
                    </span>
                  )}
                  <span className="text-xs">
                    {lesson.type === 'trial' ? 'Buổi học thử' : 'Buổi học chính thức'}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={config.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
              {isUpcoming && (
                <Badge variant="outline" className="text-xs">
                  {getTimeUntilLesson(lesson.date, lesson.startTime)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Ngày:</span>
              <span>{formatDate(lesson.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Giờ:</span>
              <span>{lesson.startTime} - {lesson.endTime}</span>
            </div>
          </div>

          {lesson.status === 'cancelled' && lesson.cancellationReason && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lý do hủy</AlertTitle>
              <AlertDescription>{lesson.cancellationReason}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Học phí</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(lesson.totalPrice)}
              </p>
              {lesson.transaction && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {lesson.transaction.status === 'completed' ? 'Đã thanh toán' :
                   lesson.transaction.status === 'refunded' ? 'Đã hoàn tiền' :
                   'Chờ thanh toán'}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {/* NOTE: Video call button removed - use UpcomingVideoCallsCard component in dashboard instead */}
              {/* Video call now requires accessToken, not lesson ID */}
              {canJoinNow && (
                <Button className="gap-2" variant="outline" disabled>
                  <Video className="h-4 w-4" />
                  Vào dashboard để vào lớp
                </Button>
              )}
              {lesson.status === 'completed' && (
                <Link href={`/student/review/${lesson.id}`}>
                  <Button variant="outline" className="gap-2">
                    <Star className="h-4 w-4" />
                    Đánh giá
                  </Button>
                </Link>
              )}
              <Link href={`/tutor/${lesson.tutor?.id}`}>
                <Button variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Lịch học của tôi</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý và theo dõi tất cả các buổi học của bạn
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{lessons.length}</p>
                <p className="text-sm text-muted-foreground">Tổng buổi học</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {filterLessonsByStatus('pending').length}
                </p>
                <p className="text-sm text-muted-foreground">Chờ xác nhận</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {upcomingLessons.length}
                </p>
                <p className="text-sm text-muted-foreground">Sắp diễn ra</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {filterLessonsByStatus('completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Hoàn thành</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Tất cả ({lessons.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Chờ ({filterLessonsByStatus('pending').length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Đã xác nhận ({filterLessonsByStatus('confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Hoàn thành ({filterLessonsByStatus('completed').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Đã hủy ({filterLessonsByStatus('cancelled').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(status => (
            <TabsContent key={status} value={status} className="space-y-4 mt-6">
              {filterLessonsByStatus(status === 'all' ? undefined : status).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Không có buổi học nào</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {status === 'all' ? 'Bạn chưa đặt buổi học nào.' :
                       status === 'pending' ? 'Không có buổi học nào đang chờ xác nhận.' :
                       status === 'confirmed' ? 'Không có buổi học nào đã được xác nhận.' :
                       status === 'completed' ? 'Bạn chưa hoàn thành buổi học nào.' :
                       'Không có buổi học nào bị hủy.'}
                    </p>
                    {status === 'all' && (
                      <Link href="/tutors">
                        <Button>Tìm giáo viên ngay</Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filterLessonsByStatus(status === 'all' ? undefined : status).map(lesson => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
