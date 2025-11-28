'use client';

/**
 * Dashboard tài chính của học viên
 * Hiển thị:
 * - Tổng quan: Tổng đã trả, credit khả dụng
 * - Danh sách lớp với buổi học và tiền
 * - Credit có thể sử dụng
 * - Lịch sử thanh toán
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Gift,
} from 'lucide-react';

interface FinancialData {
  summary: {
    totalPaid: number;
    totalRefunded: number;
    totalActiveCredit: number;
    totalClassesActive: number;
    totalClassesCompleted: number;
    totalClassesCancelled: number;
  };
  classes: Array<{
    enrollmentId: number;
    tutor: { id: number; name: string; avatar: string | null };
    subject: string;
    gradeLevel: string;
    totalSessions: number;
    completedSessions: number;
    pricePerSession: number;
    totalAmount: number;
    status: string;
    startDate: string | null;
    endDate: string | null;
    sessions: Array<{
      id: number;
      sessionNumber: number;
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      tutorAttended: boolean;
      studentAttended: boolean;
      completedAt: string | null;
    }>;
    financial: {
      amountPaid: number;
      amountForCompletedSessions: number;
      amountReleased: number;
      refundableAmount: number;
      commissionRate: number;
    };
    payment: {
      id: number;
      method: string;
      gateway: string;
      status: string;
      transactionCode: string | null;
      paidAt: string | null;
    } | null;
  }>;
  credits: Array<{
    id: number;
    sourceEnrollmentId: number;
    amount: number;
    usedAmount: number;
    remainingAmount: number;
    status: string;
    expiresAt: string | null;
    usedForEnrollmentId: number | null;
    reason: string | null;
    createdAt: string;
  }>;
  paymentHistory: Array<{
    id: number;
    enrollmentId: number;
    amount: number;
    method: string;
    gateway: string;
    status: string;
    transactionCode: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export default function StudentFinancialDashboard() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual user ID from auth context
      const response = await fetch('/api/student/dashboard/financial', {
        headers: {
          'x-user-id': '1', // Mock user ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      active: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      pending: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'active'
          ? 'Đang học'
          : status === 'completed'
          ? 'Hoàn thành'
          : status === 'cancelled'
          ? 'Đã hủy'
          : 'Chờ thanh toán'}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      completed: 'default',
      holding: 'default',
      pending: 'outline',
      failed: 'destructive',
      refunded: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status === 'completed' || status === 'holding'
          ? 'Thành công'
          : status === 'pending'
          ? 'Chờ xử lý'
          : status === 'failed'
          ? 'Thất bại'
          : status === 'refunded'
          ? 'Đã hoàn'
          : status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Lỗi</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Không thể tải dữ liệu'}</p>
            <Button onClick={fetchFinancialData} className="mt-4">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tài Chính Của Tôi</h1>
        <p className="text-muted-foreground">
          Quản lý thanh toán và theo dõi lớp học
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đã thanh toán</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tất cả các lớp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit khả dụng</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalActiveCredit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Dùng cho lớp mới
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lớp đang học</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalClassesActive}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.totalClassesCompleted} lớp đã hoàn thành
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đã hoàn tiền</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalRefunded)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Các lớp đã hủy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credits Alert */}
      {data.summary.totalActiveCredit > 0 && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Gift className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Bạn có <strong>{formatCurrency(data.summary.totalActiveCredit)}</strong> credit khả dụng.
            Sử dụng khi đăng ký lớp mới để giảm chi phí!
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Lớp học</TabsTrigger>
          <TabsTrigger value="credits">Credit ({data.credits.length})</TabsTrigger>
          <TabsTrigger value="payments">Lịch sử thanh toán</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {data.classes.map((classData) => (
            <Card key={classData.enrollmentId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={classData.tutor.avatar || undefined} />
                      <AvatarFallback>
                        {classData.tutor.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {classData.subject} - {classData.gradeLevel}
                      </CardTitle>
                      <CardDescription>
                        Giáo viên: {classData.tutor.name}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(classData.status)}
                </div>
              </CardHeader>
              <CardContent>
                {/* Class Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng buổi</p>
                    <p className="text-lg font-semibold">{classData.totalSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đã học</p>
                    <p className="text-lg font-semibold">{classData.completedSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(classData.financial.amountPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Có thể hoàn</p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(classData.financial.refundableAmount)}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Sessions List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold mb-2">Chi tiết buổi học</h4>
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Buổi</TableHead>
                          <TableHead>Ngày</TableHead>
                          <TableHead>Giờ</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead>Điểm danh</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classData.sessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell className="font-medium">
                              #{session.sessionNumber}
                            </TableCell>
                            <TableCell>{formatDate(session.date)}</TableCell>
                            <TableCell className="text-sm">
                              {session.startTime} - {session.endTime}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  session.status === 'completed'
                                    ? 'default'
                                    : 'outline'
                                }
                              >
                                {session.status === 'completed'
                                  ? 'Hoàn thành'
                                  : session.status === 'scheduled'
                                  ? 'Đã lên lịch'
                                  : session.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {session.tutorAttended && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                                {session.studentAttended && (
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                )}
                                {!session.tutorAttended && !session.studentAttended && (
                                  <span className="text-muted-foreground text-xs">Chưa điểm danh</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Payment Info */}
                {classData.payment && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Thanh toán</p>
                        <p className="font-semibold">
                          {classData.payment.gateway.toUpperCase()} -{' '}
                          {classData.payment.transactionCode || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(classData.payment.paidAt)}
                        </p>
                      </div>
                      {getPaymentStatusBadge(classData.payment.status)}
                    </div>
                  </>
                )}

                {/* Refund Info */}
                {classData.financial.refundableAmount > 0 && classData.status === 'active' && (
                  <>
                    <Separator className="my-4" />
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription>
                        Nếu bạn muốn hủy lớp, có thể hoàn lại{' '}
                        <strong>{formatCurrency(classData.financial.refundableAmount)}</strong>.
                        Liên hệ admin để được hỗ trợ.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {data.classes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chưa có lớp học nào
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          {data.credits.map((credit) => (
            <Card key={credit.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-lg">
                        {formatCurrency(credit.remainingAmount)}
                      </h3>
                      <Badge variant={credit.status === 'active' ? 'default' : 'secondary'}>
                        {credit.status === 'active' ? 'Khả dụng' : 'Đã dùng'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {credit.reason || 'Hoàn tiền từ lớp bị hủy'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tổng credit</p>
                        <p className="font-semibold">{formatCurrency(credit.amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Đã sử dụng</p>
                        <p className="font-semibold">{formatCurrency(credit.usedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ngày tạo</p>
                        <p className="font-semibold">{formatDate(credit.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Hết hạn</p>
                        <p className="font-semibold">
                          {credit.expiresAt ? formatDate(credit.expiresAt) : 'Không giới hạn'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {data.credits.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chưa có credit nào
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thanh toán</CardTitle>
              <CardDescription>Tất cả các giao dịch của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã GD</TableHead>
                    <TableHead>Cổng thanh toán</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.transactionCode || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.gateway.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(payment.paidAt || payment.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.paymentHistory.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Chưa có giao dịch nào
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
