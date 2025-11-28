"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Search, Eye, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Tutor = {
  id: number;
  userId: number;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  subjects: string; // JSON string
  hourlyRate: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  approvalStatus: string;
  isActive: number;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
};

export default function AdminTutors() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState<{
    isOpen: boolean;
    tutorId: number | null;
    tutorName: string;
  }>({ isOpen: false, tutorId: null, tutorName: '' });
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check admin authentication
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    // TODO: Check if user role is admin
  }, [session, status, router]);

  // Fetch tutors
  useEffect(() => {
    async function fetchTutors() {
      try {
        const response = await fetch('/api/tutors');
        if (!response.ok) throw new Error('Failed to fetch tutors');
        const data = await response.json();
        setTutors(data);
      } catch (error) {
        console.error('Error fetching tutors:', error);
        toast({
          title: 'Lỗi',
          description: 'Không thể tải danh sách giáo viên',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchTutors();
    }
  }, [session, toast]);

  // Filter tutors by approval status
  const pendingTutors = tutors.filter(t => t.approvalStatus === 'pending');
  const approvedTutors = tutors.filter(t => t.approvalStatus === 'approved' && t.isActive === 1);
  const rejectedTutors = tutors.filter(t => t.approvalStatus === 'rejected');

  // Parse subjects JSON
  const parseSubjects = (subjectsJson: string): string[] => {
    try {
      const parsed = JSON.parse(subjectsJson);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => s.subject || s.name || String(s));
      }
      return [];
    } catch {
      return [];
    }
  };

  const handleApprove = async (tutorId: number, tutorName: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/tutors/${tutorId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve tutor');
      }

      toast({
        title: "Đã phê duyệt",
        description: `Giáo viên ${tutorName} đã được phê duyệt thành công.`,
      });

      // Refresh tutors list
      const refreshResponse = await fetch('/api/tutors');
      const refreshedData = await refreshResponse.json();
      setTutors(refreshedData);
    } catch (error) {
      console.error('Error approving tutor:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể phê duyệt giáo viên',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (tutorId: number, tutorName: string) => {
    setRejectDialog({
      isOpen: true,
      tutorId,
      tutorName,
    });
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog.tutorId) return;
    if (rejectionReason.length < 10) {
      toast({
        title: 'Lỗi',
        description: 'Lý do từ chối phải có ít nhất 10 ký tự',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/tutors/${rejectDialog.tutorId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject tutor');
      }

      toast({
        title: "Đã từ chối",
        description: `Đã từ chối hồ sơ giáo viên ${rejectDialog.tutorName}.`,
        variant: "destructive",
      });

      // Refresh tutors list
      const refreshResponse = await fetch('/api/tutors');
      const refreshedData = await refreshResponse.json();
      setTutors(refreshedData);

      // Close dialog
      setRejectDialog({ isOpen: false, tutorId: null, tutorName: '' });
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting tutor:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể từ chối giáo viên',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải danh sách giáo viên...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive" data-testid="text-admin-tutors-title">
            Quản lý Giáo viên
          </h1>
          <p className="text-muted-foreground">Xem và quản lý tất cả giáo viên trong hệ thống</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm giáo viên..."
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
              Đã xác minh ({approvedTutors.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected-tutors">
              Bị từ chối ({rejectedTutors.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Tutors */}
          <TabsContent value="pending" className="space-y-4">
            {pendingTutors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không có giáo viên nào đang chờ phê duyệt
                </CardContent>
              </Card>
            ) : (
              pendingTutors.map((tutor) => (
                <Card key={tutor.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={tutor.avatar || undefined} />
                          <AvatarFallback>{tutor.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg">{tutor.fullName}</h3>
                            <p className="text-sm text-muted-foreground">{tutor.phone || 'Chưa có SĐT'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {parseSubjects(tutor.subjects).map((subject, idx) => (
                              <Badge key={idx} variant="secondary">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Học phí:</span> {tutor.hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ</p>
                            <p className="text-muted-foreground">Đăng ký: {new Date(tutor.createdAt).toLocaleDateString('vi-VN')}</p>
                          </div>
                          {tutor.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{tutor.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full md:w-auto"
                          onClick={() => handleApprove(tutor.id, tutor.fullName)}
                          disabled={isProcessing}
                          data-testid={`button-approve-${tutor.id}`}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Phê duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full md:w-auto"
                          onClick={() => handleRejectClick(tutor.id, tutor.fullName)}
                          disabled={isProcessing}
                          data-testid={`button-reject-${tutor.id}`}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Active Tutors */}
          <TabsContent value="active" className="space-y-4">
            {approvedTutors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Chưa có giáo viên nào được phê duyệt
                </CardContent>
              </Card>
            ) : (
              approvedTutors.map((tutor) => (
                <Card key={tutor.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={tutor.avatar || undefined} />
                          <AvatarFallback>{tutor.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{tutor.fullName}</h3>
                              <Badge variant="default" className="bg-green-500">
                                Hoạt động
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{tutor.phone || 'Chưa có SĐT'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {parseSubjects(tutor.subjects).map((subject, idx) => (
                              <Badge key={idx} variant="secondary">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="font-medium">Rating:</span>{' '}
                              <span className="text-yellow-500">{(tutor.rating / 10).toFixed(1)}⭐</span>
                            </div>
                            <div>
                              <span className="font-medium">Học viên:</span> {tutor.totalStudents}
                            </div>
                            <div>
                              <span className="font-medium">Đánh giá:</span> {tutor.totalReviews}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rejected Tutors */}
          <TabsContent value="rejected" className="space-y-4">
            {rejectedTutors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Không có giáo viên nào bị từ chối
                </CardContent>
              </Card>
            ) : (
              rejectedTutors.map((tutor) => (
                <Card key={tutor.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={tutor.avatar || undefined} />
                          <AvatarFallback>{tutor.fullName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{tutor.fullName}</h3>
                              <Badge variant="destructive">Đã từ chối</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{tutor.phone || 'Chưa có SĐT'}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {parseSubjects(tutor.subjects).map((subject, idx) => (
                              <Badge key={idx} variant="secondary">
                                {subject}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium text-destructive">Lý do:</span> {tutor.rejectionReason || 'Không có lý do'}</p>
                            {tutor.approvedAt && (
                              <p className="text-muted-foreground">
                                Từ chối ngày: {new Date(tutor.approvedAt).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog.isOpen} onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ isOpen: false, tutorId: null, tutorName: '' });
            setRejectionReason('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Từ chối hồ sơ giáo viên</DialogTitle>
              <DialogDescription>
                Bạn đang từ chối hồ sơ của <strong>{rejectDialog.tutorName}</strong>.
                Vui lòng nhập lý do từ chối (tối thiểu 10 ký tự).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Lý do từ chối (ví dụ: Thiếu chứng chỉ giảng dạy, thông tin không rõ ràng...)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialog({ isOpen: false, tutorId: null, tutorName: '' });
                  setRejectionReason('');
                }}
                disabled={isProcessing}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={isProcessing || rejectionReason.length < 10}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận từ chối'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
