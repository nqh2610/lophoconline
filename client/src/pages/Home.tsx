import { useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { TutorCard } from "@/components/TutorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const mockTutors = [
    {
      id: '1',
      name: 'Nguyễn Văn A',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
      subjects: ['Toán', 'Lý', 'Hóa'],
      rating: 4.8,
      reviewCount: 128,
      hourlyRate: 150000,
      experience: '5 năm kinh nghiệm dạy THPT',
      verified: true,
      hasVideo: true,
    },
    {
      id: '2',
      name: 'Trần Thị B',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
      subjects: ['Tiếng Anh', 'Văn'],
      rating: 4.9,
      reviewCount: 95,
      hourlyRate: 200000,
      experience: '7 năm kinh nghiệm IELTS',
      verified: true,
      hasVideo: true,
    },
    {
      id: '3',
      name: 'Lê Văn C',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
      subjects: ['Toán', 'Vật Lý'],
      rating: 4.7,
      reviewCount: 76,
      hourlyRate: 120000,
      experience: '3 năm dạy THCS',
      verified: false,
      hasVideo: true,
    },
    {
      id: '4',
      name: 'Phạm Thị D',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
      subjects: ['Hóa học', 'Sinh học'],
      rating: 4.6,
      reviewCount: 54,
      hourlyRate: 180000,
      experience: '4 năm kinh nghiệm',
      verified: true,
      hasVideo: false,
    },
    {
      id: '5',
      name: 'Hoàng Văn E',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=5',
      subjects: ['Văn', 'Sử', 'Địa'],
      rating: 4.5,
      reviewCount: 42,
      hourlyRate: 140000,
      experience: '6 năm dạy THPT',
      verified: true,
      hasVideo: true,
    },
    {
      id: '6',
      name: 'Đỗ Thị F',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=6',
      subjects: ['Tiếng Anh'],
      rating: 5.0,
      reviewCount: 210,
      hourlyRate: 250000,
      experience: '10 năm kinh nghiệm TOEFL',
      verified: true,
      hasVideo: true,
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
