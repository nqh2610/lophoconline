import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Award, 
  Trophy, 
  Star, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Target,
  ArrowLeft,
  Crown,
  Zap
} from "lucide-react";
import Link from "next/link";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: any;
  unlocked: boolean;
  progress?: number;
  total?: number;
};

const achievements: Achievement[] = [
  {
    id: '1',
    title: 'Giáo viên mới',
    description: 'Hoàn thành buổi học đầu tiên',
    icon: Award,
    unlocked: true
  },
  {
    id: '2',
    title: 'Người dẫn đường',
    description: 'Dạy 10 học sinh',
    icon: Users,
    unlocked: true,
    progress: 10,
    total: 10
  },
  {
    id: '3',
    title: 'Chuyên gia',
    description: 'Đạt 50 giờ dạy',
    icon: BookOpen,
    unlocked: true,
    progress: 50,
    total: 50
  },
  {
    id: '4',
    title: 'Sao 5 sao',
    description: 'Duy trì rating 4.8+ trong 3 tháng',
    icon: Star,
    unlocked: false,
    progress: 2,
    total: 3
  },
  {
    id: '5',
    title: 'Siêu sao',
    description: 'Dạy 100 học sinh',
    icon: Trophy,
    unlocked: false,
    progress: 32,
    total: 100
  },
];

export default function TutorReputation() {
  const stats = {
    totalStudents: 32,
    totalHours: 156,
    averageRating: 4.9,
    totalEarnings: 46800000,
    completionRate: 98,
    responseTime: '< 2 giờ',
    successRate: 95,
    repeatStudents: 78
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const achievementProgress = (unlockedAchievements / achievements.length) * 100;

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="heading-reputation">
                Uy tín và thành tích
              </h1>
              <p className="text-muted-foreground mt-2">
                Theo dõi thành tích và xây dựng uy tín của bạn
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Cấp độ</p>
                <p className="text-2xl font-bold">Pro</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng học sinh</p>
                  <p className="text-3xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Giờ dạy</p>
                  <p className="text-3xl font-bold">{stats.totalHours}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đánh giá TB</p>
                  <div className="flex items-center gap-1">
                    <p className="text-3xl font-bold">{stats.averageRating}</p>
                    <Star className="h-5 w-5 fill-primary text-primary" />
                  </div>
                </div>
                <Star className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thu nhập</p>
                  <p className="text-2xl font-bold">{(stats.totalEarnings / 1000000).toFixed(1)}M VNĐ</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Performance Metrics */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Chỉ số hiệu suất
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tỷ lệ hoàn thành</span>
                  <span className="text-sm font-bold">{stats.completionRate}%</span>
                </div>
                <Progress value={stats.completionRate} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Tỷ lệ thành công</span>
                  <span className="text-sm font-bold">{stats.successRate}%</span>
                </div>
                <Progress value={stats.successRate} />
                <p className="text-xs text-muted-foreground mt-1">
                  Học sinh đạt mục tiêu sau khóa học
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Học sinh quay lại</span>
                  <span className="text-sm font-bold">{stats.repeatStudents}%</span>
                </div>
                <Progress value={stats.repeatStudents} />
                <p className="text-xs text-muted-foreground mt-1">
                  Tỷ lệ học sinh đăng ký học tiếp
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Thời gian phản hồi</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.responseTime}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Tăng trưởng tháng này</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">+24%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Thành tích
              </CardTitle>
              <CardDescription>
                {unlockedAchievements} / {achievements.length} đã mở khóa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Progress value={achievementProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {achievementProgress.toFixed(0)}% hoàn thành
                </p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {achievements.map(achievement => {
                  const Icon = achievement.icon;
                  return (
                    <div 
                      key={achievement.id}
                      className={`p-3 rounded-lg border ${
                        achievement.unlocked 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-muted/50 border-border opacity-60'
                      }`}
                      data-testid={`achievement-${achievement.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{achievement.title}</p>
                            {achievement.unlocked && (
                              <Badge variant="secondary" className="h-5 text-xs">
                                Đã mở
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          {!achievement.unlocked && achievement.progress !== undefined && (
                            <div>
                              <Progress 
                                value={(achievement.progress / achievement.total!) * 100} 
                                className="h-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                {achievement.progress} / {achievement.total}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Tiếp tục xây dựng uy tín</h3>
                <p className="text-sm text-muted-foreground">
                  Dạy thêm học sinh và nhận được nhiều đánh giá tích cực để nâng cao thứ hạng
                </p>
              </div>
              <Link href="/tutor/trial-requests">
                <Button data-testid="button-view-requests">
                  Xem yêu cầu mới
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
