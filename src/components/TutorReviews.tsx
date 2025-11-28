"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  Loader2,
  AlertCircle,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  studentId: number;
  tutorReply?: string;
  tutorReplyAt?: string;
  helpful?: number;
  student?: {
    fullName: string;
    avatar: string | null;
  };
}

interface TutorReviewsProps {
  tutorId: number;
  initialReviews?: Review[];
}

const REVIEWS_PER_PAGE = 5;

export function TutorReviews({ tutorId, initialReviews }: TutorReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews || []);
  const [isLoading, setIsLoading] = useState(!initialReviews);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialReviews) {
      fetchReviews();
    }
  }, [tutorId, initialReviews]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reviews?tutorId=${tutorId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reviews');
      }

      const data = await response.json();
      setReviews(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim() || replyText.trim().length < 10) {
      alert('Vui lòng nhập phản hồi (tối thiểu 10 ký tự)');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit reply');
      }

      // Refresh reviews
      await fetchReviews();
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      console.error('Error submitting reply:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate rating statistics
  const ratingStats = reviews.reduce((acc, review) => {
    const rating = Math.round(review.rating / 10); // Convert 0-100 to 0-10, then round
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length / 10
    : 0;

  // Filter and sort reviews
  const filteredReviews = reviews.filter(review => {
    if (filterRating === null) return true;
    return Math.round(review.rating / 10) === filterRating;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return (b.helpful || 0) - (a.helpful || 0);
    }
  });

  const displayedReviews = sortedReviews.slice(0, page * REVIEWS_PER_PAGE);
  const hasMore = sortedReviews.length > displayedReviews.length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    const stars = Math.round(rating / 10);
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Đánh giá từ học sinh</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Chưa có đánh giá nào</p>
          <p className="text-sm text-muted-foreground mt-2">
            Hãy là người đầu tiên đánh giá giáo viên này!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đánh giá từ học sinh</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Rating Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8 pb-8 border-b">
          {/* Average Rating */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {renderStars(averageRating * 10)}
            </div>
            <p className="text-sm text-muted-foreground">
              {reviews.length} đánh giá
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="md:col-span-2 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingStats[stars] || 0;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;

              return (
                <div key={stars} className="flex items-center gap-3">
                  <button
                    onClick={() => setFilterRating(filterRating === stars ? null : stars)}
                    className={`flex items-center gap-1 text-sm hover:text-primary transition-colors ${
                      filterRating === stars ? 'text-primary font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    <span>{stars}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </button>
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter and Sort */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {filterRating && (
              <Badge variant="secondary" className="gap-1">
                {filterRating} sao
                <button
                  onClick={() => setFilterRating(null)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {filteredReviews.length} đánh giá
            </span>
          </div>

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'recent' | 'helpful')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recent" className="text-xs">Mới nhất</TabsTrigger>
              <TabsTrigger value="helpful" className="text-xs">Hữu ích</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Reviews List */}
        <div className="space-y-6">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={review.student?.avatar || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">
                        {review.student?.fullName || 'Học sinh'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    {renderStars(review.rating)}
                  </div>

                  <p className="text-sm mb-3">{review.comment}</p>

                  {/* Tutor Reply */}
                  {review.tutorReply && (
                    <div className="bg-muted p-4 rounded-lg mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Phản hồi từ giáo viên</span>
                        {review.tutorReplyAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.tutorReplyAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{review.tutorReply}</p>
                    </div>
                  )}

                  {/* Reply Form (only shown when replyingTo matches) */}
                  {replyingTo === review.id && !review.tutorReply && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Nhập phản hồi của bạn (tối thiểu 10 ký tự)..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={3}
                        className={replyText.trim().length > 0 && replyText.trim().length < 10 ? 'border-destructive' : ''}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {replyText.trim().length}/10 ký tự
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText("");
                            }}
                            disabled={isSubmitting}
                          >
                            Hủy
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReply(review.id)}
                            disabled={isSubmitting || replyText.trim().length < 10}
                          >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gửi phản hồi
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!review.tutorReply && replyingTo !== review.id && (
                    <div className="flex items-center gap-3 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setReplyingTo(review.id)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Phản hồi
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              className="gap-2"
            >
              Xem thêm đánh giá
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
