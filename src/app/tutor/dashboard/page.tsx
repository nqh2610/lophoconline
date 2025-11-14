"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Circle,
  FileCheck,
  User,
  Calendar,
  BookOpen,
  Video,
  MessageSquare,
  Award,
  Edit,
  AlertCircle,
  Clock,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { UpcomingVideoCallsCard } from "@/components/UpcomingVideoCallCard";
import { TutorTrialLessonsCard } from "@/components/TutorTrialLessonsCard";
import { useToast } from "@/hooks/use-toast";

type FlowStep = {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'completed' | 'current' | 'pending';
  path: string;
};

export default function TutorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [tutorData, setTutorData] = useState<{
    approvalStatus: string;
    rejectionReason: string | null;
  } | null>(null);
  const [isLoadingTutor, setIsLoadingTutor] = useState(true);

  // Fetch tutor data
  useEffect(() => {
    async function fetchTutorData() {
      if (status === 'loading') return;
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/tutors?userId=${session.user.id}`);
        if (response.ok) {
          const tutors = await response.json();
          if (tutors && tutors.length > 0) {
            setTutorData({
              approvalStatus: tutors[0].approvalStatus || 'pending',
              rejectionReason: tutors[0].rejectionReason || null,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching tutor data:', error);
      } finally {
        setIsLoadingTutor(false);
      }
    }

    fetchTutorData();
  }, [session, status]);

  const steps: FlowStep[] = [
    {
      id: 'registration',
      title: 'Đăng ký',
      description: 'Hoàn thành đăng ký thông tin cơ bản',
      icon: User,
      status: 'completed',
      path: '/tutor-registration'
    },
    {
      id: 'verification',
      title: 'Xác minh',
      description: 'Xác minh danh tính qua OCR và video',
      icon: FileCheck,
      status: 'current',
      path: '/tutor/verification'
    },
    {
      id: 'profile',
      title: 'Tạo hồ sơ',
      description: 'Tạo hồ sơ chi tiết và video giới thiệu',
      icon: User,
      status: 'pending',
      path: '/tutor/profile-setup'
    },
    {
      id: 'schedule',
      title: 'Thiết lập lịch',
      description: 'Thiết lập lịch rảnh để dạy học',
      icon: Calendar,
      status: 'pending',
      path: '/tutor/schedule-setup'
    },
    {
      id: 'trial',
      title: 'Nhận yêu cầu',
      description: 'Nhận và chấp nhận yêu cầu học thử',
      icon: BookOpen,
      status: 'pending',
      path: '/tutor/trial-requests'
    },
    {
      id: 'teaching',
      title: 'Dạy online',
      description: 'Bắt đầu dạy học trực tuyến',
      icon: Video,
      status: 'pending',
      path: '/tutor/teaching'
    },
    {
      id: 'feedback',
      title: 'Nhận phản hồi',
      description: 'Xem đánh giá từ học sinh',
      icon: MessageSquare,
      status: 'pending',
      path: '/tutor/feedback'
    },
    {
      id: 'reputation',
      title: 'Tích lũy uy tín',
      description: 'Xem thống kê và thành tích',
      icon: Award,
      status: 'pending',
      path: '/tutor/reputation'
    }
  ];

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="heading-tutor-dashboard">
            Bảng điều khiển gia sư
          </h1>
          <p className="text-muted-foreground mt-2">
            Theo dõi tiến trình và quản lý hoạt động của bạn
          </p>
        </div>

        {/* Approval Status Alert */}
        {!isLoadingTutor && tutorData && (
          <>
            {tutorData.approvalStatus === 'pending' && (
              <Alert className="mb-6 border-yellow-500 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Đang chờ phê duyệt:</strong> Hồ sơ của bạn đang được admin xem xét. 
                  Bạn vẫn có thể{' '}
                  <Link href="/tutor/edit-profile" className="underline font-medium">
                    chỉnh sửa hồ sơ
                  </Link>{' '}
                  trong lúc chờ.
                </AlertDescription>
              </Alert>
            )}
            {tutorData.approvalStatus === 'rejected' && (
              <Alert className="mb-6 border-red-500 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Hồ sơ không được phê duyệt:</strong>{' '}
                  {tutorData.rejectionReason || 'Không có lý do cụ thể.'}{' '}
                  Vui lòng{' '}
                  <Link href="/tutor/edit-profile" className="underline font-medium">
                    chỉnh sửa hồ sơ
                  </Link>{' '}
                  và gửi lại.
                </AlertDescription>
              </Alert>
            )}
            {tutorData.approvalStatus === 'approved' && (
              <Alert className="mb-6 border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Hồ sơ đã được phê duyệt!</strong> Bạn có thể bắt đầu nhận yêu cầu từ học sinh.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Trial Lessons Section */}
        <div className="mb-8">
          <TutorTrialLessonsCard />
        </div>

        {/* Video Calls Section */}
        <div className="mb-8">
          <UpcomingVideoCallsCard />
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tiến trình hoàn thành</CardTitle>
            <CardDescription>
              Bạn đã hoàn thành {completedSteps} / {steps.length} bước
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" data-testid="progress-completion" />
            <p className="text-sm text-muted-foreground mt-2">
              {progressPercentage.toFixed(0)}% hoàn thành
            </p>
          </CardContent>
        </Card>

        {/* Flow Steps */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isPending = step.status === 'pending';

            return (
              <Card 
                key={step.id}
                className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                data-testid={`card-step-${step.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCompleted ? 'bg-primary/10 text-primary' :
                        isCurrent ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {step.title}
                        </CardTitle>
                      </div>
                    </div>
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-primary" data-testid={`icon-completed-${step.id}`} />
                    )}
                    {isCurrent && (
                      <Badge variant="default" data-testid={`badge-current-${step.id}`}>Hiện tại</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {step.description}
                  </p>
                  <Link href={step.path}>
                    <Button 
                      variant={isCurrent ? "default" : "outline"}
                      className="w-full"
                      disabled={isPending && !isCurrent}
                      data-testid={`button-step-${step.id}`}
                    >
                      {isCompleted ? 'Xem lại' : isCurrent ? 'Tiếp tục' : 'Chờ hoàn thành bước trước'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Chức năng gia sư</CardTitle>
            <CardDescription>Tất cả các tính năng quản lý dành cho gia sư</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <Link href="/tutor/edit-profile">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4 border-primary" data-testid="button-edit-profile">
                  <Edit className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium">Chỉnh sửa hồ sơ</span>
                </Button>
              </Link>
              <Link href="/tutor/verification">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-verification">
                  <FileCheck className="h-6 w-6" />
                  <span className="text-xs">Xác minh</span>
                </Button>
              </Link>
              <Link href="/tutor/availability">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-availability">
                  <Calendar className="h-6 w-6" />
                  <span className="text-xs">Lịch rảnh</span>
                </Button>
              </Link>
              <Link href="/tutor/recurring-schedule">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-recurring-schedule">
                  <Calendar className="h-6 w-6" />
                  <span className="text-xs">Lịch lặp lại</span>
                </Button>
              </Link>
              <Link href="/tutor/pending-lessons">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-pending-lessons">
                  <BookOpen className="h-6 w-6" />
                  <span className="text-xs">Yêu cầu chờ</span>
                </Button>
              </Link>
              <Link href="/tutor/teaching">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-teaching">
                  <Video className="h-6 w-6" />
                  <span className="text-xs">Dạy học</span>
                </Button>
              </Link>
              <Link href="/tutor/feedback">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-feedback">
                  <MessageSquare className="h-6 w-6" />
                  <span className="text-xs">Phản hồi</span>
                </Button>
              </Link>
              <Link href="/tutor/reputation">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-reputation">
                  <Award className="h-6 w-6" />
                  <span className="text-xs">Uy tín</span>
                </Button>
              </Link>
              <Link href="/tutor/financial">
                <Button variant="outline" className="w-full h-auto flex flex-col gap-2 py-4" data-testid="button-financial">
                  <Circle className="h-6 w-6" />
                  <span className="text-xs">Tài chính</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
