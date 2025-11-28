"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Video, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { vi } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface VideoSession {
  id: number;
  roomName: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  tutorJoinedAt?: string;
  studentJoinedAt?: string;
  sessionEndedAt?: string;
}

interface TrialLesson {
  id: number;
  tutorId: number;
  studentId: number;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  tutorConfirmed: number;
  studentConfirmed: number;
  meetingLink?: string;
  createdAt: string;
  completedAt?: string;
  tutorName?: string;
  tutorEmail?: string;
  tutorAvatar?: string;
  tutorRating?: number;
  tutorHourlyRate?: number;
  videoSession?: VideoSession;
}

export function TrialLessonsCard() {
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed'>('confirmed');
  const { toast } = useToast();

  useEffect(() => {
    fetchTrialLessons();
  }, []);

  const fetchTrialLessons = async () => {
    try {
      const response = await fetch('/api/lessons/trial?role=student');
      if (response.ok) {
        const data = await response.json();
        setTrialLessons(data.lessons || []);
      }
    } catch (error) {
      console.error('Failed to fetch trial lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle join video call - Direct URL approach (STABLE)
  const handleJoinVideoCall = async (meetingLink: string) => {
    try {
      // Extract accessToken from URL: /video-call/{accessToken}
      const accessToken = meetingLink.split('/video-call/')[1];

      if (!accessToken) {
        toast({
          title: 'Lỗi',
          description: 'Link video call không hợp lệ',
          variant: 'destructive',
        });
        return;
      }

      console.log('🚀 [TrialLessonsCard] Joining video call:', accessToken);

      // Call API to get Jitsi URL
      const response = await fetch('/api/video-call/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      console.log('📥 [TrialLessonsCard] API Response:', data);

      if (!response.ok || !data.success) {
        toast({
          title: 'Lỗi',
          description: data.error || 'Không thể vào lớp',
          variant: 'destructive',
        });
        return;
      }

      // ✅ Open Jitsi URL directly in new tab
      if (data.jitsiUrl) {
        console.log('✅ [TrialLessonsCard] Opening Jitsi in new tab');
        window.open(data.jitsiUrl, '_blank', 'noopener,noreferrer');

        toast({
          title: 'Đã mở video call',
          description: 'Video call đã mở trong tab mới',
        });

        // Refresh lessons
        setTimeout(() => {
          fetchTrialLessons();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><AlertCircle className="w-3 h-3 mr-1" />Chờ xác nhận</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50"><CheckCircle className="w-3 h-3 mr-1" />Đã xác nhận</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLessons = trialLessons.filter(lesson => lesson.status === activeTab);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buổi học thử</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pendingCount = trialLessons.filter(l => l.status === 'pending').length;
  const confirmedCount = trialLessons.filter(l => l.status === 'confirmed').length;
  const completedCount = trialLessons.filter(l => l.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buổi học thử của tôi</CardTitle>
        <CardDescription>Theo dõi tiến trình các buổi học thử</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Chờ xác nhận ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'confirmed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Đã xác nhận ({confirmedCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Hoàn thành ({completedCount})
          </button>
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Chưa có buổi học thử nào</p>
              <Link href="/tutors">
                <Button variant="link" className="mt-2">Tìm giáo viên để đăng ký học thử</Button>
              </Link>
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3">
                    {lesson.tutorAvatar && (
                      <img
                        src={lesson.tutorAvatar}
                        alt={lesson.tutorName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{lesson.tutorName || 'Giáo viên'}</h4>
                      <p className="text-sm text-gray-600">{lesson.subject}</p>
                      {lesson.tutorRating && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600 mt-1">
                          ⭐ {(lesson.tutorRating / 10).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(lesson.status)}
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {lesson.status !== 'pending' && (
                    <>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(lesson.date).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.startTime} - {lesson.endTime}</span>
                      </div>
                    </>
                  )}

                  {lesson.status === 'pending' && (
                    <p className="text-yellow-600 text-sm">
                      ⏳ Đang chờ giáo viên xác nhận và chọn lịch học cụ thể
                    </p>
                  )}

                  {lesson.videoSession && lesson.status === 'confirmed' && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Video className="w-4 h-4" />
                      <span>Link học đã sẵn sàng</span>
                    </div>
                  )}

                  {lesson.notes && (
                    <p className="text-sm text-gray-500 italic mt-2">{lesson.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {lesson.status === 'confirmed' && lesson.meetingLink && (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handleJoinVideoCall(lesson.meetingLink!)}
                    >
                      <Video className="w-4 h-4" />
                      Vào học
                    </Button>
                  )}

                  {lesson.status === 'completed' && (
                    <Link href={`/tutor/${lesson.tutorId}?enroll=true`}>
                      <Button size="sm" variant="outline" className="gap-2">
                        Đăng ký học chính thức
                      </Button>
                    </Link>
                  )}

                  <Link href={`/student/lessons/${lesson.id}`}>
                    <Button size="sm" variant="ghost">
                      Chi tiết
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
