"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  Calendar,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface PendingLesson {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  price: string;
  isTrial: number;
  status: string;
  createdAt: string;
  student: {
    id: number;
    fullName: string;
    avatar?: string;
    gradeLevel?: number;
  } | null;
  transaction: {
    id: number;
    amount: string;
    status: string;
    method?: string;
  } | null;
  hoursWaiting: number;
  isUrgent: boolean;
}

interface PendingLessonRequestsProps {
  tutorId: number;
}

export default function PendingLessonRequests({ tutorId }: PendingLessonRequestsProps) {
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<PendingLesson | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchPendingLessons();
  }, [tutorId]);

  const fetchPendingLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/tutors/${tutorId}/pending-lessons`);

      if (!response.ok) {
        throw new Error('Failed to fetch pending lessons');
      }

      const data = await response.json();
      setLessons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (lesson: PendingLesson) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/lessons/${lesson.id}/confirm`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm lesson');
      }

      // Refresh the list after successful confirmation
      await fetchPendingLessons();

      // Show success message (you might want to use a toast notification here)
      alert('Đã xác nhận lịch học thành công!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLesson) return;

    if (rejectionReason.trim().length < 10) {
      setError('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/lessons/${selectedLesson.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject lesson');
      }

      // Close dialog and reset state
      setShowRejectDialog(false);
      setSelectedLesson(null);
      setRejectionReason("");

      // Refresh the list
      await fetchPendingLessons();

      // Show success message
      alert('Đã từ chối lịch học và hoàn tiền cho học sinh');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectDialog = (lesson: PendingLesson) => {
    setSelectedLesson(lesson);
    setShowRejectDialog(true);
    setRejectionReason("");
    setError(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu đặt lịch đang chờ</CardTitle>
          <CardDescription>Các yêu cầu đặt lịch cần xác nhận</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && lessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu đặt lịch đang chờ</CardTitle>
          <CardDescription>Các yêu cầu đặt lịch cần xác nhận</CardDescription>
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Yêu cầu đặt lịch đang chờ</CardTitle>
              <CardDescription>
                {lessons.length === 0
                  ? "Không có yêu cầu đặt lịch nào đang chờ"
                  : `${lessons.length} yêu cầu cần xác nhận`}
              </CardDescription>
            </div>
            {lessons.length > 0 && (
              <Button variant="outline" size="sm" onClick={fetchPendingLessons}>
                Làm mới
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {lessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Không có yêu cầu đặt lịch nào đang chờ</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <Card key={lesson.id} className={lesson.isUrgent ? "border-orange-500" : ""}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {lesson.student?.fullName || 'Unknown Student'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lesson.student?.gradeLevel ? `Lớp ${lesson.student.gradeLevel}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {lesson.isTrial === 1 && (
                            <Badge variant="secondary">Học thử</Badge>
                          )}
                          {lesson.isUrgent && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Khẩn cấp
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Lesson Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(lesson.date).toLocaleDateString('vi-VN', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {lesson.startTime} - {lesson.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span>{lesson.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary">
                            {parseInt(lesson.price).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>

                      {/* Waiting Time Alert */}
                      {lesson.isUrgent && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Yêu cầu đã chờ {lesson.hoursWaiting} giờ. Sẽ tự động từ chối sau{' '}
                            {24 - lesson.hoursWaiting} giờ nữa.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button
                          className="flex-1"
                          onClick={() => handleConfirm(lesson)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Xác nhận
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => openRejectDialog(lesson)}
                          disabled={actionLoading}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu đặt lịch</DialogTitle>
            <DialogDescription>
              Vui lòng cho học sinh biết lý do bạn không thể nhận lịch này.
              {selectedLesson?.transaction && ' Học phí sẽ được hoàn lại cho học sinh.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Nhập lý do từ chối (ít nhất 10 ký tự)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedLesson(null);
                setRejectionReason("");
                setError(null);
              }}
              disabled={actionLoading}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || rejectionReason.trim().length < 10}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
