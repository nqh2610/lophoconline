"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminStudents() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const students = [
    {
      id: 1,
      name: 'Nguyễn Văn An',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
      email: 'nguyenvanan@email.com',
      phone: '0912345678',
      joinedDate: '01/09/2025',
      totalLessons: 24,
      totalSpent: 3600000,
      status: 'active',
    },
    {
      id: 2,
      name: 'Trần Thị Bình',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2',
      email: 'tranthibinh@email.com',
      phone: '0987654321',
      joinedDate: '15/09/2025',
      totalLessons: 18,
      totalSpent: 2700000,
      status: 'active',
    },
    {
      id: 3,
      name: 'Lê Văn Cường',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student3',
      email: 'levancuong@email.com',
      phone: '0901234567',
      joinedDate: '10/08/2025',
      totalLessons: 35,
      totalSpent: 5250000,
      status: 'active',
    },
    {
      id: 4,
      name: 'Phạm Thị Dung',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student4',
      email: 'phamthidung@email.com',
      phone: '0923456789',
      joinedDate: '20/09/2025',
      totalLessons: 12,
      totalSpent: 1800000,
      status: 'active',
    },
    {
      id: 5,
      name: 'Hoàng Văn Em',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student5',
      email: 'hoangvanem@email.com',
      phone: '0934567890',
      joinedDate: '05/10/2025',
      totalLessons: 8,
      totalSpent: 1200000,
      status: 'active',
    },
  ];

  const handleBlock = (studentId: number, studentName: string) => {
    toast({
      title: "Đã khóa tài khoản",
      description: `Tài khoản học viên ${studentName} đã bị khóa.`,
      variant: "destructive",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive" data-testid="text-admin-students-title">
            Quản lý Học viên
          </h1>
          <p className="text-muted-foreground">Xem và quản lý tất cả học viên trong hệ thống</p>
        </div>

        {/* Search & Stats */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm học viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-students"
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm">
              Tổng: {students.length} học viên
            </Badge>
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-4">
          {students.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback>{student.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          <Badge variant="default" className="bg-green-500">
                            {student.status === 'active' ? 'Hoạt động' : 'Khóa'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-sm text-muted-foreground">{student.phone}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="font-medium">Tham gia:</span>{' '}
                          <span className="text-muted-foreground">{student.joinedDate}</span>
                        </div>
                        <div>
                          <span className="font-medium">Buổi học:</span>{' '}
                          <span className="text-chart-2">{student.totalLessons}</span>
                        </div>
                        <div>
                          <span className="font-medium">Chi tiêu:</span>{' '}
                          <span className="text-chart-1">{formatCurrency(student.totalSpent)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full md:w-auto"
                      data-testid={`button-view-student-${student.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem chi tiết
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full md:w-auto"
                      onClick={() => handleBlock(student.id, student.name)}
                      data-testid={`button-block-student-${student.id}`}
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Khóa tài khoản
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
