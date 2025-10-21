"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PendingLesson {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  totalPrice: number;
  createdAt: string;
  hoursWaiting: number;
  isUrgent: boolean;
  student: {
    id: number;
    fullName: string;
    avatar: string | null;
    gradeLevel: number;
  } | null;
  transaction: {
    id: number;
    amount: number;
    status: string;
    method: string;
  } | null;
}

export default function PendingLessonsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [pendingLessons, setPendingLessons] = useState<PendingLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<PendingLesson | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchPendingLessons();
    }
  }, [session]);

  const fetchPendingLessons = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get tutor profile first
      const tutorResponse = await fetch('/api/tutors/me');
      if (!tutorResponse.ok) {
        throw new Error('Failed to fetch tutor profile');
      }
      const tutorData = await tutorResponse.json();

      // Fetch pending lessons
      const response = await fetch(`/api/tutors/${tutorData.id}/pending-lessons`);
      if (!response.ok) {
        throw new Error('Failed to fetch pending lessons');
      }

      const data = await response.json();
      setPendingLessons(data);
    } catch (err) {
      console.error('Error fetching pending lessons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pending lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedLesson) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/lessons/${selectedLesson.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm lesson');
      }

      // Refresh list and close dialog
      await fetchPendingLessons();
      setSelectedLesson(null);
      setActionType(null);
    } catch (err) {
      console.error('Error confirming lesson:', err);
      alert(err instanceof Error ? err.message : 'Failed to confirm lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLesson || rejectionReason.trim().length < 10) {
      alert('Vui lòng nhập lý do từ chối (tối thiểu 10 ký tự)');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/lessons/${selectedLesson.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject lesson');
      }

      // Refresh list and close dialog
      await fetchPendingLessons();
      setSelectedLesson(null);
      setActionType(null);
      setRejectionReason("");
    } catch (err) {
      console.error('Error rejecting lesson:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfirmDialog = (lesson: PendingLesson) => {
    setSelectedLesson(lesson);
    setActionType('confirm');
  };

  const openRejectDialog = (lesson: PendingLesson) => {
    setSelectedLesson(lesson);
    setActionType('reject');
    setRejectionReason("");
  };

  const closeDialog = () => {
    if (!isSubmitting) {
      setSelectedLesson(null);
      setActionType(null);
      setRejectionReason("");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
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
          <h1 className="text-3xl font-bold">Yêu cầu dạy học chờ xác nhận</h1>
          <p className="text-muted-foreground mt-2">
            Xác nhận hoặc từ chối các yêu cầu đặt lịch từ học sinh
          </p>
        </div>

        {/* Auto-reject warning */}
        {pendingLessons.some(l => l.isUrgent) && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cảnh báo</AlertTitle>
            <AlertDescription>
              Một số yêu cầu sắp bị tự động từ chối sau 24 giờ không phản hồi.
              Vui lòng xử lý ngay!
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {pendingLessons.length === 0 && !error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Không có yêu cầu chờ xử lý</h3>
              <p className="text-muted-foreground text-center">
                Bạn đã xử lý tất cả yêu cầu đặt lịch. Hãy quay lại sau để kiểm tra yêu cầu mới!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending Lessons List */}
        <div className="grid gap-4">
          {pendingLessons.map((lesson) => (
            <Card key={lesson.id} className={lesson.isUrgent ? 'border-destructive' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={lesson.student?.avatar || undefined} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {lesson.student?.fullName || 'Học sinh'}
                      </CardTitle>
                      <CardDescription>
                        {lesson.type === 'trial' ? 'Buổi học thử' : 'Buổi học chính thức'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {lesson.isUrgent && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Khẩn cấp
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      Đợi {lesson.hoursWaiting}h
                    </Badge>
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

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Học phí</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(lesson.totalPrice)}
                    </p>
                    {lesson.transaction && (
                      <Badge variant="outline" className="mt-1">
                        {lesson.transaction.status === 'completed' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openRejectDialog(lesson)}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Từ chối
                    </Button>
                    <Button
                      onClick={() => openConfirmDialog(lesson)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Chấp nhận
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confirm Dialog */}
        <Dialog open={actionType === 'confirm'} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận lịch dạy</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn chấp nhận lịch dạy này?
              </DialogDescription>
            </DialogHeader>
            {selectedLesson && (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Học sinh:</span>
                  <span>{selectedLesson.student?.fullName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Ngày:</span>
                  <span>{formatDate(selectedLesson.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Giờ:</span>
                  <span>{selectedLesson.startTime} - {selectedLesson.endTime}</span>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sau khi xác nhận, bạn cam kết sẽ tham gia dạy học đúng giờ.
                    Việc hủy sau khi xác nhận sẽ ảnh hưởng đến uy tín của bạn.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận dạy học
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={actionType === 'reject'} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Từ chối lịch dạy</DialogTitle>
              <DialogDescription>
                Vui lòng cho biết lý do từ chối để học sinh hiểu rõ hơn
              </DialogDescription>
            </DialogHeader>
            {selectedLesson && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lý do từ chối *</label>
                  <Textarea
                    placeholder="Ví dụ: Tôi đã có lịch khác vào giờ này, không thể sắp xếp được..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className={rejectionReason.trim().length < 10 && rejectionReason.length > 0 ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tối thiểu 10 ký tự ({rejectionReason.trim().length}/10)
                  </p>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Học sinh sẽ được hoàn tiền nếu đã thanh toán.
                    Việc từ chối nhiều yêu cầu có thể ảnh hưởng đến xếp hạng của bạn.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting || rejectionReason.trim().length < 10}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Từ chối lịch dạy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
