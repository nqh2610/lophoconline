"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, ThumbsUp, MessageSquare, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Review = {
  id: string;
  studentName: string;
  studentAvatar?: string;
  rating: number;
  subject: string;
  comment: string;
  date: string;
  helpfulCount: number;
};

const mockReviews: Review[] = [
  {
    id: '1',
    studentName: 'Nguyễn Văn A',
    rating: 5,
    subject: 'Toán',
    comment: 'Thầy dạy rất dễ hiểu, giải thích kỹ từng bước. Em đã tiến bộ rất nhiều sau 1 tháng học.',
    date: '2 ngày trước',
    helpfulCount: 12
  },
  {
    id: '2',
    studentName: 'Trần Thị B',
    rating: 5,
    subject: 'IELTS',
    comment: 'Cô nhiệt tình, phương pháp học hiệu quả. Em đã đạt 7.5 IELTS sau 3 tháng học với cô.',
    date: '1 tuần trước',
    helpfulCount: 8
  },
  {
    id: '3',
    studentName: 'Lê Văn C',
    rating: 4,
    subject: 'Vật Lý',
    comment: 'Thầy giảng bài hay, nhưng đôi khi hơi nhanh. Tuy nhiên em vẫn học được nhiều.',
    date: '2 tuần trước',
    helpfulCount: 5
  },
];

export default function TutorFeedback() {
  const [reviews] = useState<Review[]>(mockReviews);

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: (reviews.filter(r => r.rating === star).length / reviews.length) * 100
  }));

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-feedback">
            Đánh giá và phản hồi
          </h1>
          <p className="text-muted-foreground mt-2">
            Xem đánh giá từ học sinh và cải thiện chất lượng dạy học
          </p>
        </div>

        {/* Rating Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="h-8 w-8 fill-primary text-primary" />
                  <p className="text-4xl font-bold">{averageRating.toFixed(1)}</p>
                </div>
                <p className="text-sm text-muted-foreground">Điểm trung bình</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Từ {reviews.length} đánh giá
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ThumbsUp className="h-8 w-8 text-primary" />
                  <p className="text-4xl font-bold">
                    {((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100).toFixed(0)}%
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Đánh giá tích cực</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reviews.filter(r => r.rating >= 4).length} / {reviews.length} đánh giá
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <p className="text-4xl font-bold">+12%</p>
                </div>
                <p className="text-sm text-muted-foreground">Tăng trưởng</p>
                <p className="text-xs text-muted-foreground mt-1">So với tháng trước</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Rating Distribution */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Phân bố đánh giá</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 min-w-[80px]">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="h-4 w-4 fill-primary text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                    {count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reviews List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Đánh giá từ học sinh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Tất cả ({reviews.length})</TabsTrigger>
                  <TabsTrigger value="positive">Tích cực ({reviews.filter(r => r.rating >= 4).length})</TabsTrigger>
                  <TabsTrigger value="negative">Cần cải thiện ({reviews.filter(r => r.rating < 4).length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4 mt-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b pb-4 last:border-0" data-testid={`review-${review.id}`}>
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={review.studentAvatar} />
                          <AvatarFallback>{review.studentName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{review.studentName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < review.rating
                                          ? 'fill-primary text-primary'
                                          : 'text-muted-foreground'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <Badge variant="outline">{review.subject}</Badge>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{review.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{review.comment}</p>
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" className="h-8">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Hữu ích ({review.helpfulCount})
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="positive" className="space-y-4 mt-4">
                  {reviews.filter(r => r.rating >= 4).map(review => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={review.studentAvatar} />
                          <AvatarFallback>{review.studentName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{review.studentName}</p>
                          <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="negative" className="space-y-4 mt-4">
                  {reviews.filter(r => r.rating < 4).length > 0 ? (
                    reviews.filter(r => r.rating < 4).map(review => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage src={review.studentAvatar} />
                            <AvatarFallback>{review.studentName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{review.studentName}</p>
                            <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      Tuyệt vời! Chưa có đánh giá tiêu cực nào.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
