import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Users, TrendingUp } from "lucide-react";

export default function ForTutors() {
  const benefits = [
    {
      icon: DollarSign,
      title: "Thu nhập hấp dẫn",
      description: "Kiếm 100.000đ - 500.000đ/giờ tùy vào trình độ và kinh nghiệm của bạn"
    },
    {
      icon: Clock,
      title: "Linh hoạt thời gian",
      description: "Tự do sắp xếp lịch dạy theo thời gian rảnh của bạn"
    },
    {
      icon: Users,
      title: "Học viên chất lượng",
      description: "Kết nối với hàng nghìn học viên có nhu cầu học tập nghiêm túc"
    },
    {
      icon: TrendingUp,
      title: "Phát triển sự nghiệp",
      description: "Xây dựng danh tiếng và phát triển kỹ năng giảng dạy của bạn"
    }
  ];

  const requirements = [
    "Có kiến thức chuyên sâu về môn học muốn dạy",
    "Có bằng cấp hoặc chứng chỉ liên quan (sinh viên cần transcript)",
    "Có kỹ năng giao tiếp tốt và nhiệt tình với giảng dạy",
    "Có máy tính/laptop, camera, micro và internet ổn định",
    "Cam kết chất lượng giảng dạy và đúng giờ"
  ];

  const steps = [
    { title: "Đăng ký", description: "Điền form đăng ký với thông tin cá nhân và bằng cấp" },
    { title: "Xác thực", description: "Chúng tôi xác thực hồ sơ trong 24-48 giờ" },
    { title: "Tạo hồ sơ", description: "Hoàn thiện hồ sơ gia sư với giới thiệu và video demo" },
    { title: "Bắt đầu dạy", description: "Nhận yêu cầu từ học viên và bắt đầu kiếm tiền" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Trở thành gia sư trực tuyến</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Chia sẻ kiến thức, kiếm thu nhập hấp dẫn và phát triển sự nghiệp giảng dạy của bạn
            </p>
            <Button size="lg" className="text-lg px-8">
              Đăng ký ngay
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Lợi ích khi trở thành gia sư</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Yêu cầu gia sư</h2>
          <ul className="space-y-3">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-start gap-3 text-lg">
                <span className="text-primary mt-1">✓</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How to Start */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Cách bắt đầu</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Tham gia cùng hàng nghìn gia sư đang kiếm thu nhập ổn định trên LopHoc.Online
          </p>
          <Button size="lg" className="text-lg px-8">
            Đăng ký làm gia sư
          </Button>
        </div>
      </section>
    </div>
  );
}
