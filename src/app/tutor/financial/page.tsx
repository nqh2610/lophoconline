'use client';

/**
 * Dashboard tài chính của giáo viên
 * Hiển thị:
 * - Tổng quan: Số dư ví, doanh thu, pending
 * - Danh sách lớp với thông tin buổi học và tiền
 * - Lịch sử giao dịch
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
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
} from 'lucide-react';

interface FinancialData {
  wallet: {
    availableBalance: number;
    pendingBalance: number;
    withdrawnBalance: number;
    totalEarned: number;
    lastPayoutDate: string | null;
  };
  summary: {
    totalEarnedAllClasses: number;
    totalPendingAllClasses: number;
    totalPlatformFeeAllClasses: number;
    totalClassesActive: number;
    totalClassesCompleted: number;
  };
  classes: Array<{
    enrollmentId: number;
    student: { id: number; name: string; avatar: string | null };
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
      releasedAmount: number;
      isPaid: boolean;
      completedAt: string | null;
    }>;
    financial: {
      totalPaidAmount: number;
      totalPendingAmount: number;
      platformFee: number;
      netEarned: number;
      commissionRate: number;
    };
  }>;
  recentTransactions: Array<{
    id: number;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
  }>;
}

export default function TutorFinancialDashboard() {
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
      const response = await fetch('/api/tutor/dashboard/financial', {
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
        {status === 'active' ? 'Đang học' : status === 'completed' ? 'Hoàn thành' : status === 'cancelled' ? 'Đã hủy' : 'Chờ'}
      </Badge>
    );
  };

  const getSessionStatusBadge = (status: string, isPaid: boolean) => {
    if (status === 'completed') {
      return isPaid ? (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Đã thanh toán
        </Badge>
      ) : (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Chờ duyệt
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
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
        <h1 className="text-3xl font-bold mb-2">Dashboard Tài Chính</h1>
        <p className="text-muted-foreground">
          Quản lý thu nhập và theo dõi thanh toán
        </p>
      </div>

      {/* Wallet Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Số dư khả dụng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.wallet.availableBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Có thể rút ngay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang chờ duyệt</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(data.summary.totalPendingAllClasses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chờ admin duyệt thanh toán
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thu nhập</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.wallet.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tất cả thời gian
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lớp đang dạy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Main Content */}
      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="classes">Lớp học</TabsTrigger>
          <TabsTrigger value="transactions">Lịch sử giao dịch</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4">
          {data.classes.map((classData) => (
            <Card key={classData.enrollmentId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={classData.student.avatar || undefined} />
                      <AvatarFallback>
                        {classData.student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {classData.subject} - {classData.gradeLevel}
                      </CardTitle>
                      <CardDescription>
                        Học viên: {classData.student.name}
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
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(classData.financial.netEarned)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {formatCurrency(classData.financial.totalPendingAmount)}
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
                          <TableHead className="text-right">Tiền</TableHead>
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
                              {getSessionStatusBadge(session.status, session.isPaid)}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.isPaid ? (
                                <span className="text-green-600 font-semibold">
                                  {formatCurrency(session.releasedAmount)}
                                </span>
                              ) : session.status === 'completed' ? (
                                <span className="text-yellow-600">
                                  {formatCurrency(classData.pricePerSession)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Financial Summary */}
                <Separator className="my-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Giá/buổi</p>
                    <p className="font-semibold">
                      {formatCurrency(classData.pricePerSession)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tổng giá trị</p>
                    <p className="font-semibold">
                      {formatCurrency(classData.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Hoa hồng ({classData.financial.commissionRate}%)</p>
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(classData.financial.platformFee)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Thực nhận</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(classData.financial.netEarned)}
                    </p>
                  </div>
                </div>
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

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <CardDescription>10 giao dịch gần nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-right">Số dư sau</TableHead>
                    <TableHead>Thời gian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <Badge variant="outline">{tx.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tx.description || 'N/A'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.recentTransactions.length === 0 && (
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
