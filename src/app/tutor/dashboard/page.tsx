"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  FileCheck, 
  User, 
  Calendar, 
  BookOpen, 
  Video, 
  MessageSquare, 
  Award 
} from "lucide-react";
import Link from "next/link";

type FlowStep = {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'completed' | 'current' | 'pending';
  path: string;
};

export default function TutorDashboard() {
  // In production, this would come from API/database
  const [currentStep, setCurrentStep] = useState<number>(0);

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
            <CardTitle>Hành động nhanh</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/tutor/profile">
              <Button variant="outline" data-testid="button-view-profile">
                Xem hồ sơ của tôi
              </Button>
            </Link>
            <Link href="/tutor/recurring-schedule">
              <Button variant="outline" data-testid="button-create-recurring-schedule">
                Tạo lịch dạy lặp lại
              </Button>
            </Link>
            <Link href="/tutor/schedule">
              <Button variant="outline" data-testid="button-view-schedule">
                Xem lịch dạy
              </Button>
            </Link>
            <Link href="/tutor/earnings">
              <Button variant="outline" data-testid="button-view-earnings">
                Thu nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
