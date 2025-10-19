'use client';

/**
 * Admin Dashboard - Quản lý tài chính
 * Hiển thị:
 * - Tổng quan hệ thống (doanh thu, hoa hồng, pending)
 * - Danh sách tất cả enrollments với chi tiết
 * - Các lớp đủ điều kiện thanh toán
 * - Yêu cầu rút tiền đang chờ
 * - Các thao tác: duyệt thanh toán, hoàn trả
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  Wallet,
} from 'lucide-react';

interface DashboardData {
  summary: {
    totalEnrollments: number;
    totalRevenue: number;
    totalPlatformFee: number;
    totalPaidToTutors: number;
    totalPendingRelease: number;
    enrollmentsEligibleForPayout: number;
    pendingPayoutRequests: number;
  };
  platformWallet: {
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
  } | null;
  enrollments: Array<any>;
  pendingPayouts: Array<any>;
}

export default function AdminFinancialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundType, setRefundType] = useState<'credit' | 'direct'>('credit');
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/overview', {
        headers: {
          'x-user-id': '1', // Mock admin ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (enrollmentId: number) => {
    if (!confirm('Xác nhận duyệt thanh toán cho lớp này?')) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/enrollments/${enrollmentId}/process-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          releaseToAvailable: false, // Tiền vào pending, chờ 30 ngày
          adminNote: 'Admin approved payout',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process payout');
      }

      alert('Đã duyệt thanh toán thành công!');
      fetchDashboardData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedEnrollment) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/refund/${selectedEnrollment.enrollmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          refundType,
          reason: refundReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      alert('Đã hoàn tiền thành công!');
      setRefundDialogOpen(false);
      setSelectedEnrollment(null);
      setRefundReason('');
      fetchDashboardData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprovePayoutRequest = async (payoutRequestId: number) => {
    if (!confirm('Xác nhận đã chuyển tiền cho gia sư?')) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/admin/payout-requests/${payoutRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '1',
        },
        body: JSON.stringify({
          adminNote: 'Approved by admin',
          transactionProof: 'https://example.com/proof.jpg',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve payout request');
      }

      alert('Đã duyệt yêu cầu rút tiền!');
      fetchDashboardData();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setProcessing(false);
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

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      active: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
      pending: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
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
            <Button onClick={fetchDashboardData} className="mt-4">
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
        <h1 className="text-3xl font-bold mb-2">Admin - Quản Lý Tài Chính</h1>
        <p className="text-muted-foreground">
          Tổng quan hệ thống và duyệt thanh toán
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.summary.totalEnrollments} lớp học
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoa hồng nền tảng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalPlatformFee)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đã thu được
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang giữ escrow</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(data.summary.totalPendingRelease)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chờ admin duyệt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cần xử lý</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data.summary.enrollmentsEligibleForPayout}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lớp đủ điều kiện thanh toán
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Wallet */}
      {data.platformWallet && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Ví Nền Tảng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Số dư khả dụng</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(data.platformWallet.availableBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang chờ</p>
                <p className="text-xl font-bold text-yellow-600">
                  {formatCurrency(data.platformWallet.pendingBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng thu nhập</p>
                <p className="text-xl font-bold">
                  {formatCurrency(data.platformWallet.totalEarned)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Actions Alert */}
      {(data.summary.enrollmentsEligibleForPayout > 0 || data.summary.pendingPayoutRequests > 0) && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            Có <strong>{data.summary.enrollmentsEligibleForPayout}</strong> lớp đủ điều kiện thanh toán và{' '}
            <strong>{data.summary.pendingPayoutRequests}</strong> yêu cầu rút tiền đang chờ duyệt.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="enrollments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="enrollments">Tất cả lớp học ({data.enrollments.length})</TabsTrigger>
          <TabsTrigger value="eligible">
            Đủ điều kiện thanh toán ({data.summary.enrollmentsEligibleForPayout})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Yêu cầu rút tiền ({data.pendingPayouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách lớp học</CardTitle>
              <CardDescription>Tất cả các lớp trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Học viên</TableHead>
                      <TableHead>Gia sư</TableHead>
                      <TableHead>Môn học</TableHead>
                      <TableHead>Buổi</TableHead>
                      <TableHead className="text-right">Đã trả</TableHead>
                      <TableHead className="text-right">Chờ duyệt</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.enrollments.map((enrollment) => (
                      <TableRow key={enrollment.enrollmentId}>
                        <TableCell className="font-medium">
                          #{enrollment.enrollmentId}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={enrollment.student.avatar || undefined} />
                              <AvatarFallback>
                                {enrollment.student.name?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{enrollment.student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={enrollment.tutor.avatar || undefined} />
                              <AvatarFallback>
                                {enrollment.tutor.name?.charAt(0) || 'T'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{enrollment.tutor.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {enrollment.subject}
                          <br />
                          <span className="text-muted-foreground text-xs">
                            {enrollment.gradeLevel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {enrollment.completedSessions}/{enrollment.totalSessions}
                            <br />
                            <span className="text-muted-foreground text-xs">
                              {enrollment.sessionsCount.paid} đã thanh toán
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-green-600">
                          {formatCurrency(enrollment.financial.totalPaidToTutor)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-yellow-600">
                          {formatCurrency(enrollment.financial.totalPendingRelease)}
                        </TableCell>
                        <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {enrollment.eligibleForPayout && (
                              <Button
                                size="sm"
                                onClick={() => handleProcessPayout(enrollment.enrollmentId)}
                                disabled={processing}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Duyệt
                              </Button>
                            )}
                            {enrollment.status === 'active' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setRefundDialogOpen(true);
                                }}
                                disabled={processing}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Hoàn tiền
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eligible">
          <Card>
            <CardHeader>
              <CardTitle>Lớp đủ điều kiện thanh toán</CardTitle>
              <CardDescription>Các lớp cần admin duyệt thanh toán</CardDescription>
            </CardHeader>
            <CardContent>
              {data.enrollments.filter((e) => e.eligibleForPayout).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Không có lớp nào đủ điều kiện
                </div>
              ) : (
                <div className="space-y-4">
                  {data.enrollments
                    .filter((e) => e.eligibleForPayout)
                    .map((enrollment) => (
                      <Card key={enrollment.enrollmentId}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">
                                Lớp #{enrollment.enrollmentId} - {enrollment.subject}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {enrollment.student.name} · {enrollment.tutor.name}
                              </p>
                              <Badge variant="outline" className="mt-2">
                                {enrollment.eligibilityReason}
                              </Badge>
                            </div>
                            <Button
                              onClick={() => handleProcessPayout(enrollment.enrollmentId)}
                              disabled={processing}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Duyệt thanh toán
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Buổi hoàn thành</p>
                              <p className="font-semibold">
                                {enrollment.completedSessions}/{enrollment.totalSessions}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Chờ thanh toán</p>
                              <p className="font-semibold text-yellow-600">
                                {formatCurrency(enrollment.financial.totalPendingRelease)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Hoa hồng</p>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(enrollment.financial.platformFeeEarned)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Đã thanh toán</p>
                              <p className="font-semibold">
                                {formatCurrency(enrollment.financial.totalPaidToTutor)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Yêu cầu rút tiền</CardTitle>
              <CardDescription>Các yêu cầu rút tiền từ gia sư</CardDescription>
            </CardHeader>
            <CardContent>
              {data.pendingPayouts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Không có yêu cầu nào đang chờ
                </div>
              ) : (
                <div className="space-y-4">
                  {data.pendingPayouts.map((payout) => (
                    <Card key={payout.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar>
                                <AvatarImage src={payout.tutor.avatar || undefined} />
                                <AvatarFallback>
                                  {payout.tutor.name?.charAt(0) || 'T'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{payout.tutor.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(payout.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Số tiền</p>
                                <p className="font-semibold text-lg">
                                  {formatCurrency(payout.amount)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Ngân hàng</p>
                                <p className="font-semibold">{payout.bankName}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Số tài khoản</p>
                                <p className="font-semibold">{payout.bankAccount}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Chủ tài khoản</p>
                                <p className="font-semibold">{payout.bankAccountName}</p>
                              </div>
                            </div>
                            {payout.requestNote && (
                              <div className="mt-3">
                                <p className="text-sm text-muted-foreground">Ghi chú:</p>
                                <p className="text-sm">{payout.requestNote}</p>
                              </div>
                            )}
                          </div>
                          <Button
                            onClick={() => handleApprovePayoutRequest(payout.id)}
                            disabled={processing}
                            className="ml-4"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Duyệt
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn tiền cho học viên</DialogTitle>
            <DialogDescription>
              Lớp #{selectedEnrollment?.enrollmentId} - {selectedEnrollment?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hình thức hoàn tiền</Label>
              <RadioGroup value={refundType} onValueChange={(v) => setRefundType(v as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit" id="credit" />
                  <Label htmlFor="credit" className="font-normal">
                    Tạo credit (học viên dùng cho lớp mới)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="direct" id="direct" />
                  <Label htmlFor="direct" className="font-normal">
                    Hoàn tiền trực tiếp
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="reason">Lý do hoàn tiền</Label>
              <Textarea
                id="reason"
                placeholder="Nhập lý do..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              disabled={processing}
            >
              Hủy
            </Button>
            <Button onClick={handleRefund} disabled={processing}>
              {processing ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
