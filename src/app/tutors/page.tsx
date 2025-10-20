"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TutorCard } from "@/components/TutorCard";
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

const tutor1Avatar = "/images/tutor1.jpg";
const tutor2Avatar = "/images/tutor2.jpg";
const tutor3Avatar = "/images/tutor3.jpg";
const tutor4Avatar = "/images/tutor4.jpg";

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
      { name: 'Tiếng Anh', grades: 'IELTS 6.5+' }
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
      { name: 'Vật Lý', grades: 'lớp 8-9' },
      { name: 'Tin học', grades: 'lớp 6-9' }
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
    name: 'Đỗ Văn Thành',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Lịch Sử', grades: 'lớp 10-12' },
      { name: 'Địa Lý', grades: 'lớp 10-12' }
    ],
    rating: 4.6,
    reviewCount: 42,
    hourlyRate: 150000,
    experience: '4 năm dạy môn Xã hội',
    verified: true,
    hasVideo: false,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5 (18h-21h)', 'CN (9h-15h)']
  },
  {
    id: '6',
    name: 'Hoàng Thị Lan',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Ngữ Văn', grades: 'lớp 10-12' }
    ],
    rating: 4.9,
    reviewCount: 88,
    hourlyRate: 190000,
    experience: '6 năm dạy Ngữ Văn THPT',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'T7 (14h-19h)']
  },
  {
    id: '7',
    name: 'Bùi Minh Đức',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'SAT', grades: 'Math & Reading' },
      { name: 'TOEFL', grades: '80+' }
    ],
    rating: 5.0,
    reviewCount: 35,
    hourlyRate: 300000,
    experience: '5 năm luyện thi SAT/TOEFL',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T7, CN (9h-18h)']
  },
  {
    id: '8',
    name: 'Ngô Thị Hương',
    avatar: tutor4Avatar,
    subjects: [
      { name: 'Tiếng Anh', grades: 'lớp 6-12' },
      { name: 'IELTS', grades: '5.0-7.5' }
    ],
    rating: 4.8,
    reviewCount: 67,
    hourlyRate: 220000,
    experience: '5 năm dạy Tiếng Anh',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T2-T6 (18h-21h)', 'T7 (14h-20h)']
  },
  {
    id: '9',
    name: 'Vũ Minh Quân',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Toán', grades: 'lớp 10-12' },
      { name: 'Vật Lý', grades: 'lớp 10-12' }
    ],
    rating: 4.9,
    reviewCount: 102,
    hourlyRate: 210000,
    experience: '6 năm dạy THPT, chuyên luyện thi',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (18h-21h)', 'CN (9h-15h)']
  },
  {
    id: '10',
    name: 'Đặng Thu Thảo',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Hóa học', grades: 'lớp 10-12' }
    ],
    rating: 4.7,
    reviewCount: 58,
    hourlyRate: 175000,
    experience: '4 năm kinh nghiệm dạy Hóa',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5 (19h-21h)', 'T7 (14h-18h)']
  },
  {
    id: '11',
    name: 'Lý Văn Nam',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Toán', grades: 'lớp 6-9' },
      { name: 'Lý', grades: 'lớp 8-9' }
    ],
    rating: 4.6,
    reviewCount: 45,
    hourlyRate: 130000,
    experience: '3 năm dạy THCS',
    verified: true,
    hasVideo: false,
    occupation: 'student' as const,
    availableSlots: ['T2-T6 (17h-20h)']
  },
  {
    id: '12',
    name: 'Châu Bảo Ngọc',
    avatar: tutor4Avatar,
    subjects: [
      { name: 'Tiếng Anh', grades: 'lớp 10-12' },
      { name: 'TOEIC', grades: '600+' }
    ],
    rating: 4.8,
    reviewCount: 71,
    hourlyRate: 230000,
    experience: '5 năm dạy Tiếng Anh, TOEIC',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T2, T4 (18h-21h)', 'T7, CN (14h-20h)']
  },
  {
    id: '13',
    name: 'Phan Đức Minh',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Sinh học', grades: 'lớp 10-12' }
    ],
    rating: 4.5,
    reviewCount: 38,
    hourlyRate: 160000,
    experience: '3 năm dạy Sinh THPT',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5, T7 (19h-21h)']
  },
  {
    id: '14',
    name: 'Mai Phương Linh',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Ngữ Văn', grades: 'lớp 6-9' },
      { name: 'Văn', grades: 'THCS' }
    ],
    rating: 4.7,
    reviewCount: 52,
    hourlyRate: 140000,
    experience: '4 năm dạy Văn THCS',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (17h-20h)']
  },
  {
    id: '15',
    name: 'Trịnh Quốc Bảo',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Lịch Sử', grades: 'lớp 10-12' },
      { name: 'Địa Lý', grades: 'lớp 10-12' }
    ],
    rating: 4.6,
    reviewCount: 44,
    hourlyRate: 155000,
    experience: '5 năm dạy Sử, Địa',
    verified: true,
    hasVideo: false,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5 (18h-21h)', 'CN (14h-18h)']
  },
  {
    id: '16',
    name: 'Võ Thị Ánh',
    avatar: tutor4Avatar,
    subjects: [
      { name: 'Tiếng Anh', grades: 'lớp 1-5' },
      { name: 'Tiếng Anh', grades: 'Tiểu học' }
    ],
    rating: 4.9,
    reviewCount: 86,
    hourlyRate: 110000,
    experience: '4 năm dạy Tiếng Anh Tiểu học',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2-T6 (16h-19h)', 'T7 (9h-12h)']
  },
  {
    id: '17',
    name: 'Hồ Văn Tuấn',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Toán', grades: 'lớp 1-5' }
    ],
    rating: 4.8,
    reviewCount: 63,
    hourlyRate: 100000,
    experience: '3 năm dạy Toán Tiểu học',
    verified: true,
    hasVideo: true,
    occupation: 'student' as const,
    availableSlots: ['T2, T4, T6 (16h-19h)']
  },
  {
    id: '18',
    name: 'Lương Khánh Ly',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Piano', grades: 'cơ bản-nâng cao' }
    ],
    rating: 5.0,
    reviewCount: 47,
    hourlyRate: 280000,
    experience: '8 năm dạy Piano',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T7, CN (9h-18h)']
  },
  {
    id: '19',
    name: 'Đinh Công Thành',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Tin học', grades: 'lớp 10-12' },
      { name: 'Lập trình', grades: 'Python, Java' }
    ],
    rating: 4.8,
    reviewCount: 55,
    hourlyRate: 240000,
    experience: '5 năm dạy Tin học, Lập trình',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T2, T4, T6 (19h-22h)', 'CN (14h-20h)']
  },
  {
    id: '20',
    name: 'Nguyễn Thùy Dung',
    avatar: tutor4Avatar,
    subjects: [
      { name: 'Toán', grades: 'lớp 10-12' },
      { name: 'Toán', grades: 'luyện thi ĐH' }
    ],
    rating: 4.9,
    reviewCount: 115,
    hourlyRate: 215000,
    experience: '7 năm dạy Toán THPT và luyện thi',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (18h-21h)', 'T7, CN (14h-20h)']
  },
  {
    id: '21',
    name: 'Bùi Thanh Hải',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Vật Lý', grades: 'lớp 10-12' }
    ],
    rating: 4.7,
    reviewCount: 61,
    hourlyRate: 195000,
    experience: '5 năm dạy Vật Lý THPT',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5, T7 (18h-21h)']
  },
  {
    id: '22',
    name: 'Lê Thị Như Quỳnh',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Hóa học', grades: 'lớp 10-12' },
      { name: 'Sinh học', grades: 'lớp 10-12' }
    ],
    rating: 4.8,
    reviewCount: 74,
    hourlyRate: 185000,
    experience: '6 năm dạy Hóa và Sinh',
    verified: true,
    hasVideo: true,
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'CN (14h-18h)']
  },
  {
    id: '23',
    name: 'Trương Minh Khang',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Guitar', grades: 'cơ bản-nâng cao' }
    ],
    rating: 4.9,
    reviewCount: 82,
    hourlyRate: 200000,
    experience: '6 năm dạy Guitar',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T3, T5, T7 (18h-21h)', 'CN (9h-18h)']
  },
  {
    id: '24',
    name: 'Đoàn Minh Anh',
    avatar: tutor3Avatar,
    subjects: [
      { name: 'Tiếng Anh', grades: 'lớp 6-12' },
      { name: 'Cambridge', grades: 'KET, PET, FCE' }
    ],
    rating: 4.9,
    reviewCount: 93,
    hourlyRate: 235000,
    experience: '6 năm dạy Cambridge English',
    verified: true,
    hasVideo: true,
    occupation: 'professional' as const,
    availableSlots: ['T2-T6 (18h-21h)', 'T7 (14h-20h)']
  }
];

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'rating-desc' | 'experience-desc' | 'reviews-desc';

