export default function About() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Giới thiệu về LopHoc.Online</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground text-lg mb-6">
              LopHoc.Online là nền tảng kết nối giáo viên và học viên trực tuyến hàng đầu tại Việt Nam.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Sứ mệnh</h2>
            <p className="text-muted-foreground mb-6">
              Chúng tôi mong muốn mang đến cơ hội học tập chất lượng cao cho mọi học viên, 
              kết nối họ với những giáo viên giỏi nhất trên toàn quốc thông qua công nghệ hiện đại.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Tầm nhìn</h2>
            <p className="text-muted-foreground mb-6">
              Trở thành nền tảng giáo dục trực tuyến số 1 Việt Nam, nơi mọi học viên 
              đều có thể tiếp cận với giáo dục chất lượng cao, không bị giới hạn bởi địa lý.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Giá trị cốt lõi</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li>✓ <strong>Chất lượng:</strong> Cam kết mang đến giáo viên được xác thực và chất lượng giảng dạy tốt nhất</li>
              <li>✓ <strong>Minh bạch:</strong> Rõ ràng về học phí, quy trình và chính sách</li>
              <li>✓ <strong>Linh hoạt:</strong> Học mọi lúc, mọi nơi theo lịch trình riêng</li>
              <li>✓ <strong>Công nghệ:</strong> Ứng dụng công nghệ hiện đại để nâng cao trải nghiệm học tập</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
