"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Calendar } from "lucide-react";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionId = searchParams?.get('transactionId');

  useEffect(() => {
    // TODO: Update transaction status to 'completed' via API
    if (transactionId) {
      console.log('Payment successful for transaction:', transactionId);
    }
  }, [transactionId]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12">
      <div className="max-w-md w-full px-4">
        <Card>
          <CardContent className="pt-12 pb-8">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Success Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
                <div className="relative bg-green-500 rounded-full p-6">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>

              {/* Success Message */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-green-600">
                  Thanh toán thành công!
                </h1>
                <p className="text-muted-foreground">
                  Đặt lịch học của bạn đã được xác nhận
                </p>
              </div>

              {/* Transaction Info */}
              {transactionId && (
                <div className="bg-muted rounded-lg p-4 w-full">
                  <p className="text-sm text-muted-foreground mb-1">
                    Mã giao dịch
                  </p>
                  <p className="font-mono font-semibold">
                    #{transactionId}
                  </p>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 w-full text-left space-y-2">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Bước tiếp theo:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Gia sư sẽ xác nhận lịch học trong vòng 24h</li>
                  <li>Bạn sẽ nhận được thông báo qua email</li>
                  <li>Link học online sẽ được gửi trước giờ học 1 tiếng</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Xem lịch học
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 gap-2"
                >
                  <Home className="h-4 w-4" />
                  Về trang chủ
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
