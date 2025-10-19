import { Search, UserCheck, Video, CreditCard } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "1. Tìm kiếm gia sư",
      description: "Sử dụng bộ lọc để tìm gia sư phù hợp với môn học, cấp lớp và ngân sách của bạn. Xem hồ sơ chi tiết, đánh giá và video giới thiệu của gia sư."
    },
    {
      icon: UserCheck,
      title: "2. Đặt lịch học thử",
      description: "Chọn thời gian phù hợp và đặt buổi học thử miễn phí 30 phút. Trò chuyện với gia sư để hiểu rõ phương pháp giảng dạy và đánh giá sự phù hợp."
    },
    {
      icon: Video,
      title: "3. Bắt đầu học",
      description: "Tham gia lớp học trực tuyến qua video call chất lượng cao. Tương tác trực tiếp với gia sư, chia sẻ màn hình và tài liệu học tập."
    },
    {
      icon: CreditCard,
      title: "4. Thanh toán",
      description: "Thanh toán học phí dễ dàng qua QR code ngân hàng. Chỉ thanh toán sau khi hoàn thành buổi học và hài lòng với chất lượng."
    }
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Cách thức hoạt động</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Chỉ 4 bước đơn giản để bắt đầu học với gia sư chất lượng cao
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-6">
              <div className="shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-lg">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-muted/50 rounded-lg max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold mb-4">Lưu ý quan trọng</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Buổi học thử đầu tiên hoàn toàn miễn phí (30 phút)</li>
            <li>• Bạn có thể hủy hoặc đổi lịch học trước 24 giờ mà không mất phí</li>
            <li>• Hoàn tiền 100% nếu không hài lòng với buổi học đầu tiên</li>
            <li>• Hỗ trợ kỹ thuật 24/7 qua chat hoặc hotline</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
