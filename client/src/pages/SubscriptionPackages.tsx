import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown, Sparkles } from "lucide-react";

interface Package {
  id: string;
  name: string;
  months: number;
  discount: number;
  popular?: boolean;
  icon: any;
  features: string[];
  color: string;
}

const PACKAGES: Package[] = [
  {
    id: "basic",
    name: "Gói Cơ Bản",
    months: 1,
    discount: 0,
    icon: Zap,
    features: [
      "Thanh toán theo tháng",
      "Linh hoạt dừng bất kỳ lúc nào",
      "Đầy đủ tính năng học tập",
    ],
    color: "text-blue-500",
  },
  {
    id: "save",
    name: "Gói Tiết Kiệm",
    months: 3,
    discount: 10,
    icon: Star,
    features: [
      "Cam kết 3 tháng",
      "Tiết kiệm 10%",
      "Ưu tiên hỗ trợ",
      "Tặng tài liệu học",
    ],
    color: "text-green-500",
  },
  {
    id: "popular",
    name: "Gói Phổ Biến",
    months: 6,
    discount: 15,
    popular: true,
    icon: Crown,
    features: [
      "Cam kết 6 tháng",
      "Tiết kiệm 15%",
      "Hỗ trợ ưu tiên VIP",
      "Tặng tài liệu + bài tập",
      "1 buổi học thử miễn phí",
    ],
    color: "text-orange-500",
  },
  {
    id: "best",
    name: "Gói Ưu Đãi Nhất",
    months: 12,
    discount: 25,
    icon: Sparkles,
    features: [
      "Cam kết 12 tháng",
      "Tiết kiệm 25%",
      "Hỗ trợ 24/7",
      "Tài liệu + bài tập cao cấp",
      "2 buổi học thử miễn phí",
      "Tặng voucher 500k",
    ],
    color: "text-purple-500",
  },
];

// Mock data cho tính toán
const MOCK_SCHEDULE = {
  sessionsPerWeek: 3, // 3 buổi/tuần (VD: T2,4,6)
  pricePerSession: 300000, // 300k/buổi
};

export default function SubscriptionPackages() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>("popular");

  const calculatePrice = (pkg: Package) => {
    const weeksPerMonth = 4;
    const totalSessions = pkg.months * weeksPerMonth * MOCK_SCHEDULE.sessionsPerWeek;
    const originalPrice = totalSessions * MOCK_SCHEDULE.pricePerSession;
    const discountAmount = (originalPrice * pkg.discount) / 100;
    const finalPrice = originalPrice - discountAmount;

    return {
      totalSessions,
      originalPrice,
      discountAmount,
      finalPrice,
      pricePerMonth: finalPrice / pkg.months,
    };
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Chọn Gói Học Phù Hợp</h1>
        <p className="text-xl text-muted-foreground mb-2">
          Tiết kiệm đến 25% khi đăng ký gói dài hạn
        </p>
        <p className="text-sm text-muted-foreground">
          Ví dụ: Lịch học Thứ 2, 4, 6 (3 buổi/tuần) • 300,000đ/buổi
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {PACKAGES.map((pkg) => {
          const price = calculatePrice(pkg);
          const Icon = pkg.icon;

          return (
            <Card
              key={pkg.id}
              className={`relative ${
                selectedPackage === pkg.id ? "border-primary shadow-lg" : ""
              } ${pkg.popular ? "border-primary" : ""}`}
              data-testid={`package-${pkg.id}`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Phổ biến nhất</Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-8 w-8 ${pkg.color}`} />
                  {pkg.discount > 0 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Tiết kiệm {pkg.discount}%
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{pkg.name}</CardTitle>
                <CardDescription>{pkg.months} tháng</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {(price.finalPrice / 1000000).toFixed(1)}tr
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /{pkg.months} tháng
                    </span>
                  </div>
                  {pkg.discount > 0 && (
                    <p className="text-sm text-muted-foreground line-through mt-1">
                      {(price.originalPrice / 1000000).toFixed(1)}tr
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    ~{(price.pricePerMonth / 1000000).toFixed(1)}tr/tháng
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Bao gồm:</p>
                  <ul className="space-y-2">
                    {pkg.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-4 text-xs text-muted-foreground">
                  <p>📚 Tổng: {price.totalSessions} buổi học</p>
                  <p>💰 Giá gốc: {price.originalPrice.toLocaleString("vi-VN")}đ</p>
                  {pkg.discount > 0 && (
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      🎉 Tiết kiệm: {price.discountAmount.toLocaleString("vi-VN")}đ
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={selectedPackage === pkg.id ? "default" : "outline"}
                  onClick={() => setSelectedPackage(pkg.id)}
                  data-testid={`select-package-${pkg.id}`}
                >
                  {selectedPackage === pkg.id ? "Đã chọn" : "Chọn gói này"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader>
          <CardTitle>So Sánh Chi Tiết</CardTitle>
          <CardDescription>Xem tổng quan và lựa chọn gói phù hợp với bạn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Gói</th>
                  <th className="text-right py-3 px-4">Thời gian</th>
                  <th className="text-right py-3 px-4">Số buổi</th>
                  <th className="text-right py-3 px-4">Giá gốc</th>
                  <th className="text-right py-3 px-4">Giảm giá</th>
                  <th className="text-right py-3 px-4">Giá cuối</th>
                  <th className="text-right py-3 px-4">Tiết kiệm</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES.map((pkg) => {
                  const price = calculatePrice(pkg);
                  return (
                    <tr
                      key={pkg.id}
                      className={`border-b ${
                        selectedPackage === pkg.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">{pkg.name}</td>
                      <td className="text-right py-3 px-4">{pkg.months} tháng</td>
                      <td className="text-right py-3 px-4">{price.totalSessions} buổi</td>
                      <td className="text-right py-3 px-4">
                        {price.originalPrice.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="text-right py-3 px-4">
                        {pkg.discount > 0 ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            -{pkg.discount}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="text-right py-3 px-4 font-bold">
                        {price.finalPrice.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="text-right py-3 px-4 text-green-600 dark:text-green-400 font-medium">
                        {pkg.discount > 0
                          ? `-${price.discountAmount.toLocaleString("vi-VN")}đ`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Call to action */}
      {selectedPackage && (
        <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Bạn đã chọn:{" "}
                {PACKAGES.find((p) => p.id === selectedPackage)?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Tiến hành đặt lịch và thanh toán để bắt đầu học
              </p>
            </div>
            <Button size="lg" data-testid="button-proceed-booking">
              Tiếp tục đặt lịch →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
