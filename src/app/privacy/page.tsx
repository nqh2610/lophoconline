export default function Privacy() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Chính sách bảo mật</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">1. Thu thập thông tin</h2>
            <p className="text-muted-foreground">
              Chúng tôi thu thập các thông tin sau khi bạn sử dụng dịch vụ:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Thông tin cá nhân: họ tên, email, số điện thoại, địa chỉ</li>
              <li>Thông tin học tập: cấp lớp, môn học, mục tiêu học tập</li>
              <li>Thông tin thanh toán: lịch sử giao dịch, phương thức thanh toán</li>
              <li>Thông tin kỹ thuật: IP address, thiết bị, trình duyệt</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">2. Sử dụng thông tin</h2>
            <p className="text-muted-foreground">
              Thông tin của bạn được sử dụng để:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cung cấp và cải thiện dịch vụ</li>
              <li>Kết nối bạn với gia sư phù hợp</li>
              <li>Xử lý thanh toán và giao dịch</li>
              <li>Gửi thông báo về lịch học và cập nhật</li>
              <li>Hỗ trợ khách hàng và giải đáp thắc mắc</li>
              <li>Phân tích và cải thiện trải nghiệm người dùng</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">3. Chia sẻ thông tin</h2>
            <p className="text-muted-foreground">
              Chúng tôi chỉ chia sẻ thông tin của bạn với:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Gia sư được chọn (chỉ thông tin cần thiết để liên lạc và giảng dạy)</li>
              <li>Đối tác thanh toán (để xử lý giao dịch)</li>
              <li>Cơ quan pháp luật (khi có yêu cầu hợp pháp)</li>
            </ul>
            <p className="text-muted-foreground">
              Chúng tôi <strong>không bán</strong> thông tin cá nhân của bạn cho bên thứ ba.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">4. Bảo mật thông tin</h2>
            <p className="text-muted-foreground">
              Chúng tôi áp dụng các biện pháp bảo mật:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Mã hóa dữ liệu SSL/TLS</li>
              <li>Xác thực hai yếu tố (2FA)</li>
              <li>Kiểm tra bảo mật định kỳ</li>
              <li>Giới hạn quyền truy cập thông tin</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">5. Quyền của bạn</h2>
            <p className="text-muted-foreground">
              Bạn có quyền:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Truy cập và xem thông tin cá nhân</li>
              <li>Chỉnh sửa hoặc cập nhật thông tin</li>
              <li>Xóa tài khoản và dữ liệu liên quan</li>
              <li>Từ chối nhận email marketing</li>
              <li>Khiếu nại về việc xử lý dữ liệu</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">6. Cookie và theo dõi</h2>
            <p className="text-muted-foreground">
              Chúng tôi sử dụng cookie để cải thiện trải nghiệm người dùng. 
              Bạn có thể tắt cookie trong cài đặt trình duyệt, nhưng một số tính năng 
              có thể không hoạt động đầy đủ.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">7. Thay đổi chính sách</h2>
            <p className="text-muted-foreground">
              Chúng tôi có thể cập nhật chính sách này. Mọi thay đổi quan trọng 
              sẽ được thông báo qua email hoặc trên website.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">8. Liên hệ</h2>
            <p className="text-muted-foreground">
              Nếu có thắc mắc về chính sách bảo mật, vui lòng liên hệ:
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li>Email: privacy@lophoc.online</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Địa chỉ: Hà Nội, Việt Nam</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
