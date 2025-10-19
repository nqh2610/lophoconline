"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Mic, MicOff, VideoOff, Phone, MessageSquare, Users, ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

type Lesson = {
  id: string;
  studentName: string;
  subject: string;
  startTime: string;
  duration: number;
  status: 'upcoming' | 'ongoing' | 'completed';
};

const mockLessons: Lesson[] = [
  {
    id: '1',
    studentName: 'Nguyễn Văn A',
    subject: 'Toán - Đạo hàm',
    startTime: '18:00',
    duration: 60,
    status: 'ongoing'
  },
  {
    id: '2',
    studentName: 'Trần Thị B',
    subject: 'IELTS Speaking',
    startTime: '19:30',
    duration: 60,
    status: 'upcoming'
  },
];

export default function TutorTeaching() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [lessons] = useState<Lesson[]>(mockLessons);

  const ongoingLesson = lessons.find(l => l.status === 'ongoing');
  const upcomingLessons = lessons.filter(l => l.status === 'upcoming');

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-teaching">
            Dạy học trực tuyến
          </h1>
          <p className="text-muted-foreground mt-2">
            Quản lý và tham gia buổi dạy online
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-6">
            {ongoingLesson ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Đang dạy: {ongoingLesson.subject}</CardTitle>
                      <CardDescription>Học sinh: {ongoingLesson.studentName}</CardDescription>
                    </div>
                    <Badge variant="default" className="bg-red-500">
                      <span className="animate-pulse">● </span>
                      Đang live
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video Display */}
                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative">
                    <div className="text-white text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-75">Video call đang hoạt động</p>
                      <p className="text-xs opacity-50 mt-2">Tích hợp Jitsi Meet hoặc Zoom</p>
                    </div>
                    
                    {/* Video Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                      <Button
                        size="icon"
                        variant={isMuted ? "destructive" : "secondary"}
                        className="rounded-full"
                        onClick={() => setIsMuted(!isMuted)}
                        data-testid="button-toggle-mic"
                      >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant={isVideoOff ? "destructive" : "secondary"}
                        className="rounded-full"
                        onClick={() => setIsVideoOff(!isVideoOff)}
                        data-testid="button-toggle-video"
                      >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="rounded-full"
                        data-testid="button-end-call"
                      >
                        <Phone className="h-5 w-5 rotate-135" />
                      </Button>
                    </div>
                  </div>

                  {/* Lesson Info */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{ongoingLesson.studentName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{ongoingLesson.studentName}</p>
                        <p className="text-sm text-muted-foreground">{ongoingLesson.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{ongoingLesson.duration} phút</p>
                      <p className="text-xs text-muted-foreground">Bắt đầu: {ongoingLesson.startTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Không có buổi học nào đang diễn ra</p>
                  <p className="text-sm text-muted-foreground">
                    Các buổi học sắp tới sẽ hiển thị bên phải
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Teaching Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Công cụ giảng dạy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="whiteboard">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="whiteboard">Bảng trắng</TabsTrigger>
                    <TabsTrigger value="materials">Tài liệu</TabsTrigger>
                    <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                  </TabsList>
                  <TabsContent value="whiteboard" className="py-4">
                    <div className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Bảng trắng tương tác</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="materials" className="py-4">
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Bài tập về nhà.pdf
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Lý thuyết đạo hàm.pdf
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="notes" className="py-4">
                    <textarea 
                      className="w-full h-32 p-3 border rounded-lg resize-none"
                      placeholder="Ghi chú về buổi học..."
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Lessons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Buổi học sắp tới
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingLessons.length > 0 ? (
                  upcomingLessons.map(lesson => (
                    <div key={lesson.id} className="p-3 border rounded-lg" data-testid={`upcoming-lesson-${lesson.id}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{lesson.studentName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{lesson.studentName}</p>
                          <p className="text-xs text-muted-foreground">{lesson.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lesson.startTime}</span>
                        <span>{lesson.duration} phút</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Không có buổi học sắp tới
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Tin nhắn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 border rounded-lg p-3 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Chức năng chat</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
