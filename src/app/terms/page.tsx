export default function Terms() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">Điều khoản sử dụng</h1>
        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-muted-foreground">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">1. Chấp nhận điều khoản</h2>
            <p className="text-muted-foreground">
              Khi sử dụng LopHoc.Online, bạn đồng ý tuân theo các điều khoản này. 
              Nếu không đồng ý, vui lòng không sử dụng dịch vụ của chúng tôi.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">2. Đăng ký tài khoản</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Bạn phải từ 13 tuổi trở lên để đăng ký (hoặc có sự đồng ý của phụ huynh)</li>
              <li>Thông tin đăng ký phải chính xác và đầy đủ</li>
              <li>Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu</li>
              <li>Không được chia sẻ tài khoản cho người khác</li>
              <li>Thông báo ngay nếu phát hiện tài khoản bị xâm nhập</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">3. Quy định cho học viên</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Đúng giờ tham gia lớp học đã đặt</li>
              <li>Tôn trọng gia sư và các học viên khác</li>
              <li>Không ghi âm, ghi hình buổi học mà không được phép</li>
              <li>Thanh toán đầy đủ và đúng hạn</li>
              <li>Hủy lịch học trước 24 giờ nếu có việc bận</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">4. Quy định cho gia sư</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Cung cấp thông tin bằng cấp và kinh nghiệm chính xác</li>
              <li>Đúng giờ và chuẩn bị kỹ lưỡng cho mỗi buổi học</li>
              <li>Giảng dạy chất lượng, tận tâm với học viên</li>
              <li>Không yêu cầu học viên thanh toán ngoài hệ thống</li>
              <li>Báo cáo tiến độ học tập của học viên</li>
              <li>Tuân thủ quy định về hành vi và đạo đức nghề nghiệp</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">5. Thanh toán và hoàn tiền</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Học phí được hiển thị rõ ràng trước khi đặt lịch</li>
              <li>Thanh toán qua QR code ngân hàng hoặc ví điện tử</li>
              <li>Hoàn tiền 100% nếu hủy trước 24 giờ</li>
              <li>Hoàn tiền 50% nếu hủy trong vòng 24 giờ</li>
              <li>Hoàn tiền 100% nếu gia sư không tham gia buổi học</li>
              <li>Không hoàn tiền nếu học viên vắng mặt không báo trước</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">6. Sở hữu trí tuệ</h2>
            <p className="text-muted-foreground">
              Tất cả nội dung trên LopHoc.Online (logo, thiết kế, văn bản) thuộc 
              quyền sở hữu của chúng tôi. Bạn không được sao chép, sửa đổi hoặc 
              phân phối mà không có sự cho phép.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">7. Hành vi bị cấm</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Sử dụng dịch vụ cho mục đích bất hợp pháp</li>
              <li>Đăng tải nội dung phản cảm, xúc phạm, spam</li>
              <li>Hack, phá hoại hệ thống</li>
              <li>Mạo danh người khác</li>
              <li>Thu thập thông tin người dùng trái phép</li>
            </ul>
            <p className="text-muted-foreground">
              Vi phạm có thể dẫn đến khóa tài khoản vĩnh viễn và xử lý pháp lý.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">8. Giới hạn trách nhiệm</h2>
            <p className="text-muted-foreground">
              LopHoc.Online là nền tảng kết nối. Chúng tôi không chịu trách nhiệm về:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Chất lượng giảng dạy của gia sư (tuy nhiên chúng tôi có chính sách đảm bảo)</li>
              <li>Kết quả học tập của học viên</li>
              <li>Tranh chấp giữa gia sư và học viên (chúng tôi sẽ hỗ trợ hòa giải)</li>
              <li>Sự cố kỹ thuật ngoài tầm kiểm soát</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">9. Thay đổi điều khoản</h2>
            <p className="text-muted-foreground">
              Chúng tôi có thể thay đổi điều khoản này. Thay đổi có hiệu lực sau 
              7 ngày kể từ khi thông báo. Việc tiếp tục sử dụng dịch vụ đồng nghĩa 
              với việc bạn chấp nhận điều khoản mới.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">10. Luật áp dụng</h2>
            <p className="text-muted-foreground">
              Điều khoản này tuân thủ pháp luật Việt Nam. Mọi tranh chấp sẽ được 
              giải quyết tại Tòa án có thẩm quyền tại Hà Nội.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold mt-8">11. Liên hệ</h2>
            <p className="text-muted-foreground">
              Nếu có thắc mắc về điều khoản sử dụng, vui lòng liên hệ:
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li>Email: legal@lophoc.online</li>
              <li>Hotline: 1900 xxxx</li>
              <li>Địa chỉ: Hà Nội, Việt Nam</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
