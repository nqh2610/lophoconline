import { Button } from "@/components/ui/button";
import { GraduationCap, Video, Clock, Shield } from "lucide-react";

export default function ForStudents() {
  const features = [
    {
      icon: GraduationCap,
      title: "Gia sư chất lượng",
      description: "Hơn 5,000 gia sư được xác thực, có kinh nghiệm từ 1-10 năm"
    },
    {
      icon: Video,
      title: "Học trực tuyến",
      description: "Học mọi lúc, mọi nơi qua video call chất lượng cao"
    },
    {
      icon: Clock,
      title: "Linh hoạt lịch học",
      description: "Tự do chọn thời gian học phù hợp với lịch trình của bạn"
    },
    {
      icon: Shield,
      title: "Cam kết chất lượng",
      description: "Hoàn tiền 100% nếu không hài lòng với buổi học đầu tiên"
    }
  ];

  const subjects = [
    "Toán", "Vật Lý", "Hóa Học", "Sinh Học",
    "Tiếng Anh", "Văn", "Sử", "Địa",
    "IELTS", "TOEFL", "SAT", "TOEIC"
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Học với gia sư giỏi nhất</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Nâng cao kiến thức, cải thiện điểm số và đạt mục tiêu học tập của bạn
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8">
                Tìm gia sư ngay
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Học thử miễn phí
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Tại sao học viên chọn chúng tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8">Môn học phổ biến</h2>
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3">
              {subjects.map((subject, index) => (
                <Button key={index} variant="outline" size="lg">
                  {subject}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-center mt-8 text-muted-foreground">
            Và hơn 50+ môn học khác...
          </p>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Câu chuyện thành công</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-muted/50 rounded-lg">
              <p className="text-lg mb-4">"Điểm Toán của em đã tăng từ 5 lên 9 chỉ sau 3 tháng học với thầy Hùng!"</p>
              <p className="font-semibold">- Nguyễn Minh Anh, lớp 12</p>
            </div>
            <div className="p-6 bg-muted/50 rounded-lg">
              <p className="text-lg mb-4">"Em đã đạt 7.5 IELTS nhờ cô Mai hướng dẫn tận tình!"</p>
              <p className="font-semibold">- Trần Bảo Châu, sinh viên năm 2</p>
            </div>
            <div className="p-6 bg-muted/50 rounded-lg">
              <p className="text-lg mb-4">"Phương pháp dạy của thầy rất dễ hiểu, em đã vào được ĐH Bách Khoa!"</p>
              <p className="font-semibold">- Lê Hoàng Nam, học sinh THPT</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Bắt đầu hành trình học tập ngay hôm nay</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Học thử miễn phí 30 phút - Không cần thanh toán trước
          </p>
          <Button size="lg" className="text-lg px-8">
            Đăng ký học thử
          </Button>
        </div>
      </section>
    </div>
  );
}
