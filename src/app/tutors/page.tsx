"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TutorCard } from "@/components/TutorCard";
import { TutorCardSkeleton } from "@/components/TutorCardSkeleton";
import { FilterPanel, type FilterValues } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tutor } from "@/lib/schema";
import { useTutors } from "@/hooks/use-tutors";

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating-desc' | 'experience-desc' | 'reviews-desc';

const ITEMS_PER_PAGE = 8;

export default function Tutors() {
  const searchParams = useSearchParams();
  const tutorIdParam = searchParams.get("tutorId");

  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});

  // Build query filters - Memoized for performance
  const queryFilters = useMemo(() => {
    const result: any = {
      searchText: searchText || undefined,
      subjectId: filters.subjectId,
      category: filters.category,
      minRate: filters.minRate,
      maxRate: filters.maxRate,
      experience: filters.experience,
      shiftType: filters.shiftType,
    };

    // If specific tutorId is provided in URL, filter by it
    if (tutorIdParam) {
      result.tutorId = parseInt(tutorIdParam);
    }

    // If specific grade levels are selected, use the first one for API query
    // (The API currently supports single gradeLevelId, not array)
    if (filters.gradeLevelIds && filters.gradeLevelIds.length > 0) {
      result.gradeLevelId = filters.gradeLevelIds[0];
    }

    return result;
  }, [searchText, filters, tutorIdParam]);

  // Use React Query to fetch tutors with enriched data (subjects + time slots) - ONE request instead of N+1
  // Now with 30s cache for better performance
  const { data: enrichedTutors = [], isLoading, error } = useTutors(queryFilters);

  // Reset to page 1 when sort or filters change - Memoized with useCallback
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    resetPagination();
  }, [sortBy, queryFilters, resetPagination]);

  // Sort tutors based on selected option - Optimized with stable sort
  const sortedTutors = useMemo(() => {
    if (sortBy === 'default') return enrichedTutors;
    
    const sorted = [...enrichedTutors];

    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.hourlyRate - b.hourlyRate);
      case 'price-desc':
        return sorted.sort((a, b) => b.hourlyRate - a.hourlyRate);
      case 'rating-desc':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'experience-desc':
        return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
      case 'reviews-desc':
        return sorted.sort((a, b) => (b.totalReviews || 0) - (a.totalReviews || 0));
      default:
        return sorted;
    }
  }, [sortBy, enrichedTutors]);

  // Calculate pagination - Memoized
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(sortedTutors.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const displayedTutors = sortedTutors.slice(startIndex, endIndex);
    
    return { totalPages, startIndex, endIndex, displayedTutors };
  }, [sortedTutors, currentPage]);

  const { totalPages, displayedTutors } = paginationData;

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trang chủ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-tutors">Tìm gia sư</h1>
          <p className="text-muted-foreground mt-2">
            Tìm kiếm và lọc gia sư phù hợp với nhu cầu của bạn
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Panel */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="sticky top-8">
              <FilterPanel onFilterChange={setFilters} />
            </div>
          </aside>

          {/* Tutor List */}
          <main className="flex-1">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                Tìm thấy <span className="font-semibold text-foreground">{sortedTutors.length}</span> gia sư
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sắp xếp:</span>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[200px]" data-testid="select-sort">
                    <SelectValue placeholder="Mặc định" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Mặc định</SelectItem>
                    <SelectItem value="price-asc">Giá thấp đến cao</SelectItem>
                    <SelectItem value="price-desc">Giá cao đến thấp</SelectItem>
                    <SelectItem value="rating-desc">Điểm đánh giá cao nhất</SelectItem>
                    <SelectItem value="experience-desc">Kinh nghiệm nhiều nhất</SelectItem>
                    <SelectItem value="reviews-desc">Đánh giá nhiều nhất</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <TutorCardSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-destructive mb-4">{error.message || 'Có lỗi xảy ra'}</p>
                <Button onClick={() => window.location.reload()}>Thử lại</Button>
              </div>
            ) : displayedTutors.length > 0 ? (
              <>
                <div className="grid gap-6 md:grid-cols-2">
                  {displayedTutors.map((tutor: any) => {
                    // Map occupation
                    let occupation: 'student' | 'teacher' | 'professional' | 'tutor' = 'tutor';
                    if (tutor.occupation === 'Sinh viên') occupation = 'student';
                    else if (tutor.occupation === 'Giáo viên') occupation = 'teacher';
                    else if (tutor.occupation === 'Chuyên gia') occupation = 'professional';

                    return (
                      <TutorCard
                        key={tutor.id}
                        id={tutor.id.toString()}
                        name={tutor.fullName}
                        avatar={tutor.avatar}
                        subjects={tutor.subjects || []}
                        rating={(tutor.rating || 0) / 10}
                        reviewCount={tutor.totalReviews || 0}
                        hourlyRate={tutor.hourlyRate}
                        experience={tutor.experience || 0}
                        verified={tutor.verificationStatus === 'verified'}
                        hasVideo={!!tutor.videoIntro}
                        occupation={occupation}
                        availableSlots={tutor.timeSlots || []}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Trước
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                          data-testid={`button-page-${page}`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Sau
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-results">
                  Không tìm thấy gia sư phù hợp. Vui lòng thử điều chỉnh bộ lọc.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
