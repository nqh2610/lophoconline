import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { TutorCard } from "@/components/TutorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";

import tutor1Avatar from '@assets/stock_images/vietnamese_female_te_395ea66e.jpg';
import tutor2Avatar from '@assets/stock_images/vietnamese_male_teac_91dbce7c.jpg';
import tutor3Avatar from '@assets/stock_images/asian_young_student__05aa4baa.jpg';
import tutor4Avatar from '@assets/stock_images/vietnamese_female_te_513f7461.jpg';
import tutor5Avatar from '@assets/stock_images/vietnamese_male_teac_12f7c494.jpg';
import tutor6Avatar from '@assets/stock_images/vietnamese_female_te_727f8381.jpg';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);

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

      <section className="py-12">
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

      <section className="py-16 bg-muted/50">
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
