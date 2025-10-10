import { useState } from "react";
import { TutorCard } from "@/components/TutorCard";
import { FilterPanel } from "@/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

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
  }
];

export default function Tutors() {
  // For now, show all tutors. Filtering logic will be added when FilterPanel is updated
  const displayedTutors = mockTutors;

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
            <div className="mb-6">
              <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                Tìm thấy <span className="font-semibold text-foreground">{displayedTutors.length}</span> gia sư
              </p>
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
