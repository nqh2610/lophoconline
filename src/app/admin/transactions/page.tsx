"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Eye, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminTransactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const transactions = [
    {
      id: 'TX001',
      date: '12/10/2025 14:30',
      student: 'Nguyễn Văn An',
      tutor: 'Phạm Văn D',
      amount: 200000,
      method: 'QR Code - Vietcombank',
      status: 'success',
      subject: 'Toán lớp 10',
    },
    {
      id: 'TX002',
      date: '12/10/2025 10:15',
      student: 'Trần Thị Bình',
      tutor: 'Hoàng Thị E',
      amount: 250000,
      method: 'QR Code - MBBank',
      status: 'success',
      subject: 'Tiếng Anh',
    },
    {
      id: 'TX003',
      date: '11/10/2025 16:45',
      student: 'Lê Văn Cường',
      tutor: 'Phạm Văn D',
      amount: 150000,
      method: 'QR Code - ACB',
      status: 'pending',
      subject: 'Vật Lý',
    },
    {
      id: 'TX004',
      date: '11/10/2025 09:20',
      student: 'Phạm Thị Dung',
      tutor: 'Hoàng Thị E',
      amount: 300000,
      method: 'QR Code - Techcombank',
      status: 'success',
      subject: 'IELTS',
    },
    {
      id: 'TX005',
      date: '10/10/2025 18:00',
      student: 'Hoàng Văn Em',
      tutor: 'Phạm Văn D',
      amount: 180000,
      method: 'QR Code - VietinBank',
      status: 'failed',
      subject: 'Hóa học',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Thành công
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-white">
            <Clock className="h-3 w-3 mr-1" />
            Đang xử lý
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Thất bại
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (searchQuery && !tx.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalAmount = filteredTransactions
    .filter(tx => tx.status === 'success')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-destructive" data-testid="text-admin-transactions-title">
            Quản lý Giao dịch
          </h1>
          <p className="text-muted-foreground">Theo dõi và quản lý tất cả giao dịch thanh toán</p>
        </div>

        {/* Filters & Stats */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã giao dịch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="success">Thành công</SelectItem>
                <SelectItem value="pending">Đang xử lý</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                <p className="text-2xl font-bold">{filteredTransactions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Tổng tiền (Thành công)</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {filteredTransactions.filter(tx => tx.status === 'pending').length}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{tx.id}</span>
                      {getStatusBadge(tx.status)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Học viên:</span>{' '}
                        <span className="font-medium">{tx.student}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Giáo viên:</span>{' '}
                        <span className="font-medium">{tx.tutor}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Môn học:</span>{' '}
                        <span>{tx.subject}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phương thức:</span>{' '}
                        <span>{tx.method}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <div className="flex flex-col lg:items-end gap-2">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(tx.amount)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-transaction-${tx.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Chi tiết
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy giao dịch nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
