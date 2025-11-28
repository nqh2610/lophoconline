import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      question: "LopHoc.Online là gì?",
      answer: "LopHoc.Online là nền tảng kết nối giáo viên và học viên trực tuyến, giúp học viên dễ dàng tìm kiếm và học với các giáo viên chất lượng cao thông qua video call."
    },
    {
      question: "Làm thế nào để đăng ký làm giáo viên?",
      answer: "Bạn click vào nút 'Trở thành giáo viên', điền thông tin cá nhân, bằng cấp và kinh nghiệm. Chúng tôi sẽ xác thực hồ sơ trong vòng 24-48 giờ."
    },
    {
      question: "Học phí được tính như thế nào?",
      answer: "Học phí tính theo giờ và phụ thuộc vào trình độ, kinh nghiệm của giáo viên. Dao động từ 100.000đ - 500.000đ/giờ. Bạn chỉ thanh toán sau khi hoàn thành buổi học."
    },
    {
      question: "Có được học thử không?",
      answer: "Có! Buổi học thử đầu tiên hoàn toàn miễn phí (30 phút) để bạn đánh giá phương pháp giảng dạy của giáo viên và quyết định có tiếp tục hay không."
    },
    {
      question: "Thanh toán như thế nào?",
      answer: "Chúng tôi hỗ trợ thanh toán qua QR code ngân hàng (VietQR). Rất nhanh chóng, an toàn và không mất phí giao dịch."
    },
    {
      question: "Có thể hủy hoặc đổi lịch học không?",
      answer: "Có thể hủy hoặc đổi lịch học trước 24 giờ mà không mất phí. Nếu hủy trong vòng 24 giờ trước giờ học, bạn sẽ bị tính 50% học phí."
    },
    {
      question: "Nếu không hài lòng với buổi học thì sao?",
      answer: "Nếu bạn không hài lòng với buổi học đầu tiên (sau buổi học thử), chúng tôi sẽ hoàn lại 100% học phí và giúp bạn tìm giáo viên khác phù hợp hơn."
    },
    {
      question: "Cần những thiết bị gì để học trực tuyến?",
      answer: "Bạn cần máy tính/laptop/tablet có kết nối internet ổn định, camera và microphone. Chúng tôi khuyến nghị tốc độ internet tối thiểu 5 Mbps để đảm bảo chất lượng video call."
    },
    {
      question: "Giáo viên có được xác thực không?",
      answer: "Tất cả giáo viên đều phải qua quy trình xác thực bằng cấp, chứng chỉ và kinh nghiệm giảng dạy. Chúng tôi chỉ chấp nhận những giáo viên đạt tiêu chuẩn chất lượng."
    },
    {
      question: "Có hỗ trợ kỹ thuật không?",
      answer: "Chúng tôi có đội ngũ hỗ trợ kỹ thuật 24/7 qua chat, email và hotline để giải đáp mọi thắc mắc và xử lý sự cố trong quá trình học."
    }
  ];

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Câu hỏi thường gặp</h1>
          <p className="text-muted-foreground text-lg">
            Tìm câu trả lời cho những thắc mắc phổ biến
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Không tìm thấy câu trả lời?</h3>
          <p className="text-muted-foreground mb-4">
            Liên hệ với chúng tôi qua email: support@lophoc.online hoặc hotline: 1900 xxxx
          </p>
        </div>
      </div>
    </div>
  );
}