const ITEMS_PER_PAGE = 8;

// Helper function to transform DB tutor to TutorCard props
const transformTutorData = (tutor: Tutor, timeSlots: any[] = [], tutorSubjectData: any[] = []) => {
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

  // Determine occupation type
  let occupation: 'student' | 'teacher' | 'professional' | 'tutor' = 'tutor';
  if (tutor.occupation) {
    const occ = tutor.occupation.toLowerCase();
    if (occ.includes('sinh viên') || occ.includes('student')) {
      occupation = 'student';
    } else if (occ.includes('giáo viên') || occ.includes('teacher')) {
      occupation = 'teacher';
    } else if (occ === 'other') {
      occupation = 'professional';
    }
  }

  return {
    id: tutor.id.toString(),
    name: tutor.fullName,
    avatar: tutor.avatar || undefined,
    subjects: subjects,
    rating: (tutor.rating || 0) / 10, // Convert from 0-50 to 0-5.0
    reviewCount: tutor.totalReviews || 0,
    hourlyRate: tutor.hourlyRate,
    experience: `${tutor.experience || 0} năm kinh nghiệm`,
    verified: tutor.verificationStatus === 'verified',
    hasVideo: !!tutor.videoIntro,
    occupation: occupation,
    availableSlots: timeSlots
  };
};

export default function Tutors() {
  const searchParams = useSearchParams();
  const tutorIdParam = searchParams.get("tutorId");

  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});

  // Build query filters
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
  const { data: enrichedTutors = [], isLoading, error } = useTutors(queryFilters);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  // Sort tutors based on selected option
  const sortedTutors = useMemo(() => {
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

  // Calculate pagination
  const totalPages = Math.ceil(sortedTutors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedTutors = sortedTutors.slice(startIndex, endIndex);

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
              <FilterPanel
                onFilterChange={setFilters}
                onSearch={setSearchText}
              />
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
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Đang tải danh sách gia sư...</p>
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
                        experience={`${tutor.experience || 0} năm kinh nghiệm`}
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
