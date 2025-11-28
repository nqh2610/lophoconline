"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Calendar,
  User,
  BookOpen
} from "lucide-react";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params?.transactionId as string;

  const [paymentMethod, setPaymentMethod] = useState<string>("vnpay");
  const [isProcessing, setIsProcessing] = useState(false);

  // TODO: Fetch transaction details from API
  const mockTransaction = {
    id: transactionId,
    amount: 300000,
    lessonDetails: {
      tutorName: "Nguyễn Thị Mai",
      subject: "Toán học",
      gradeLevel: "Lớp 10",
      date: "15/01/2026",
      time: "19:00 - 20:30",
      duration: "1.5 giờ"
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // TODO: Implement actual payment gateway integration
      // For now, just simulate payment
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to success page
      router.push(`/payment/success?transactionId=${transactionId}`);
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Chọn phương thức thanh toán</CardTitle>
                <CardDescription>
                  Vui lòng chọn phương thức thanh toán phù hợp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-4">
                    {/* VNPay */}
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="vnpay" id="vnpay" />
                      <Label htmlFor="vnpay" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-semibold">VNPay</p>
                              <p className="text-sm text-muted-foreground">
                                Thẻ ATM, Visa, MasterCard
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary">Phổ biến</Badge>
                        </div>
                      </Label>
                    </div>

                    {/* MoMo */}
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="momo" id="momo" />
                      <Label htmlFor="momo" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-pink-500" />
                          <div>
                            <p className="font-semibold">MoMo</p>
                            <p className="text-sm text-muted-foreground">
                              Ví điện tử MoMo
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Bank Transfer */}
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent">
                      <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                      <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-semibold">Chuyển khoản ngân hàng</p>
                            <p className="text-sm text-muted-foreground">
                              Internet Banking, Mobile Banking
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Thanh toán an toàn và bảo mật</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Hoàn tiền 100% nếu giáo viên từ chối</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full mt-6"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Đang xử lý..." : "Thanh toán ngay"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Chi tiết đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Giáo viên</p>
                      <p className="text-sm text-muted-foreground">
                        {mockTransaction.lessonDetails.tutorName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Môn học</p>
                      <p className="text-sm text-muted-foreground">
                        {mockTransaction.lessonDetails.subject} - {mockTransaction.lessonDetails.gradeLevel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ngày học</p>
                      <p className="text-sm text-muted-foreground">
                        {mockTransaction.lessonDetails.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Thời gian</p>
                      <p className="text-sm text-muted-foreground">
                        {mockTransaction.lessonDetails.time}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({mockTransaction.lessonDetails.duration})
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Học phí</span>
                    <span>{mockTransaction.amount.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Phí dịch vụ</span>
                    <span>0đ</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Tổng cộng</span>
                  <span className="text-primary">
                    {mockTransaction.amount.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="bg-muted rounded-lg p-3 mt-4">
                  <p className="text-xs text-muted-foreground">
                    Bằng việc thanh toán, bạn đồng ý với{" "}
                    <a href="/terms" className="text-primary hover:underline">
                      Điều khoản sử dụng
                    </a>{" "}
                    và{" "}
                    <a href="/privacy" className="text-primary hover:underline">
                      Chính sách bảo mật
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
