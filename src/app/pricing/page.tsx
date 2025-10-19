import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Pricing() {
  const plans = [
    {
      name: "Gói cơ bản",
      price: "100.000đ",
      period: "/giờ",
      description: "Phù hợp cho học sinh tiểu học và THCS",
      features: [
        "Gia sư sinh viên có kinh nghiệm",
        "Học 1-1 trực tuyến",
        "Tài liệu học tập cơ bản",
        "Hỗ trợ qua chat",
        "Đánh giá sau mỗi buổi học"
      ]
    },
    {
      name: "Gói nâng cao",
      price: "200.000đ",
      period: "/giờ",
      description: "Phù hợp cho học sinh THPT và luyện thi",
      features: [
        "Gia sư giáo viên chuyên nghiệp",
        "Học 1-1 hoặc nhóm nhỏ",
        "Tài liệu học tập chuyên sâu",
        "Đề thi và bài tập nâng cao",
        "Theo dõi tiến độ chi tiết",
        "Tư vấn định hướng học tập"
      ],
      popular: true
    },
    {
      name: "Gói cao cấp",
      price: "350.000đ",
      period: "/giờ",
      description: "Phù hợp cho IELTS, TOEFL, SAT và các kỳ thi quốc tế",
      features: [
        "Gia sư có chứng chỉ quốc tế",
        "Lộ trình học cá nhân hóa",
        "Tài liệu độc quyền cao cấp",
        "Mock test và chấm chữa chi tiết",
        "Cam kết đầu ra",
        "Hỗ trợ 24/7",
        "Học lại miễn phí nếu không đạt mục tiêu"
      ]
    }
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Bảng giá linh hoạt</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Chọn gói học phù hợp với nhu cầu và ngân sách của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card key={index} className={plan.popular ? "border-primary border-2" : ""}>
              {plan.popular && (
                <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-semibold">
                  Phổ biến nhất
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  Chọn gói này
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Ưu đãi đặc biệt</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>• <strong>Giảm 10%</strong> khi đăng ký gói 10 buổi học</li>
            <li>• <strong>Giảm 15%</strong> khi đăng ký gói 20 buổi học</li>
            <li>• <strong>Giảm 20%</strong> khi đăng ký gói 30 buổi học trở lên</li>
            <li>• <strong>Miễn phí</strong> buổi học thử đầu tiên (30 phút)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
