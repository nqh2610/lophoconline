"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTutors } from "@/hooks/use-tutors";
import { HeroSection } from "@/components/HeroSection";
import { TutorCard } from "@/components/TutorCard";
import { FeatureCard } from "@/components/FeatureCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Video,
  Shield,
  Clock,
  DollarSign,
  Users,
  GraduationCap,
  CheckCircle2,
  Award,
  LayoutDashboard,
  Search,
  Calendar,
  Star,
  BookOpen,
  TrendingUp
} from "lucide-react";

export default function HomePage() {
  const { data: session } = useSession();
  const [tutorTimeSlots, setTutorTimeSlots] = useState<Record<number, any[]>>({});
  const [tutorSubjects, setTutorSubjects] = useState<Record<number, any[]>>({});

  // Fetch top tutors from API
  const { data: tutorsData = [], isLoading: isLoadingTutors } = useTutors({
    sortBy: 'rating',
    sortOrder: 'desc',
    limit: 8
  });

  // Fetch time slots and subjects for all tutors
  useEffect(() => {
    async function fetchTutorDetails() {
      if (tutorsData.length === 0) return;

      const slotsMap: Record<number, any[]> = {};
      const subjectsMap: Record<number, any[]> = {};

      await Promise.all(
        tutorsData.map(async (tutor) => {
          try {
            // Fetch time slots
            const slotsResponse = await fetch(`/api/time-slots?tutorId=${tutor.id}`);
            if (slotsResponse.ok) {
              const slots = await slotsResponse.json();
              slotsMap[tutor.id] = slots;
            }

            // Fetch tutor-subject relationships
            const subjectsResponse = await fetch(`/api/tutor-subjects?tutorId=${tutor.id}`);
            if (subjectsResponse.ok) {
              const subjectsData = await subjectsResponse.json();
              subjectsMap[tutor.id] = subjectsData;
            }
          } catch (error) {
            console.error(`Error fetching details for tutor ${tutor.id}:`, error);
          }
        })
      );

      setTutorTimeSlots(slotsMap);
      setTutorSubjects(subjectsMap);
    }

    fetchTutorDetails();
  }, [tutorsData]);

  // Transform tutor data for TutorCard
  const featuredTutors = useMemo(() => {
    return tutorsData.map((tutor) => {
      // Get subjects from tutor-subjects relationships
      const tutorSubjectData = tutorSubjects[tutor.id] || [];

      // Group by subject name and collect unique categories or grade levels
      const subjectGroups = tutorSubjectData.reduce((acc: any, ts: any) => {
        if (!acc[ts.subjectName]) {
          acc[ts.subjectName] = new Set<string>();
        }
        // For category "Khác", show specific grade level instead
        if (ts.category === 'Khác') {
          acc[ts.subjectName].add(ts.gradeLevelName);
        } else {
          acc[ts.subjectName].add(ts.category);
        }
        return acc;
      }, {});

      const subjects = Object.entries(subjectGroups).map(([name, items]: [string, any]) => ({
        name,
        grades: Array.from(items).join(', ')
      }));

      // Map occupation to the expected type
      let occupation: 'student' | 'teacher' | 'professional' | 'tutor' = 'tutor';
      if (tutor.occupation === 'Sinh viên') occupation = 'student';
      else if (tutor.occupation === 'Giáo viên') occupation = 'teacher';
      else if (tutor.occupation === 'Chuyên gia') occupation = 'professional';

      // Get time slots for this tutor
      const timeSlots = tutorTimeSlots[tutor.id] || [];

      return {
        id: tutor.id.toString(),
        name: tutor.fullName,
        avatar: tutor.avatar || '/images/default-avatar.jpg',
        subjects,
        rating: (tutor.rating || 0) / 10, // Convert from 0-50 to 0-5.0
        reviewCount: tutor.totalReviews || 0,
        hourlyRate: tutor.hourlyRate,
        experience: `${tutor.experience} năm kinh nghiệm`,
        verified: tutor.verificationStatus === 'verified',
        hasVideo: !!tutor.videoIntro,
        occupation,
        availableSlots: timeSlots
      };
    });
  }, [tutorsData, tutorTimeSlots, tutorSubjects]);

  return (
    <div className="min-h-screen">
      {session?.user ? (
        // Welcome section for logged-in users
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-2" data-testid="text-welcome-greeting">
                Xin chào, {session.user.name}!
              </h1>
              <p className="text-muted-foreground text-lg">
                Chào mừng bạn quay trở lại. Hãy bắt đầu hành trình học tập của bạn ngay hôm nay.
              </p>
            </div>

            {/* Quick Access Menu */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <Link href="/dashboard">
                <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid="card-dashboard">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Dashboard</CardTitle>
                        <CardDescription>Xem tổng quan học tập</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Theo dõi tiến trình, lịch học và thống kê của bạn
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/tutors">
                <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid="card-find-tutors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Search className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Tìm gia sư</CardTitle>
                        <CardDescription>Khám phá gia sư phù hợp</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Tìm kiếm và đặt buổi học với các gia sư chuyên nghiệp
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard">
                <Card className="hover-elevate active-elevate-2 cursor-pointer transition-all" data-testid="card-schedule">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Lịch học</CardTitle>
                        <CardDescription>Quản lý thời gian biểu</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Xem lịch học sắp tới và quản lý các buổi học
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Additional Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card data-testid="card-stat-progress">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tiến độ tháng này</p>
                      <p className="text-2xl font-bold">24 buổi học</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-rating">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Đánh giá trung bình</p>
                      <p className="text-2xl font-bold">4.8/5.0</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-stat-hours">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Giờ học tích lũy</p>
                      <p className="text-2xl font-bold">156 giờ</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      ) : (
        <HeroSection />
      )}

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

      {/* Tutors Section */}
      <section className="py-8 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Gia sư nổi bật</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Khám phá các gia sư hàng đầu với kinh nghiệm và chuyên môn được xác thực
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTutors.slice(0, 8).map((tutor) => (
              <TutorCard key={tutor.id} {...tutor} />
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Link href="/tutors">
              <Button size="lg" data-testid="button-view-all-tutors">
                Xem tất cả gia sư
              </Button>
            </Link>
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

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Bắt đầu hành trình học tập</h2>
            <p className="text-muted-foreground mb-8">
              Tìm gia sư phù hợp, học thử miễn phí và bắt đầu học ngay hôm nay
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tutors">
                <Button size="lg" data-testid="button-cta-student">
                  Tìm gia sư ngay
                </Button>
              </Link>
              <Link href="/for-tutors">
                <Button size="lg" variant="outline" data-testid="button-cta-tutor">
                  Trở thành gia sư
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
