"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Star,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

// Mock data - trong thực tế sẽ lấy từ API dựa vào tutorId
const MOCK_TUTOR = {
  id: "tutor-001",
  name: "Nguyễn Văn A",
  subject: "Toán THPT",
  rating: 4.9,
  totalReviews: 128,
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tutor1",
  availableSlots: [
    {
      id: "slot-1",
      days: [1, 3, 5], // Thứ 2, 4, 6
      dayLabels: "Thứ 2, 4, 6",
      startTime: "18:00",
      endTime: "19:30",
      price: 300000,
      sessionsPerWeek: 3,
    },
    {
      id: "slot-2",
      days: [2, 4, 6], // Thứ 3, 5, 7
      dayLabels: "Thứ 3, 5, 7",
      startTime: "14:00",
      endTime: "15:30",
      price: 280000,
      sessionsPerWeek: 3,
    },
    {
      id: "slot-3",
      days: [0, 6], // T7, CN
      dayLabels: "Cuối tuần (T7, CN)",
      startTime: "09:00",
      endTime: "10:30",
      price: 350000,
      sessionsPerWeek: 2,
    },
  ],
};

export default function BookingFlow() {
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const slot = MOCK_TUTOR.availableSlots.find((s) => s.id === selectedSlot);

  const handleContinue = () => {
    if (!selectedSlot) {
      toast({
        title: "Chưa chọn ca học",
        description: "Vui lòng chọn ca học phù hợp với bạn",
        variant: "destructive",
      });
      return;
    }

    if (!startDate) {
      toast({
        title: "Chưa chọn ngày bắt đầu",
        description: "Vui lòng chọn ngày bắt đầu học",
        variant: "destructive",
      });
      return;
    }

    setShowPayment(true);
  };

  const handleConfirmBooking = () => {
    toast({
      title: "Đặt lịch thành công!",
      description: "Vui lòng thanh toán để bắt đầu học",
    });
    // Trong thực tế: chuyển đến trang thanh toán hoặc tạo booking trong DB
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const calculateMonthlyPrice = () => {
    if (!slot) return 0;
    // 4 tuần/tháng
    return slot.sessionsPerWeek * 4 * slot.price;
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" className="mb-4" data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
        <h1 className="text-3xl font-bold" data-testid="heading-booking">
          Đặt lịch học theo tháng
        </h1>
        <p className="text-muted-foreground mt-2">
          Chọn ca học và ngày bắt đầu
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tutor info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl" data-testid="text-tutor-name">
                    {MOCK_TUTOR.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {MOCK_TUTOR.subject}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {MOCK_TUTOR.rating}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({MOCK_TUTOR.totalReviews} đánh giá)
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Step 1: Chọn ca học */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Chọn ca học
              </CardTitle>
              <CardDescription>
                Chọn ca học phù hợp với lịch của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_TUTOR.availableSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all hover-elevate ${
                    selectedSlot === slot.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid={`slot-option-${slot.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{slot.dayLabels}</Badge>
                        <Badge variant="secondary">
                          {slot.sessionsPerWeek} buổi/tuần
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatPrice(slot.price)}
                      </p>
                      <p className="text-sm text-muted-foreground">/buổi</p>
                    </div>
                    {selectedSlot === slot.id && (
                      <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Step 2: Chọn ngày bắt đầu */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Ngày bắt đầu học
              </CardTitle>
              <CardDescription>
                Chọn ngày bắt đầu buổi học đầu tiên
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="start-date">Ngày bắt đầu</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="max-w-xs"
                  data-testid="input-start-date"
                />
                {startDate && (
                  <p className="text-sm text-muted-foreground">
                    Buổi học đầu tiên:{" "}
                    {new Date(startDate).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment section */}
          {showPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Thanh toán
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="aspect-square max-w-xs mx-auto bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      QR Code thanh toán
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Tổng tiền thanh toán
                    </p>
                    <p className="text-2xl font-bold">
                      {formatPrice(calculateMonthlyPrice())}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      cho tháng đầu tiên
                    </p>
                  </div>
                  <Button
                    onClick={handleConfirmBooking}
                    className="w-full"
                    data-testid="button-confirm-payment"
                  >
                    Xác nhận đã thanh toán
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          {!showPayment && (
            <div className="flex gap-4">
              <Button
                onClick={handleContinue}
                className="flex-1"
                disabled={!selectedSlot || !startDate}
                data-testid="button-continue"
              >
                Tiếp tục thanh toán
              </Button>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Tóm tắt đặt lịch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {slot ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Lịch học
                    </p>
                    <p className="font-medium">{slot.dayLabels}</p>
                    <p className="text-sm">
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Số buổi/tuần
                    </p>
                    <p className="font-medium">{slot.sessionsPerWeek} buổi</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Học phí/buổi
                    </p>
                    <p className="font-medium">{formatPrice(slot.price)}</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Học phí/tháng (ước tính)
                    </p>
                    <p className="text-xl font-bold">
                      {formatPrice(calculateMonthlyPrice())}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      = {slot.sessionsPerWeek} buổi × 4 tuần × {formatPrice(slot.price)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa chọn ca học
                </p>
              )}

              {startDate && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Ngày bắt đầu
                  </p>
                  <p className="font-medium">
                    {new Date(startDate).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
