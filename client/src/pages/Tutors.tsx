import { useState, useMemo } from "react";
import { TutorCard } from "@/components/TutorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import tutor1Avatar from '@assets/stock_images/vietnamese_female_te_395ea66e.jpg';
import tutor2Avatar from '@assets/stock_images/vietnamese_male_teac_91dbce7c.jpg';
import tutor3Avatar from '@assets/stock_images/asian_young_student__05aa4baa.jpg';
import tutor4Avatar from '@assets/stock_images/vietnamese_female_te_513f7461.jpg';

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

export default function Tutors() {
  const [sortBy, setSortBy] = useState<SortOption>('default');

  // Extract years of experience from experience string
  const getExperienceYears = (experience: string): number => {
    const match = experience.match(/(\d+)\s*năm/);
    return match ? parseInt(match[1]) : 0;
  };

  // Sort tutors based on selected option
  const displayedTutors = useMemo(() => {
    const sorted = [...mockTutors];
    
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => a.hourlyRate - b.hourlyRate);
      case 'price-desc':
        return sorted.sort((a, b) => b.hourlyRate - a.hourlyRate);
      case 'rating-desc':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'experience-desc':
        return sorted.sort((a, b) => getExperienceYears(b.experience) - getExperienceYears(a.experience));
      case 'reviews-desc':
        return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
      default:
        return sorted;
    }
  }, [sortBy]);

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
              <FilterPanel />
            </div>
          </aside>

          {/* Tutor List */}
          <main className="flex-1">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                Tìm thấy <span className="font-semibold text-foreground">{displayedTutors.length}</span> gia sư
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

            {displayedTutors.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {displayedTutors.map((tutor) => (
                  <TutorCard key={tutor.id} {...tutor} />
                ))}
              </div>
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
