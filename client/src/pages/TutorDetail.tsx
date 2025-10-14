import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDialog } from "@/components/BookingDialog";
import { 
  Star, 
  Video, 
  CheckCircle, 
  Calendar,
  Clock,
  BookOpen,
  Award,
  MessageCircle,
  MapPin,
  Briefcase,
  Play
} from "lucide-react";

import tutor1Avatar from '@assets/stock_images/vietnamese_female_te_395ea66e.jpg';
import tutor2Avatar from '@assets/stock_images/vietnamese_male_teac_91dbce7c.jpg';
import tutor3Avatar from '@assets/stock_images/asian_young_student__05aa4baa.jpg';
import tutor4Avatar from '@assets/stock_images/vietnamese_female_te_513f7461.jpg';

interface Education {
  school: string;
  degree: string;
  year: string;
}

interface Review {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
}

interface Subject {
  name: string;
  grades: string;
}

interface AvailableSlot {
  id: string;
  dayLabels: string;
  startTime: string;
  endTime: string;
  price: number;
  sessionsPerWeek: number;
  isBusy?: boolean;
  remainingSlots?: number;
}

interface TutorDetailData {
  id: string;
  name: string;
  avatar: string;
  subjects: Subject[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  lessonDuration: number; // Thời lượng buổi học (giờ) do gia sư đặt
  experience: string;
  verified: boolean;
  hasVideo: boolean;
  videoUrl?: string;
  occupation: 'student' | 'teacher' | 'professional';
  availableSlots: string[];
  availableSlotDetails: AvailableSlot[];
  bio: string;
  education: Education[];
  certifications: string[];
  achievements: string[];
  teachingStyle: string;
  languages: string[];
  location: string;
  reviews: Review[];
}

// Mock data - sẽ thay bằng API call thực
const tutorData: Record<string, TutorDetailData> = {
  '1': {
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
    lessonDuration: 1.5, // 1.5 giờ mỗi buổi
    experience: '5 năm kinh nghiệm dạy THPT',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'T7, CN (14h-20h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 2, 4, 6', startTime: '19:00', endTime: '21:00', price: 300000, sessionsPerWeek: 3, remainingSlots: 2 },
      { id: 'slot-2', dayLabels: 'Thứ 7, CN', startTime: '14:00', endTime: '20:00', price: 350000, sessionsPerWeek: 2, remainingSlots: 5 },
    ],
    bio: 'Tôi là giáo viên Toán và Vật Lý với 5 năm kinh nghiệm giảng dạy tại trường THPT chuyên. Tôi đam mê giúp học sinh hiểu sâu bản chất của môn học và áp dụng vào thực tế.',
    education: [
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Cử nhân Toán học', year: '2018' },
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Thạc sĩ Giáo dục Toán', year: '2020' }
    ],
    certifications: [
      'Chứng chỉ Giáo viên dạy giỏi cấp Thành phố',
      'Chứng chỉ Bồi dưỡng học sinh giỏi Quốc gia'
    ],
    achievements: [
      'Học sinh đạt 9.5+ môn Toán trong kỳ thi THPT Quốc gia: 45 em',
      'Học sinh đỗ Đại học top 10: 38 em',
      'Giải Nhì Hội giảng Giáo viên trẻ Hà Nội'
    ],
    teachingStyle: 'Phương pháp giảng dạy của tôi tập trung vào việc xây dựng nền tảng vững chắc, giúp học sinh tự tin giải quyết mọi dạng bài tập. Tôi luôn khuyến khích học sinh đặt câu hỏi và tư duy phản biện.',
    languages: ['Tiếng Việt', 'Tiếng Anh (giao tiếp)'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Phạm Minh Anh',
        rating: 5,
        comment: 'Cô dạy rất dễ hiểu và nhiệt tình. Em đã tiến bộ rõ rệt sau 3 tháng học.',
        date: '2024-03-15'
      },
      {
        id: '2',
        studentName: 'Trần Hoàng Nam',
        rating: 5,
        comment: 'Cô luôn chuẩn bị bài kỹ lưỡng và giải đáp mọi thắc mắc của em. Rất recommend!',
        date: '2024-03-10'
      },
      {
        id: '3',
        studentName: 'Lê Thu Hà',
        rating: 4,
        comment: 'Phương pháp dạy của cô giúp em hiểu bản chất vấn đề. Tuy nhiên em mong cô có thêm bài tập về nhà.',
        date: '2024-03-05'
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Trần Văn Hùng',
    avatar: tutor2Avatar,
    subjects: [
      { name: 'Tiếng Anh', grades: 'IELTS 6.5+' },
      { name: 'Tiếng Anh', grades: 'giao tiếp' }
    ],
    rating: 5.0,
    reviewCount: 95,
    hourlyRate: 250000,
    lessonDuration: 2, // 2 giờ mỗi buổi
    experience: '7 năm kinh nghiệm IELTS, TOEFL',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'professional' as const,
    availableSlots: ['T3, T5, T7 (18h-21h)', 'CN (9h-18h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 3, 5, 7', startTime: '18:00', endTime: '21:00', price: 500000, sessionsPerWeek: 3, isBusy: true },
      { id: 'slot-2', dayLabels: 'Chủ nhật', startTime: '09:00', endTime: '18:00', price: 550000, sessionsPerWeek: 1, remainingSlots: 3 },
    ],
    bio: 'Tôi là giảng viên Tiếng Anh với chứng chỉ IELTS 8.5 và TOEFL 115. Chuyên luyện thi IELTS, TOEFL và giao tiếp thực tế.',
    education: [
      { school: 'Đại học Ngoại ngữ - ĐHQGHN', degree: 'Cử nhân Ngôn ngữ Anh', year: '2016' },
      { school: 'University of Leeds, UK', degree: 'Thạc sĩ TESOL', year: '2019' }
    ],
    certifications: [
      'IELTS 8.5 Overall',
      'TOEFL iBT 115',
      'Cambridge CELTA',
      'TESOL Certificate'
    ],
    achievements: [
      'Học viên đạt IELTS 7.0+: 67 người',
      'Học viên đạt TOEFL 100+: 32 người',
      'Giảng viên xuất sắc tại British Council'
    ],
    teachingStyle: 'Tôi tin rằng học ngôn ngữ phải gắn liền với thực tế. Học viên sẽ được thực hành 4 kỹ năng qua các tình huống thực tế, kết hợp với luyện đề thi chuyên sâu.',
    languages: ['Tiếng Việt', 'Tiếng Anh (bản ngữ)'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Nguyễn Thu Trang',
        rating: 5,
        comment: 'Thầy dạy rất professional và có lộ trình rõ ràng. Em đã đạt 7.5 IELTS!',
        date: '2024-03-18'
      },
      {
        id: '2',
        studentName: 'Đỗ Minh Quân',
        rating: 5,
        comment: 'Thầy giúp em cải thiện speaking rất nhiều. Giờ em tự tin giao tiếp tiếng Anh.',
        date: '2024-03-12'
      }
    ]
  },
  '3': {
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
    lessonDuration: 1.5,
    experience: '3 năm dạy THCS',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'student' as const,
    availableSlots: ['T2-T6 (17h-20h)', 'T7 (14h-18h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'T2-T6', startTime: '17:00', endTime: '20:00', price: 180000, sessionsPerWeek: 5 },
      { id: 'slot-2', dayLabels: 'Thứ 7', startTime: '14:00', endTime: '18:00', price: 200000, sessionsPerWeek: 1 },
    ],
    bio: 'Tôi là sinh viên năm cuối ngành Sư phạm Toán - Tin. Đam mê dạy học và giúp các em THCS yêu thích môn Toán, Lý, Tin học.',
    education: [
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Cử nhân Sư phạm Toán - Tin', year: '2025 (dự kiến)' }
    ],
    certifications: [
      'Chứng chỉ Tin học quốc tế MOS',
      'Giải Ba Olympic Toán sinh viên toàn quốc'
    ],
    achievements: [
      'Học sinh đạt điểm cao môn Toán THCS: 28 em',
      'Học sinh đỗ trường chuyên: 5 em'
    ],
    teachingStyle: 'Tôi dạy theo phương pháp học qua thực hành và game hóa, giúp các em hứng thú với môn học.',
    languages: ['Tiếng Việt'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Nguyễn Minh Khang',
        rating: 5,
        comment: 'Anh dạy vui và dễ hiểu. Em thích học Toán hơn rồi!',
        date: '2024-03-14'
      }
    ]
  },
  '4': {
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
    lessonDuration: 1.5,
    experience: '4 năm kinh nghiệm, chuyên luyện thi ĐH',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (18h-21h)', 'T7 (15h-19h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 2, 4, 6', startTime: '18:00', endTime: '21:00', price: 270000, sessionsPerWeek: 3 },
      { id: 'slot-2', dayLabels: 'Thứ 7', startTime: '15:00', endTime: '19:00', price: 300000, sessionsPerWeek: 1 },
    ],
    bio: 'Tôi là giáo viên Hóa - Sinh với niềm đam mê truyền cảm hứng cho học sinh yêu khoa học tự nhiên.',
    education: [
      { school: 'Đại học Khoa học Tự nhiên - ĐHQGHN', degree: 'Cử nhân Hóa học', year: '2019' }
    ],
    certifications: [
      'Chứng chỉ Giáo viên giỏi cấp Quận',
      'Bồi dưỡng học sinh giỏi Hóa - Sinh'
    ],
    achievements: [
      'Học sinh đạt 9.0+ môn Hóa trong kỳ thi THPT: 23 em',
      'Học sinh đỗ khối B, D: 19 em'
    ],
    teachingStyle: 'Tôi tập trung vào việc giúp học sinh hiểu bản chất phản ứng và cơ chế sinh học, không chỉ học thuộc.',
    languages: ['Tiếng Việt'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Trần Bảo Ngọc',
        rating: 5,
        comment: 'Cô dạy Hóa rất hay, giúp em hiểu sâu chứ không học vẹt.',
        date: '2024-03-16'
      }
    ]
  },
  '5': {
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
    lessonDuration: 2,
    experience: '4 năm dạy môn Xã hội',
    verified: true,
    hasVideo: false,
    occupation: 'teacher' as const,
    availableSlots: ['T3, T5 (18h-21h)', 'CN (9h-15h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 3, 5', startTime: '18:00', endTime: '21:00', price: 300000, sessionsPerWeek: 2 },
      { id: 'slot-2', dayLabels: 'Chủ nhật', startTime: '09:00', endTime: '15:00', price: 320000, sessionsPerWeek: 1 },
    ],
    bio: 'Tôi là giáo viên Lịch Sử - Địa Lý, yêu thích việc kể chuyện để giúp học sinh ghi nhớ kiến thức lâu dài.',
    education: [
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Cử nhân Sư phạm Lịch Sử', year: '2019' }
    ],
    certifications: [
      'Chứng chỉ Bồi dưỡng học sinh giỏi Quốc gia'
    ],
    achievements: [
      'Học sinh đạt 9.0+ môn Lịch Sử trong kỳ thi THPT: 18 em',
      'Học sinh đỗ khối C: 15 em'
    ],
    teachingStyle: 'Tôi sử dụng phương pháp kể chuyện và sơ đồ tư duy để giúp học sinh nhớ lâu và hiểu sâu.',
    languages: ['Tiếng Việt'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Lê Minh Châu',
        rating: 5,
        comment: 'Thầy kể chuyện Lịch Sử rất hay, em nhớ lâu hơn!',
        date: '2024-03-13'
      }
    ]
  },
  '6': {
    id: '6',
    name: 'Hoàng Thị Lan',
    avatar: tutor1Avatar,
    subjects: [
      { name: 'Ngữ Văn', grades: 'lớp 10-12' },
      { name: 'Văn', grades: 'luyện thi ĐH' }
    ],
    rating: 4.9,
    reviewCount: 88,
    hourlyRate: 190000,
    lessonDuration: 2,
    experience: '6 năm dạy Ngữ Văn THPT',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'T7 (14h-19h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 2, 4, 6', startTime: '19:00', endTime: '21:00', price: 380000, sessionsPerWeek: 3 },
      { id: 'slot-2', dayLabels: 'Thứ 7', startTime: '14:00', endTime: '19:00', price: 400000, sessionsPerWeek: 1 },
    ],
    bio: 'Tôi là giáo viên Ngữ Văn với niềm đam mê văn chương và nghệ thuật viết. Giúp học sinh yêu thích môn Văn.',
    education: [
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Cử nhân Ngữ văn', year: '2017' },
      { school: 'Đại học Sư phạm Hà Nội', degree: 'Thạc sĩ Văn học', year: '2019' }
    ],
    certifications: [
      'Chứng chỉ Giáo viên dạy giỏi cấp Thành phố',
      'Chứng chỉ Bồi dưỡng học sinh giỏi Văn'
    ],
    achievements: [
      'Học sinh đạt 8.5+ môn Văn trong kỳ thi THPT Quốc gia: 52 em',
      'Học sinh đỗ các trường top về Xã hội - Nhân văn: 31 em',
      'Giải Nhất cuộc thi viết văn cấp Thành phố'
    ],
    teachingStyle: 'Tôi khuyến khích học sinh phát triển tư duy phản biện và kỹ năng viết sáng tạo thông qua thảo luận và luyện tập.',
    languages: ['Tiếng Việt'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Vũ Thu Hương',
        rating: 5,
        comment: 'Cô dạy Văn rất tâm huyết, giúp em yêu thích môn Văn hơn.',
        date: '2024-03-17'
      }
    ]
  },
  '7': {
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
    lessonDuration: 2,
    experience: '5 năm luyện thi SAT/TOEFL',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'professional' as const,
    availableSlots: ['T7, CN (9h-18h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'Thứ 7, CN', startTime: '09:00', endTime: '18:00', price: 600000, sessionsPerWeek: 2 },
    ],
    bio: 'Tôi là chuyên gia luyện thi SAT và TOEFL với nhiều học viên đạt điểm cao và nhập học các trường đại học hàng đầu Mỹ.',
    education: [
      { school: 'University of California, Berkeley', degree: 'Bachelor in Economics', year: '2015' },
      { school: 'Columbia University', degree: 'Master in Education', year: '2018' }
    ],
    certifications: [
      'SAT Perfect Score 1600',
      'TOEFL iBT 118',
      'Certified SAT/ACT Prep Instructor'
    ],
    achievements: [
      'Học viên đạt SAT 1500+: 23 người',
      'Học viên đạt TOEFL 100+: 41 người',
      'Học viên nhập học Ivy League: 8 người'
    ],
    teachingStyle: 'Tôi sử dụng phương pháp luyện thi chiến lược, tập trung vào kỹ thuật làm bài và quản lý thời gian hiệu quả.',
    languages: ['Tiếng Việt', 'Tiếng Anh (bản ngữ)'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Nguyễn Đức Anh',
        rating: 5,
        comment: 'Thầy dạy rất chuyên nghiệp, em đã đạt 1520 SAT!',
        date: '2024-03-19'
      }
    ]
  },
  '8': {
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
    lessonDuration: 1.5,
    experience: '5 năm dạy Tiếng Anh',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'professional' as const,
    availableSlots: ['T2-T6 (18h-21h)', 'T7 (14h-20h)'],
    availableSlotDetails: [
      { id: 'slot-1', dayLabels: 'T2-T6', startTime: '18:00', endTime: '21:00', price: 330000, sessionsPerWeek: 5 },
      { id: 'slot-2', dayLabels: 'Thứ 7', startTime: '14:00', endTime: '20:00', price: 350000, sessionsPerWeek: 1 },
    ],
    bio: 'Tôi là giảng viên Tiếng Anh với chứng chỉ IELTS 8.0, chuyên dạy IELTS và Tiếng Anh giao tiếp.',
    education: [
      { school: 'Đại học Ngoại ngữ - ĐHQGHN', degree: 'Cử nhân Ngôn ngữ Anh', year: '2018' }
    ],
    certifications: [
      'IELTS 8.0 Overall',
      'Cambridge TKT',
      'TESOL Certificate'
    ],
    achievements: [
      'Học viên đạt IELTS 7.0+: 45 người',
      'Học viên cải thiện từ 5.0 lên 7.0 trong 6 tháng: 12 người'
    ],
    teachingStyle: 'Tôi tập trung vào phát triển 4 kỹ năng nghe-nói-đọc-viết một cách cân bằng, kết hợp luyện đề và phản hồi chi tiết.',
    languages: ['Tiếng Việt', 'Tiếng Anh (thành thạo)'],
    location: 'Hà Nội',
    reviews: [
      {
        id: '1',
        studentName: 'Phạm Thùy Linh',
        rating: 5,
        comment: 'Cô dạy IELTS rất tận tâm, em đã đạt 7.5!',
        date: '2024-03-20'
      }
    ]
  }
};

