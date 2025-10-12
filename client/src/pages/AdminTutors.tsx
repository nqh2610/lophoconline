import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, Eye, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminTutors() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const pendingTutors = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor1',
      email: 'nguyenvana@email.com',
      phone: '0912345678',
      subjects: ['Toán', 'Vật Lý'],
      education: 'Thạc sĩ - ĐH Bách Khoa',
      experience: '5 năm',
      registeredDate: '12/10/2025',
    },
    {
      id: 2,
      name: 'Trần Thị B',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor2',
      email: 'tranthib@email.com',
      phone: '0987654321',
      subjects: ['Tiếng Anh', 'IELTS'],
      education: 'Cử nhân - ĐH Ngoại Ngữ',
      experience: '3 năm',
      registeredDate: '12/10/2025',
    },
    {
      id: 3,
      name: 'Lê Văn C',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor3',
      email: 'levanc@email.com',
      phone: '0901234567',
      subjects: ['Hóa học', 'Sinh học'],
      education: 'Tiến sĩ - ĐH Y Dược',
      experience: '8 năm',
      registeredDate: '11/10/2025',
    },
  ];

  const activeTutors = [
    {
      id: 4,
      name: 'Phạm Văn D',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor4',
      email: 'phamvand@email.com',
      subjects: ['Toán', 'Hóa học'],
      rating: 4.8,
      students: 45,
      lessons: 128,
      status: 'active',
    },
    {
      id: 5,
      name: 'Hoàng Thị E',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor5',
      email: 'hoangthie@email.com',
      subjects: ['Tiếng Anh', 'TOEFL'],
      rating: 4.9,
      students: 67,
      lessons: 203,
      status: 'active',
    },
  ];

  const blockedTutors = [
    {
      id: 6,
      name: 'Võ Văn F',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tutor6',
      email: 'vovanf@email.com',
      subjects: ['Vật Lý'],
      reason: 'Vi phạm quy định',
      blockedDate: '05/10/2025',
    },
  ];

  const handleApprove = (tutorId: number, tutorName: string) => {
    toast({
      title: "Đã phê duyệt",
      description: `Gia sư ${tutorName} đã được phê duyệt thành công.`,
    });
  };

  const handleReject = (tutorId: number, tutorName: string) => {
    toast({
      title: "Đã từ chối",
      description: `Đã từ chối hồ sơ gia sư ${tutorName}.`,
      variant: "destructive",
    });
  };

  const handleBlock = (tutorId: number, tutorName: string) => {
    toast({
      title: "Đã khóa tài khoản",
      description: `Tài khoản gia sư ${tutorName} đã bị khóa.`,
      variant: "destructive",
    });
  };

  const handleUnblock = (tutorId: number, tutorName: string) => {
    toast({
      title: "Đã mở khóa",
      description: `Tài khoản gia sư ${tutorName} đã được mở khóa.`,
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive" data-testid="text-admin-tutors-title">
            Quản lý Gia sư
          </h1>
          <p className="text-muted-foreground">Xem và quản lý tất cả gia sư trong hệ thống</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm gia sư..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-tutors"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending-tutors">
              Chờ phê duyệt ({pendingTutors.length})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active-tutors">
              Đã xác minh ({activeTutors.length})
            </TabsTrigger>
            <TabsTrigger value="blocked" data-testid="tab-blocked-tutors">
              Bị khóa ({blockedTutors.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tutors */}
          <TabsContent value="pending" className="space-y-4">
            {pendingTutors.map((tutor) => (
              <Card key={tutor.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={tutor.avatar} />
                        <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg">{tutor.name}</h3>
                          <p className="text-sm text-muted-foreground">{tutor.email}</p>
                          <p className="text-sm text-muted-foreground">{tutor.phone}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.map((subject) => (
                            <Badge key={subject} variant="secondary">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Học vấn:</span> {tutor.education}</p>
                          <p><span className="font-medium">Kinh nghiệm:</span> {tutor.experience}</p>
                          <p className="text-muted-foreground">Đăng ký: {tutor.registeredDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full md:w-auto"
                        data-testid={`button-view-${tutor.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full md:w-auto"
                        onClick={() => handleApprove(tutor.id, tutor.name)}
                        data-testid={`button-approve-${tutor.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Phê duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full md:w-auto"
                        onClick={() => handleReject(tutor.id, tutor.name)}
                        data-testid={`button-reject-${tutor.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Active Tutors */}
          <TabsContent value="active" className="space-y-4">
            {activeTutors.map((tutor) => (
              <Card key={tutor.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={tutor.avatar} />
                        <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{tutor.name}</h3>
                            <Badge variant="default" className="bg-green-500">
                              Hoạt động
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tutor.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.map((subject) => (
                            <Badge key={subject} variant="secondary">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div>
                            <span className="font-medium">Rating:</span>{' '}
                            <span className="text-yellow-500">{tutor.rating}⭐</span>
                          </div>
                          <div>
                            <span className="font-medium">Học viên:</span> {tutor.students}
                          </div>
                          <div>
                            <span className="font-medium">Buổi học:</span> {tutor.lessons}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full md:w-auto"
                        data-testid={`button-view-active-${tutor.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full md:w-auto"
                        onClick={() => handleBlock(tutor.id, tutor.name)}
                        data-testid={`button-block-${tutor.id}`}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Khóa tài khoản
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Blocked Tutors */}
          <TabsContent value="blocked" className="space-y-4">
            {blockedTutors.map((tutor) => (
              <Card key={tutor.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={tutor.avatar} />
                        <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{tutor.name}</h3>
                            <Badge variant="destructive">Đã khóa</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tutor.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tutor.subjects.map((subject) => (
                            <Badge key={subject} variant="secondary">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium text-destructive">Lý do:</span> {tutor.reason}</p>
                          <p className="text-muted-foreground">Khóa ngày: {tutor.blockedDate}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full md:w-auto"
                        data-testid={`button-view-blocked-${tutor.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full md:w-auto"
                        onClick={() => handleUnblock(tutor.id, tutor.name)}
                        data-testid={`button-unblock-${tutor.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mở khóa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
