"use client";

import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTutors } from "@/hooks/use-tutors";
import { HeroSection } from "@/components/HeroSection";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Video,
  Shield,
  Clock,
  DollarSign,
  Users,
  GraduationCap,
  CheckCircle2,
  Award,
  Loader2
} from "lucide-react";

// Lazy load non-critical components
const TutorCard = dynamic(() => import("@/components/TutorCard").then(mod => ({ default: mod.TutorCard })), {
  loading: () => null,
  ssr: false
});
const FeatureCard = dynamic(() => import("@/components/FeatureCard").then(mod => ({ default: mod.FeatureCard })), {
  ssr: true
});
const TestimonialCard = dynamic(() => import("@/components/TestimonialCard").then(mod => ({ default: mod.TestimonialCard })), {
  loading: () => null,
  ssr: false
});

export default function HomePage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [shouldLoadTutors, setShouldLoadTutors] = useState(false);

  // Handle login required or unauthorized errors
  useEffect(() => {
    const loginRequired = searchParams.get("login");
    const error = searchParams.get("error");

    if (loginRequired === "required") {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để truy cập trang này",
        variant: "destructive",
      });
    } else if (error === "unauthorized") {
      toast({
        title: "Không có quyền truy cập",
        description: "Bạn không có quyền truy cập trang này",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  // Intersection Observer - Load tutors when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoadTutors(true);
        }
      },
      { rootMargin: '200px' } // Load 200px before visible
    );

    const tutorSection = document.getElementById('tutors-section');
    if (tutorSection) {
      observer.observe(tutorSection);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch top tutors with enriched data (subjects + time slots) in ONE request
  const { data: enrichedTutors = [], isLoading } = useTutors(
    {
      sortBy: 'rating',
      sortOrder: 'desc',
      limit: 8
    },
    {
      enabled: shouldLoadTutors, // Only fetch when section is visible
      staleTime: 60 * 1000, // Cache for 60s on homepage
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 mins
    }
  );

  // Transform tutor data for TutorCard
  const featuredTutors = useMemo(() => {
    return enrichedTutors.map((tutor: any) => {
      return {
        id: tutor.id.toString(),
        name: tutor.fullName,
        avatar: tutor.avatar || '/images/default-avatar.jpg',
        subjects: tutor.subjects || [],
        tutorSubjects: tutor.tutorSubjects || [],
        rating: (tutor.rating || 0) / 10, // Convert from 0-50 to 0-5.0
        reviewCount: tutor.totalReviews || 0,
        hourlyRate: tutor.hourlyRate,
        experience: tutor.experience || 0, // Pass raw number - component will format
        verified: tutor.verificationStatus === 'verified',
        hasVideo: !!tutor.videoIntro,
        occupation: tutor.occupation, // Pass occupation object directly
        availableSlots: tutor.timeSlots || []
      };
    });
  }, [enrichedTutors]);

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
              description="Lớp học video call chất lượng cao, tương tác trực tiếp với giáo viên"
            />
            <FeatureCard
              icon={Shield}
              title="Giáo viên đã xác thực"
              description="Tất cả giáo viên đều được kiểm tra bằng cấp và kinh nghiệm"
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
      <section className="py-12 bg-primary/5">
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
              <div className="text-sm text-muted-foreground">Giáo viên</div>
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

      {/* Tutors Section */}
      <section id="tutors-section" className="py-8 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Giáo viên nổi bật</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Khám phá các giáo viên hàng đầu với kinh nghiệm và chuyên môn được xác thực
            </p>
          </div>

          {isLoading ? null : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredTutors.slice(0, 8).map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} tutorSubjects={tutor.tutorSubjects || []} />
                ))}
              </div>

              <div className="mt-12 flex justify-center">
                <Link href="/tutors" prefetch={true}>
                  <Button size="lg" data-testid="button-view-all-tutors">
                    Xem tất cả giáo viên
                  </Button>
                </Link>
              </div>
            </>
          )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
          </div>
        </div>
      </section>

      {/* FAQ/Support Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Còn thắc mắc?</h2>
            <p className="text-muted-foreground">
              Đội ngũ hỗ trợ của chúng tôi luôn sẵn sàng giúp bạn 24/7
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-background rounded-lg p-6 text-center border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Học thử miễn phí</h3>
              <p className="text-sm text-muted-foreground">
                Trải nghiệm buổi học đầu tiên hoàn toàn miễn phí
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 text-center border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Thanh toán an toàn</h3>
              <p className="text-sm text-muted-foreground">
                Hệ thống thanh toán được mã hóa và bảo mật tuyệt đối
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 text-center border">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Hỗ trợ 24/7</h3>
              <p className="text-sm text-muted-foreground">
                Liên hệ với chúng tôi bất cứ lúc nào bạn cần
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