export default function TutorDetail() {
  const [, params] = useRoute("/tutor/:id");
  const tutorId = params?.id || '1';
  const tutor = tutorData[tutorId] || tutorData['1'];
  
  const [trialBookingOpen, setTrialBookingOpen] = useState(false);
  const [regularBookingOpen, setRegularBookingOpen] = useState(false);

  const occupationLabels: Record<string, string> = {
    teacher: 'Giáo viên',
    student: 'Sinh viên',
    professional: 'Chuyên gia'
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center lg:items-start">
                <Avatar className="h-32 w-32 mb-4">
                  <AvatarImage src={tutor.avatar} alt={tutor.name} />
                  <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                </Avatar>
                {tutor.verified && (
                  <Badge className="mb-2" data-testid="badge-verified">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Đã xác thực
                  </Badge>
                )}
                <Badge variant="secondary" data-testid="badge-occupation">
                  {occupationLabels[tutor.occupation]}
                </Badge>
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2" data-testid="text-tutor-name">{tutor.name}</h1>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 fill-primary text-primary mr-1" />
                        <span className="font-semibold" data-testid="text-rating">{tutor.rating}</span>
                        <span className="text-sm text-muted-foreground ml-1">
                          ({tutor.reviewCount} đánh giá)
                        </span>
                      </div>
                      {tutor.hasVideo && (
                        <Badge variant="outline" className="gap-1">
                          <Video className="h-3 w-3" />
                          Video giới thiệu
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl font-bold text-primary mb-1" data-testid="text-rate">
                      {tutor.hourlyRate.toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-sm text-muted-foreground">/ giờ học</div>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4">{tutor.bio}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{tutor.experience}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{tutor.location}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {tutor.subjects.map((subject: any, index: number) => (
                    <Badge key={index} variant="secondary">
                      {subject.name} - {subject.grades}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    size="lg" 
                    className="gap-2" 
                    onClick={() => setTrialBookingOpen(true)}
                    data-testid="button-book-trial"
                  >
                    <Calendar className="h-5 w-5" />
                    Đặt lịch học thử miễn phí
                  </Button>
                  <Button 
                    size="lg" 
                    variant="default"
                    className="gap-2" 
                    onClick={() => setRegularBookingOpen(true)}
                    data-testid="button-book-monthly"
                  >
                    <Calendar className="h-5 w-5" />
                    Đặt lịch theo tháng
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-message">
                    <MessageCircle className="h-5 w-5" />
                    Nhắn tin
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="about" className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">Giới thiệu</TabsTrigger>
            <TabsTrigger value="schedule">Lịch trống</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-4">
            {/* Video Introduction */}
            {tutor.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Video giới thiệu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <iframe
                      src={tutor.videoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid="video-introduction"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Phương pháp giảng dạy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{tutor.teachingStyle}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Học vấn
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tutor.education.map((edu: any, index: number) => (
                  <div key={index} className="border-l-2 border-primary pl-4">
                    <div className="font-semibold">{edu.degree}</div>
                    <div className="text-sm text-muted-foreground">{edu.school}</div>
                    <div className="text-xs text-muted-foreground">{edu.year}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Chứng chỉ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tutor.certifications.map((cert: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{cert}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Thành tích nổi bật
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tutor.achievements.map((achievement: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Lịch trống trong tuần
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutor.availableSlotDetails.map((slot: AvailableSlot) => {
                    const isBusy = slot.isBusy || false;
                    const remainingSlots = slot.remainingSlots || 10;
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isBusy 
                            ? 'border-muted bg-muted/30 opacity-60' 
                            : 'border-border bg-card hover-elevate'
                        }`}
                        data-testid={`slot-${slot.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="font-semibold">
                                {slot.dayLabels}
                              </Badge>
                              <Badge variant="secondary">
                                {slot.sessionsPerWeek} buổi/tuần
                              </Badge>
                              {!isBusy && remainingSlots <= 3 && (
                                <Badge variant="destructive" className="bg-orange-500">
                                  Còn {remainingSlots} chỗ
                                </Badge>
                              )}
                              {isBusy && (
                                <Badge variant="destructive">
                                  Đã đầy
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{slot.startTime} - {slot.endTime}</span>
                              </div>
                              <div className="font-semibold text-foreground">
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                }).format(slot.price)}/buổi
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Học phí/tháng: ~{new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(slot.price * slot.sessionsPerWeek * 4)}
                            </p>
                          </div>
                          <Button 
                            size="default" 
                            onClick={() => setRegularBookingOpen(true)}
                            disabled={isBusy}
                            data-testid={`button-book-${slot.id}`}
                            className="shrink-0"
                          >
                            {isBusy ? 'Đã đầy' : 'Đặt lịch'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  * Bạn có thể đề xuất thời gian khác qua tin nhắn với gia sư
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Đánh giá từ học viên</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tutor.reviews.map((review: any) => (
                  <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{review.studentName}</div>
                      <div className="flex items-center gap-1">
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
                    </div>
                    <p className="text-muted-foreground mb-1">{review.comment}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking Dialogs */}
        <BookingDialog
          open={trialBookingOpen}
          onOpenChange={setTrialBookingOpen}
          tutorName={tutor.name}
          hourlyRate={tutor.hourlyRate}
          lessonDuration={0.5} // Học thử 30 phút
          isTrial={true}
        />
        <BookingDialog
          open={regularBookingOpen}
          onOpenChange={setRegularBookingOpen}
          tutorName={tutor.name}
          hourlyRate={tutor.hourlyRate}
          lessonDuration={tutor.lessonDuration}
          isTrial={false}
          availableSlots={tutor.availableSlotDetails}
        />
      </div>
    </div>
  );
}
