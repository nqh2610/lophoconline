import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  User,
  BookOpen,
  Star,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock data
const MOCK_TUTOR = {
  id: "tutor-001",
  name: "Nguyễn Văn A",
  subject: "Toán",
  rating: 4.9,
  schedules: [
    { id: "s1", days: [1, 3, 5], time: "18:00-19:30", price: 300000, label: "Thứ 2,4,6 • 18:00-19:30" },
    { id: "s2", days: [2, 4, 6], time: "14:00-15:30", price: 280000, label: "Thứ 3,5,7 • 14:00-15:30" },
    { id: "s3", days: [0, 6], time: "09:00-10:30", price: 350000, label: "T7,CN • 09:00-10:30" },
  ],
};

const PACKAGES = [
  { id: "1m", months: 1, discount: 0, label: "1 tháng (giá gốc)" },
  { id: "3m", months: 3, discount: 10, label: "3 tháng (giảm 10%)", popular: true },
  { id: "6m", months: 6, discount: 15, label: "6 tháng (giảm 15%)" },
  { id: "12m", months: 12, discount: 25, label: "12 tháng (giảm 25%)" },
];

export default function BookingFlow() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>("3m");
  const [startDate, setStartDate] = useState("");

  const getSchedule = () => MOCK_TUTOR.schedules.find((s) => s.id === selectedSchedule);
  const getPackage = () => PACKAGES.find((p) => p.id === selectedPackage);

  const calculateTotal = () => {
    const schedule = getSchedule();
    const pkg = getPackage();
    if (!schedule || !pkg) return null;

    const sessionsPerWeek = schedule.days.length;
    const totalWeeks = pkg.months * 4;
    const totalSessions = sessionsPerWeek * totalWeeks;
    const originalPrice = totalSessions * schedule.price;
    const discountAmount = (originalPrice * pkg.discount) / 100;
    const finalPrice = originalPrice - discountAmount;

    return {
      sessionsPerWeek,
      totalWeeks,
      totalSessions,
      originalPrice,
      discountAmount,
      finalPrice,
      pricePerSession: schedule.price,
    };
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedSchedule) {
      toast({
        title: "Chưa chọn lịch học",
        description: "Vui lòng chọn lịch học phù hợp",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && !selectedPackage) {
      toast({
        title: "Chưa chọn gói học",
        description: "Vui lòng chọn gói học phù hợp",
        variant: "destructive",
      });
      return;
    }
    if (step === 3 && !startDate) {
      toast({
        title: "Chưa chọn ngày bắt đầu",
        description: "Vui lòng chọn ngày bắt đầu học",
        variant: "destructive",
      });
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleConfirmBooking = () => {
    toast({
      title: "Đặt lịch thành công!",
      description: "Vui lòng thanh toán để bắt đầu học",
    });
    // In real app: redirect to payment page
  };

  const total = calculateTotal();

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Progress steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {[
            { num: 1, label: "Chọn lịch", icon: Calendar },
            { num: 2, label: "Chọn gói", icon: BookOpen },
            { num: 3, label: "Xác nhận", icon: CheckCircle2 },
            { num: 4, label: "Thanh toán", icon: CreditCard },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    step >= s.num
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs mt-2">{s.label}</span>
              </div>
              {idx < 3 && (
                <ChevronRight
                  className={`mx-2 h-5 w-5 ${
                    step > s.num ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2">
          {/* Step 1: Choose schedule */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Chọn Lịch Học
                </CardTitle>
                <CardDescription>
                  Chọn lịch học phù hợp với thời gian của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_TUTOR.schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`p-4 border rounded-lg cursor-pointer hover-elevate ${
                      selectedSchedule === schedule.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedSchedule(schedule.id)}
                    data-testid={`schedule-option-${schedule.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{schedule.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {schedule.days.length} buổi/tuần •{" "}
                          {schedule.price.toLocaleString("vi-VN")}đ/buổi
                        </p>
                      </div>
                      {selectedSchedule === schedule.id && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Choose package */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Chọn Gói Học
                </CardTitle>
                <CardDescription>
                  Gói dài hạn được giảm giá lên đến 25%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PACKAGES.map((pkg) => {
                  const schedule = getSchedule();
                  if (!schedule) return null;

                  const sessionsPerWeek = schedule.days.length;
                  const totalSessions = sessionsPerWeek * pkg.months * 4;
                  const originalPrice = totalSessions * schedule.price;
                  const discountAmount = (originalPrice * pkg.discount) / 100;
                  const finalPrice = originalPrice - discountAmount;

                  return (
                    <div
                      key={pkg.id}
                      className={`p-4 border rounded-lg cursor-pointer hover-elevate ${
                        selectedPackage === pkg.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedPackage(pkg.id)}
                      data-testid={`package-option-${pkg.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{pkg.label}</p>
                            {pkg.popular && (
                              <Badge className="bg-primary">Phổ biến</Badge>
                            )}
                            {pkg.discount > 0 && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                -{pkg.discount}%
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {totalSessions} buổi học
                            </p>
                            {pkg.discount > 0 && (
                              <p className="text-sm text-muted-foreground line-through">
                                {originalPrice.toLocaleString("vi-VN")}đ
                              </p>
                            )}
                            <p className="text-lg font-bold">
                              {finalPrice.toLocaleString("vi-VN")}đ
                            </p>
                            {pkg.discount > 0 && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Tiết kiệm {discountAmount.toLocaleString("vi-VN")}đ
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedPackage === pkg.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Confirm details */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Xác Nhận Thông Tin
                </CardTitle>
                <CardDescription>
                  Kiểm tra lại thông tin trước khi thanh toán
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="start-date" className="mb-2 block">
                    Ngày bắt đầu học
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Thông tin đã chọn:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lịch học:</span>
                      <span className="font-medium">
                        {getSchedule()?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gói học:</span>
                      <span className="font-medium">
                        {getPackage()?.label}
                      </span>
                    </div>
                    {startDate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bắt đầu:</span>
                        <span className="font-medium">
                          {new Date(startDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Thanh Toán
                </CardTitle>
                <CardDescription>
                  Quét mã QR để thanh toán và bắt đầu học
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">QR Code Placeholder</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Quét mã QR bằng ứng dụng ngân hàng để thanh toán
                  </p>
                  <p className="text-lg font-bold mt-2">
                    {total?.finalPrice.toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                data-testid="button-back"
              >
                ← Quay lại
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={handleNextStep}
                className="flex-1"
                data-testid="button-next"
              >
                Tiếp tục →
              </Button>
            ) : (
              <Button
                onClick={handleConfirmBooking}
                className="flex-1"
                data-testid="button-confirm"
              >
                Xác nhận thanh toán
              </Button>
            )}
          </div>
        </div>

        {/* Summary sidebar */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Thông Tin Gia Sư</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{MOCK_TUTOR.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {MOCK_TUTOR.subject}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {MOCK_TUTOR.rating}
                    </span>
                  </div>
                </div>
              </div>

              {total && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Chi Tiết Thanh Toán</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Số buổi/tuần:</span>
                        <span>{total.sessionsPerWeek} buổi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tổng số tuần:</span>
                        <span>{total.totalWeeks} tuần</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tổng số buổi:</span>
                        <span className="font-medium">{total.totalSessions} buổi</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Giá/buổi:</span>
                        <span>{total.pricePerSession.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tạm tính:</span>
                        <span>{total.originalPrice.toLocaleString("vi-VN")}đ</span>
                      </div>
                      {total.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Giảm giá:</span>
                          <span className="text-green-600 dark:text-green-400">
                            -{total.discountAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Tổng cộng:</span>
                        <span>{total.finalPrice.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
