"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Video,
  Clock,
  Calendar,
  User,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Partner {
  id: number;
  username: string;
  avatar: string | null;
  email: string | null;
}

interface VideoCallSession {
  id: number;
  sessionType: 'lesson' | 'enrollment';
  roomName: string;
  accessToken: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  paymentStatus: string;
  canJoin: boolean;
  canJoinNow: boolean;
  expiresAt: string;
  userRole: 'tutor' | 'student';
  partnerRole: 'tutor' | 'student';
  partner: Partner | null;
  joinedAt: string | null;
  partnerJoinedAt: string | null;
  leftAt: string | null;
  sessionEndedAt: string | null;
  lesson?: {
    subject: string;
    date: string;
    startTime: string;
    endTime: string;
    isTrial: boolean;
  };
  enrollment?: {
    subjectName: string;
    totalSessions: number;
    completedSessions: number;
    pricePerSession: number;
  };
}

interface UpcomingVideoCallsResponse {
  success: boolean;
  total: number;
  sessions: VideoCallSession[];
  activeSessions: VideoCallSession[];
  upcomingSessions: VideoCallSession[];
  joinableSoon: VideoCallSession[];
}

export function UpcomingVideoCallsCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UpcomingVideoCallsResponse | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    try {
      const response = await fetch('/api/video-call/upcoming');
      if (!response.ok) {
        throw new Error('Failed to fetch video call sessions');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video calls');
      toast({
        title: 'Error',
        description: 'Failed to load video call sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntil = (dateStr: string) => {
    const now = new Date();
    const target = new Date(dateStr);
    const diffMs = target.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 0) return 'Started';
    if (diffMins < 60) return `${diffMins} phút nữa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ nữa`;
    return `${Math.floor(diffMins / 1440)} ngày nữa`;
  };

  const handleJoinVideoCall = async (accessToken: string) => {
    try {
      console.log('🚀 [UpcomingVideoCallCard] Joining video call:', accessToken);

      // Call API to get Jitsi URL
      const response = await fetch('/api/video-call/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      console.log('📥 [UpcomingVideoCallCard] API Response:', data);

      if (!response.ok || !data.success) {
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể vào lớp',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Open Jitsi URL directly in new tab (STABLE APPROACH)
      if (data.jitsiUrl) {
        console.log('✅ [UpcomingVideoCallCard] Opening Jitsi in new tab');
        window.open(data.jitsiUrl, '_blank', 'noopener,noreferrer');

        toast({
          title: 'Đã mở video call',
          description: 'Video call đã mở trong tab mới',
        });

        // Refresh session list
        setTimeout(() => {
          fetchUpcomingSessions();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error joining video call:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể kết nối video call',
        variant: 'destructive',
      });
    }
  };

  const SessionCard = ({ session }: { session: VideoCallSession }) => {
    const isActive = session.status === 'active' && !session.sessionEndedAt;
    const canJoin = session.canJoin && session.canJoinNow;
    const needsPayment = !session.canJoin && session.paymentStatus === 'unpaid';

    return (
      <Card className={`${isActive ? 'border-green-500 shadow-lg' : ''}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">
                    {session.lesson?.subject || session.enrollment?.subjectName || 'Session'}
                  </h3>
                  {session.lesson?.isTrial && (
                    <Badge variant="secondary">Học thử</Badge>
                  )}
                  {isActive && (
                    <Badge variant="default" className="bg-green-500">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="capitalize">{session.userRole}</span>
                  {session.partner && (
                    <>
                      <span>•</span>
                      <span>với {session.partner.username}</span>
                    </>
                  )}
                </div>
              </div>
              {needsPayment && (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {session.canJoin && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            {/* Time Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(session.scheduledStartTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatTime(session.scheduledStartTime)} - {formatTime(session.scheduledEndTime)}
                </span>
              </div>
            </div>

            {/* Price Info */}
            {session.lesson && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Miễn phí (Học thử)</span>
              </div>
            )}

            {/* Payment Warning */}
            {needsPayment && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Vui lòng thanh toán để tham gia lớp học
                </AlertDescription>
              </Alert>
            )}

            {/* Status Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isActive
                  ? 'Đang diễn ra'
                  : canJoin
                  ? getTimeUntil(session.scheduledStartTime)
                  : 'Chưa thể vào'}
              </span>
              {session.joinedAt && (
                <span className="text-green-600">Đã vào lúc {formatTime(session.joinedAt)}</span>
              )}
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {canJoin ? (
                <Button
                  className="w-full gap-2"
                  size="sm"
                  onClick={() => handleJoinVideoCall(session.accessToken)}
                >
                  <Video className="h-4 w-4" />
                  {isActive ? 'Vào lớp ngay' : 'Sẵn sàng vào lớp'}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              ) : needsPayment ? (
                <Button className="w-full" size="sm" variant="outline" disabled>
                  Cần thanh toán trước
                </Button>
              ) : (
                <Button className="w-full" size="sm" variant="outline" disabled>
                  Chưa đến giờ vào lớp
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch học trực tuyến</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lịch học trực tuyến</CardTitle>
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

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Lịch học trực tuyến
          </CardTitle>
          <CardDescription>Bạn chưa có buổi học nào sắp tới</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có lớp học trực tuyến nào được lên lịch</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Lịch học trực tuyến
            </CardTitle>
            <CardDescription>
              {data.activeSessions.length} đang diễn ra • {data.joinableSoon.length} sắp bắt đầu •{' '}
              {data.upcomingSessions.length} sắp tới
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUpcomingSessions}>
            Làm mới
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active Sessions */}
        {data.activeSessions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Đang diễn ra ({data.activeSessions.length})
            </h3>
            {data.activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}

        {/* Joinable Soon */}
        {data.joinableSoon.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Sẵn sàng vào lớp ({data.joinableSoon.length})</h3>
            {data.joinableSoon.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}

        {/* Upcoming */}
        {data.upcomingSessions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Sắp tới ({data.upcomingSessions.length})</h3>
            {data.upcomingSessions.slice(0, 3).map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
            {data.upcomingSessions.length > 3 && (
              <p className="text-xs text-center text-muted-foreground">
                +{data.upcomingSessions.length - 3} buổi học khác
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
