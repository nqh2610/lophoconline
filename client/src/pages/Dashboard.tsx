import { Calendar, Clock, DollarSign, Users } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { LessonCard } from "@/components/LessonCard";
import { ReviewCard } from "@/components/ReviewCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const mockLessons = [
    {
      id: '1',
      tutorName: 'Nguyễn Văn A',
      tutorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
      subject: 'Toán lớp 10',
      date: '15/10/2025',
      time: '19:00 - 20:00',
      status: 'confirmed' as const,
      price: 150000,
    },
    {
      id: '2',
      tutorName: 'Trần Thị B',
      tutorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
      subject: 'Tiếng Anh',
      date: '16/10/2025',
      time: '18:00 - 19:00',
      status: 'pending' as const,
      price: 200000,
    },
    {
      id: '3',
      tutorName: 'Lê Văn C',
      tutorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
      subject: 'Vật lý',
      date: '12/10/2025',
      time: '20:00 - 21:00',
      status: 'completed' as const,
      price: 120000,
    },
  ];

  const mockReviews = [
    {
      id: '1',
      studentName: 'Trần Thị B',
      studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
      rating: 5,
      comment: 'Giáo viên dạy rất nhiệt tình và dễ hiểu. Con em đã hiểu bài hơn rất nhiều.',
      date: '10/10/2025',
      subject: 'Toán lớp 10',
    },
    {
      id: '2',
      studentName: 'Nguyễn Văn C',
      studentAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2',
      rating: 4,
      comment: 'Bài giảng chi tiết, phương pháp dạy hiệu quả.',
      date: '08/10/2025',
      subject: 'Hóa học',
    },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Theo dõi tiến trình học tập của bạn</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Buổi học tháng này"
            value="24"
            icon={Calendar}
            trend="+12% so với tháng trước"
            testId="stat-lessons"
          />
          <StatsCard
            title="Giờ học tích lũy"
            value="156"
            icon={Clock}
            testId="stat-hours"
          />
          <StatsCard
            title="Chi phí tháng này"
            value="3.6M"
            icon={DollarSign}
            testId="stat-spending"
          />
          <StatsCard
            title="Gia sư đang học"
            value="3"
            icon={Users}
            testId="stat-tutors"
          />
        </div>

        <Tabs defaultValue="lessons" className="space-y-6">
          <TabsList>
            <TabsTrigger value="lessons" data-testid="tab-lessons">
              Lịch học
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              Đánh giá
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockLessons.map((lesson) => (
                <LessonCard key={lesson.id} {...lesson} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockReviews.map((review) => (
                <ReviewCard key={review.id} {...review} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
