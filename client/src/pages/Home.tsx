import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { TutorCard } from "@/components/TutorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { FeatureCard } from "@/components/FeatureCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Shield, 
  Clock, 
  DollarSign, 
  Search, 
  UserCheck,
  CheckCircle2,
  Users,
  GraduationCap,
  Award
} from "lucide-react";

import tutor1Avatar from '@assets/stock_images/vietnamese_female_te_395ea66e.jpg';
import tutor2Avatar from '@assets/stock_images/vietnamese_male_teac_91dbce7c.jpg';
import tutor3Avatar from '@assets/stock_images/asian_young_student__05aa4baa.jpg';
import tutor4Avatar from '@assets/stock_images/vietnamese_female_te_513f7461.jpg';
import tutor5Avatar from '@assets/stock_images/vietnamese_male_teac_12f7c494.jpg';
import tutor6Avatar from '@assets/stock_images/vietnamese_female_te_727f8381.jpg';

export default function Home() {
  const mockTutors = [
    {
      id: '1',
      name: 'Nguyễn Thị Mai',
      avatar: tutor1Avatar,
      subjects: [
        { name: 'Toán', grades: 'lớp 10-12' },
        { name: 'Lý', grades: 'lớp 10-12' }
      ],
      rating: 4.9,
      reviewCount: 128,
      hourlyRate: 200000,
      experience: '5 năm kinh nghiệm dạy THPT',
      verified: true,
      hasVideo: true,
      occupation: 'teacher' as const,
      availableSlots: ['T2, T4, T6 (19h-21h)', 'T7, CN (14h-20h)']
    },
    {
      id: '2',
      name: 'Trần Văn Hùng',
      avatar: tutor2Avatar,
      subjects: [
        { name: 'Tiếng Anh', grades: 'IELTS 6.5+' },
        { name: 'Tiếng Anh', grades: 'giao tiếp' }
      ],
      rating: 5.0,
      reviewCount: 95,
      hourlyRate: 250000,
      experience: '7 năm kinh nghiệm IELTS, TOEFL',
      verified: true,
      hasVideo: true,
      occupation: 'professional' as const,
      availableSlots: ['T3, T5, T7 (18h-21h)', 'CN (9h-18h)']
    },
    {
      id: '3',
      name: 'Lê Minh Tú',
      avatar: tutor3Avatar,
      subjects: [
        { name: 'Toán', grades: 'lớp 6-9' },
        { name: 'Vật Lý', grades: 'lớp 8-9' }
      ],
      rating: 4.7,
      reviewCount: 76,
      hourlyRate: 120000,
      experience: '3 năm dạy THCS',
      verified: true,
      hasVideo: true,
      occupation: 'student' as const,
      availableSlots: ['T2-T6 (17h-20h)', 'T7 (14h-18h)']
    },
    {
      id: '4',
      name: 'Phạm Thu Hà',
      avatar: tutor4Avatar,
      subjects: [
        { name: 'Hóa học', grades: 'lớp 10-12' },
        { name: 'Sinh học', grades: 'lớp 10-12' }
      ],
      rating: 4.8,
      reviewCount: 54,
      hourlyRate: 180000,
      experience: '4 năm kinh nghiệm, chuyên luyện thi ĐH',
      verified: true,
      hasVideo: true,
      occupation: 'teacher' as const,
      availableSlots: ['T2, T4, T6 (18h-21h)', 'T7 (15h-19h)']
    },
    {
      id: '5',
      name: 'Hoàng Đức Anh',
      avatar: tutor5Avatar,
      subjects: [
        { name: 'Văn', grades: 'lớp 10-12' },
        { name: 'Sử', grades: 'lớp 10-12' },
        { name: 'Địa', grades: 'lớp 10-12' }
      ],
      rating: 4.6,
      reviewCount: 42,
      hourlyRate: 140000,
      experience: '6 năm dạy THPT, chuyên khối C',
      verified: true,
      hasVideo: true,
      occupation: 'teacher' as const,
      availableSlots: ['T3, T5 (19h-21h)', 'CN (9h-17h)']
    },
    {
      id: '6',
      name: 'Đỗ Lan Anh',
      avatar: tutor6Avatar,
      subjects: [
        { name: 'Tiếng Anh', grades: 'lớp 1-9' },
        { name: 'Tiếng Anh', grades: 'TOEIC' }
      ],
      rating: 4.9,
      reviewCount: 210,
      hourlyRate: 230000,
      experience: '10 năm kinh nghiệm, chứng chỉ TESOL',
      verified: true,
      hasVideo: true,
      occupation: 'professional' as const,
      availableSlots: ['T2-T6 (18h-20h)', 'T7, CN (9h-20h)']
    },
  ];

  return (
    <div className="min-h-screen">
      <HeroSection />

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Tại sao chọn LopHoc.Online?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nền tảng học trực tuyến hiện đại với đầy đủ tính năng hỗ trợ quá trình học tập
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Video}
              title="Học trực tuyến"
              description="Lớp học video call chất lượng cao, tương tác trực tiếp với gia sư"
            />
            <FeatureCard
              icon={Shield}
              title="Gia sư đã xác thực"
              description="Tất cả gia sư đều được kiểm tra bằng cấp và kinh nghiệm"
            />
            <FeatureCard
              icon={Clock}
              title="Linh hoạt thời gian"
              description="Lựa chọn thời gian học phù hợp với lịch trình của bạn"
            />
            <FeatureCard
              icon={DollarSign}
              title="Minh bạch học phí"
              description="Thanh toán qua QR code, không phí ẩn, hoàn tiền nếu không hài lòng"
            />
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">10,000+</div>
              <div className="text-sm text-muted-foreground">Học viên</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">5,000+</div>
              <div className="text-sm text-muted-foreground">Gia sư</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">50,000+</div>
              <div className="text-sm text-muted-foreground">Buổi học hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">4.8/5</div>
              <div className="text-sm text-muted-foreground">Đánh giá trung bình</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Cách thức hoạt động</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Chỉ 3 bước đơn giản để bắt đầu học với gia sư chất lượng
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  1
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tìm gia sư</h3>
              <p className="text-muted-foreground">
                Tìm kiếm gia sư phù hợp với nhu cầu học tập của bạn
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  2
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <UserCheck className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Đặt lịch học</h3>
              <p className="text-muted-foreground">
                Chọn thời gian phù hợp và đặt buổi học thử miễn phí
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                  3
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <Video className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bắt đầu học</h3>
              <p className="text-muted-foreground">
                Tham gia lớp học trực tuyến và nâng cao kiến thức
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tutors Section */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-80 shrink-0">
              <FilterPanel />
            </aside>

            <main className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Gia sư nổi bật</h2>
                  <p className="text-sm text-muted-foreground">
                    {mockTutors.length} gia sư được tìm thấy
                  </p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-sort">
                  Sắp xếp: Đề xuất
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockTutors.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button variant="outline" data-testid="button-load-more">
                  Xem thêm gia sư
                </Button>
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Học viên nói gì về chúng tôi</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Hàng nghìn học viên đã đạt được kết quả học tập tốt với LopHoc.Online
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TestimonialCard
              name="Nguyễn Minh Anh"
              role="Học sinh lớp 12"
              avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=testimonial1"
              content="Nhờ thầy Hùng dạy mà em đã đạt 8.5 IELTS. Thầy dạy rất tâm huyết và có phương pháp học hiệu quả."
              rating={5}
            />
            <TestimonialCard
              name="Trần Thị Lan"
              role="Phụ huynh"
              avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=testimonial2"
              content="Con tôi học Toán với cô Mai được 3 tháng, điểm số cải thiện rõ rệt. Cô rất nhiệt tình và chu đáo."
              rating={5}
            />
            <TestimonialCard
              name="Lê Hoàng Nam"
              role="Học sinh lớp 10"
              avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=testimonial3"
              content="Nền tảng rất tiện lợi, dễ sử dụng. Em có thể học mọi lúc mọi nơi với gia sư chất lượng."
              rating={4}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Bắt đầu hành trình học tập</h2>
            <p className="text-muted-foreground mb-8">
              Tìm gia sư phù hợp, học thử miễn phí và bắt đầu học ngay hôm nay
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" data-testid="button-cta-student">
                Tìm gia sư ngay
              </Button>
              <Button size="lg" variant="outline" data-testid="button-cta-tutor">
                Trở thành gia sư
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
