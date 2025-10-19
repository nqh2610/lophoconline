"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Calendar, Clock, User, ArrowLeft, CheckCircle, X } from "lucide-react";
import Link from "next/link";

type TrialRequest = {
  id: string;
  studentName: string;
  studentAvatar?: string;
  subject: string;
  grade: string;
  preferredTime: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
};

const mockRequests: TrialRequest[] = [
  {
    id: '1',
    studentName: 'Nguyễn Văn A',
    subject: 'Toán',
    grade: 'Lớp 12',
    preferredTime: 'Thứ 2, 18:00 - 19:00',
    message: 'Em cần học ôn tập Toán để thi đại học. Em yếu phần đạo hàm và tích phân.',
    status: 'pending'
  },
  {
    id: '2',
    studentName: 'Trần Thị B',
    subject: 'Tiếng Anh',
    grade: 'IELTS',
    preferredTime: 'Thứ 4, 19:00 - 20:00',
    message: 'Em muốn học IELTS Speaking để đạt 7.0. Hiện tại em đang ở band 5.5.',
    status: 'pending'
  },
];

export default function TutorTrialRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TrialRequest[]>(mockRequests);

  const handleAccept = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'accepted' } : req
    ));
    toast({
      title: "Đã chấp nhận!",
      description: "Yêu cầu học thử đã được chấp nhận. Học sinh sẽ nhận được thông báo.",
    });
  };

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: 'rejected' } : req
    ));
    toast({
      title: "Đã từ chối",
      description: "Yêu cầu đã được từ chối.",
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-trial-requests">
            Yêu cầu học thử
          </h1>
          <p className="text-muted-foreground mt-2">
            Xem và phản hồi yêu cầu học thử từ học sinh
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Yêu cầu đang chờ</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{requests.filter(r => r.status === 'accepted').length}</p>
                <p className="text-sm text-muted-foreground mt-1">Đã chấp nhận</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
                <p className="text-sm text-muted-foreground mt-1">Đã từ chối</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có yêu cầu học thử nào</p>
              </CardContent>
            </Card>
          ) : (
            requests.map(request => (
              <Card key={request.id} data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.studentAvatar} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{request.studentName}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{request.subject}</Badge>
                          <Badge variant="outline">{request.grade}</Badge>
                        </CardDescription>
                      </div>
                    </div>
                    {request.status === 'pending' && (
                      <Badge variant="secondary" data-testid={`badge-status-${request.id}`}>
                        Đang chờ
                      </Badge>
                    )}
                    {request.status === 'accepted' && (
                      <Badge variant="default" className="bg-green-500" data-testid={`badge-status-${request.id}`}>
                        Đã chấp nhận
                      </Badge>
                    )}
                    {request.status === 'rejected' && (
                      <Badge variant="secondary" data-testid={`badge-status-${request.id}`}>
                        Đã từ chối
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{request.preferredTime}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{request.message}</p>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAccept(request.id)}
                        className="flex-1"
                        data-testid={`button-accept-${request.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Chấp nhận
                      </Button>
                      <Button
                        onClick={() => handleReject(request.id)}
                        variant="outline"
                        className="flex-1"
                        data-testid={`button-reject-${request.id}`}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                    </div>
                  )}

                  {request.status === 'accepted' && (
                    <Link href="/tutor/teaching">
                      <Button className="w-full" data-testid={`button-start-teaching-${request.id}`}>
                        Bắt đầu dạy
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
