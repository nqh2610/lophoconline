import { Button } from "@/components/ui/button";
import { Shield, Eye, TrendingUp, MessageCircle } from "lucide-react";

export default function ForParents() {
  const features = [
    {
      icon: Shield,
      title: "An toàn & Bảo mật",
      description: "Tất cả giáo viên đều được xác thực kỹ lưỡng. Bạn có thể yên tâm về chất lượng và an toàn cho con."
    },
    {
      icon: Eye,
      title: "Theo dõi tiến độ",
      description: "Xem báo cáo chi tiết về tiến độ học tập, điểm số và sự phát triển của con qua từng buổi học."
    },
    {
      icon: TrendingUp,
      title: "Kết quả rõ ràng",
      description: "Nhìn thấy sự cải thiện điểm số và kiến thức của con qua các bài kiểm tra và đánh giá."
    },
    {
      icon: MessageCircle,
      title: "Liên lạc trực tiếp",
      description: "Trao đổi trực tiếp với giáo viên về phương pháp học và tiến độ của con thông qua chat."
    }
  ];

  const benefits = [
    {
      title: "Tiết kiệm thời gian",
      description: "Con học tại nhà, không cần di chuyển. Bạn tiết kiệm thời gian đưa đón và con có thêm thời gian nghỉ ngơi."
    },
    {
      title: "Chi phí hợp lý",
      description: "Học phí minh bạch, có thể thương lượng. Thanh toán theo buổi, không ràng buộc dài hạn."
    },
    {
      title: "Chất lượng đảm bảo",
      description: "Chọn giáo viên phù hợp từ hàng nghìn hồ sơ. Đổi giáo viên miễn phí nếu không hài lòng."
    },
    {
      title: "Học cá nhân hóa",
      description: "Giáo viên tập trung 100% vào con, điều chỉnh phương pháp dạy phù hợp với khả năng và tính cách."
    }
  ];

  const faqs = [
    {
      q: "Làm sao biết giáo viên có đủ năng lực?",
      a: "Tất cả giáo viên đều được xác thực bằng cấp, kinh nghiệm. Bạn có thể xem đánh giá của phụ huynh khác và video giới thiệu của giáo viên."
    },
    {
      q: "Con có an toàn khi học online không?",
      a: "Hoàn toàn an toàn. Các buổi học được giám sát, bạn có thể tham gia quan sát bất cứ lúc nào. Nền tảng không chia sẻ thông tin cá nhân của con."
    },
    {
      q: "Nếu con không hiểu bài thì sao?",
      a: "Giáo viên sẽ giải thích lại nhiều lần với các phương pháp khác nhau. Bạn cũng có thể yêu cầu thêm buổi học hoặc tài liệu bổ sung."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">Giúp con học tốt hơn</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Tìm giáo viên chất lượng, theo dõi tiến độ và đồng hành cùng con trên hành trình học tập
            </p>
            <Button size="lg" className="text-lg px-8">
              Tìm giáo viên cho con
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Phụ huynh yên tâm với LopHoc.Online</h2>
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

      {/* Benefits */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Lợi ích khi cho con học online</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="p-6 bg-background rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs for Parents */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Câu hỏi từ phụ huynh</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 bg-muted/50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Phụ huynh nói gì về chúng tôi</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-background rounded-lg">
              <p className="mb-4">"Con tôi học Toán với cô Mai được 3 tháng, điểm số cải thiện rõ rệt. Cô rất nhiệt tình và tận tâm."</p>
              <p className="font-semibold">- Phụ huynh Nguyễn Văn A</p>
            </div>
            <div className="p-6 bg-background rounded-lg">
              <p className="mb-4">"Tôi yên tâm vì có thể theo dõi tiến độ học của con qua app. Giáo viên cũng thường xuyên báo cáo."</p>
              <p className="font-semibold">- Phụ huynh Trần Thị B</p>
            </div>
            <div className="p-6 bg-background rounded-lg">
              <p className="mb-4">"Học phí hợp lý, chất lượng tốt. Con tôi đã đỗ vào trường chuyên nhờ thầy Hùng."</p>
              <p className="font-semibold">- Phụ huynh Lê Văn C</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng giúp con học tốt hơn?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Hàng nghìn phụ huynh đã tin tưởng chọn LopHoc.Online cho con em mình
          </p>
          <Button size="lg" className="text-lg px-8">
            Bắt đầu ngay
          </Button>
        </div>
      </section>
    </div>
  );
}
