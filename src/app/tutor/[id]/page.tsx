"use client";

import { useState, useMemo, lazy, Suspense } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tutor } from "@/lib/schema";
import { useTutor, type EnrichedTutor } from "@/hooks/use-tutors";
import { calculateHours, calculateFee } from "@/lib/schema";
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
  Play,
  Loader2,
  AlertCircle
} from "lucide-react";

// Lazy load BookingDialog to reduce initial bundle size
const BookingDialog = lazy(() => import("@/components/BookingDialog").then(mod => ({ default: mod.BookingDialog })));

// Default avatar fallback
const tutor1Avatar = "/images/tutor1.jpg";

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
  dayOfWeek?: number;
  dayLabels: string;
  startTime: string;
  endTime: string;
  price: number;
  sessionsPerWeek: number;
  isBusy?: boolean;
  remainingSlots?: number;
  bookingCount?: number;
  slotIds?: number[];
}

interface TutorDetailData {
  id: string;
  name: string;
  avatar: string;
  subjects: Subject[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  lessonDuration: number;
  experience: string;
  verified: boolean;
  hasVideo: boolean;
  videoUrl?: string;
  occupation?: {
    id: number;
    label: string;
  } | 'student' | 'teacher' | 'professional' | 'tutor';
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

export default function TutorDetail() {
  const params = useParams();
  const tutorId = params?.id as string || '1';

  const [trialBookingOpen, setTrialBookingOpen] = useState(false);
  const [regularBookingOpen, setRegularBookingOpen] = useState(false);
  const [preSelectedSlotId, setPreSelectedSlotId] = useState<string | undefined>(undefined);
  const [openAsTrialMode, setOpenAsTrialMode] = useState<boolean>(false);

  // ✅ UX: Handle slot selection and open booking dialog
  const handleSlotBooking = (slotId: string) => {
    setPreSelectedSlotId(slotId);
    setOpenAsTrialMode(false); // Mở mode đăng ký thật khi click từ slot
    setRegularBookingOpen(true);
  };

  // ✅ UX: Open dialog in trial mode
  const handleTrialBooking = () => {
    setPreSelectedSlotId(undefined);
    setOpenAsTrialMode(true); // Mở mode học thử
    setRegularBookingOpen(true);
  };

  // Fetch tutor data using React Query
  const { data: enrichedData, isLoading, error: queryError } = useTutor(tutorId);

  // Transform DB data to component format
  const tutor: TutorDetailData | null = useMemo(() => {
    if (!enrichedData) return null;

    const data: EnrichedTutor = enrichedData;

    // Parse subjects - use enriched tutorSubjects if available
    let subjects: Subject[] = [];
    if (data.tutorSubjects && data.tutorSubjects.length > 0) {
      // New normalized format - group by subject
      const subjectMap = new Map<string, Set<string>>();
      data.tutorSubjects.forEach((ts) => {
        const subjectName = ts.subject?.name || 'N/A';
        const gradeName = ts.gradeLevel?.name || 'N/A';

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, new Set());
        }
        subjectMap.get(subjectName)!.add(gradeName);
      });

      subjects = Array.from(subjectMap.entries()).map(([name, grades]) => ({
        name,
        grades: Array.from(grades).join(', ')
      }));
    } else {
      // Fallback to old JSON format
      try {
        const subjectsData = JSON.parse(data.subjects);
        subjects = subjectsData.map((s: any) => ({
          name: s.subject,
          grades: Array.isArray(s.grades) ? s.grades.join(', ') : s.grades
        }));
      } catch (e) {
        console.error('Error parsing subjects:', e);
        subjects = [];
      }
    }

    // Transform time slots to available slot details with calculated fees
    let availableSlotDetails: AvailableSlot[] = [];
    if (data.timeSlots && data.timeSlots.length > 0) {
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayOrder = { 'CN': 7, 'T2': 1, 'T3': 2, 'T4': 3, 'T5': 4, 'T6': 5, 'T7': 6 };

      // ✅ OPTIMIZATION: Check if each slot has active booking (1-on-1 class)
      const slotBookingStatus = new Map<number, boolean>();
      if (data.timeSlots) {
        data.timeSlots.forEach((slot: any) => {
          // For 1-on-1: slot is busy if has ANY active booking
          const hasBooking = slot.bookings?.some((b: any) => 
            b.status !== 'cancelled' && b.status !== 'completed'
          ) || false;
          slotBookingStatus.set(slot.id, hasBooking);
        });
      }

      // Group slots by time range and collect all days
      const slotGroups = new Map<string, any[]>();
      data.timeSlots.forEach((slot: any) => {
        const key = `${slot.startTime}-${slot.endTime}`;
        if (!slotGroups.has(key)) {
          slotGroups.set(key, []);
        }
        slotGroups.get(key)!.push(slot);
      });

      availableSlotDetails = Array.from(slotGroups.entries()).map(([timeRange, slots], index) => {
        // Sort slots by day of week
        slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
        
        const firstSlot = slots[0];
        const dayLabels = slots.map(s => dayNames[s.dayOfWeek]).join(', ');
        const fee = calculateFee(firstSlot.startTime, firstSlot.endTime, data.hourlyRate);
        
        // Count how many days in this group have bookings
        const bookedDays = slots.filter(s => slotBookingStatus.get(s.id)).length;
        const totalDays = slots.length;
        const allBooked = bookedDays === totalDays;
        
        const slotGroup = {
          id: `slot-${index}`, // Use index to ensure unique IDs
          dayOfWeek: firstSlot.dayOfWeek,
          dayLabels,
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
          price: fee,
          sessionsPerWeek: totalDays,
          remainingSlots: allBooked ? 0 : (totalDays - bookedDays),
          isBusy: allBooked,
          bookingCount: bookedDays,
          slotIds: slots.map(s => s.id), // Keep track of all slot IDs in this group
        };
        
        return slotGroup;
      });

      // ✅ SORT: By day of week (T2 → CN), then by start time
      availableSlotDetails.sort((a, b) => {
        // First: Sort by earliest day in the week
        const dayA = dayOrder[a.dayLabels.split(', ')[0] as keyof typeof dayOrder] || 0;
        const dayB = dayOrder[b.dayLabels.split(', ')[0] as keyof typeof dayOrder] || 0;
        if (dayA !== dayB) {
          return dayA - dayB;
        }
        
        // Second: Sort by start time
        const timeA = a.startTime.split(':').map(Number);
        const timeB = b.startTime.split(':').map(Number);
        const minutesA = timeA[0] * 60 + timeA[1];
        const minutesB = timeB[0] * 60 + timeB[1];
        return minutesA - minutesB;
      });
    }

    // Format experience display
    const yearsOfExperience = data.experience || 0;
    const experienceText = yearsOfExperience < 1 
      ? "Dưới 1 năm kinh nghiệm"
      : `${yearsOfExperience} năm kinh nghiệm`;

    return {
      id: data.id.toString(),
      name: data.fullName || 'Giáo viên', // ✅ Provide fallback for null/undefined
      avatar: data.avatar || tutor1Avatar,
      subjects,
      rating: (data.rating || 0) / 10,
      reviewCount: data.totalReviews || 0,
      hourlyRate: data.hourlyRate,
      lessonDuration: 1.5, // Default 1.5 hours
      experience: experienceText,
      verified: data.verificationStatus === 'verified',
      hasVideo: !!data.videoIntro,
      videoUrl: data.videoIntro || undefined,
      occupation: (data as any).occupation || undefined,
      availableSlots: [], // Legacy field
      availableSlotDetails,
      bio: data.bio || '',
      education: data.education ? (
        data.education.startsWith('[') || data.education.startsWith('{')
          ? JSON.parse(data.education)
          : [{ degree: data.education, school: '', year: '' }]
      ) : [],
      certifications: data.certifications ? (
        data.certifications.startsWith('[') || data.certifications.startsWith('{')
          ? JSON.parse(data.certifications)
          : [data.certifications]
      ) : [],
      achievements: data.achievements ? (
        data.achievements.startsWith('[') || data.achievements.startsWith('{')
          ? JSON.parse(data.achievements)
          : [data.achievements]
      ) : [],
      teachingStyle: data.teachingMethod || '',
      languages: data.languages ? data.languages.split(',').map(l => l.trim()) : ['Tiếng Việt'],
      location: 'Hà Nội', // TODO: Add location to schema
      reviews: [] // TODO: Fetch reviews from reviews table
    };
  }, [enrichedData]);

  const error = queryError?.message || null;

  const occupationLabels: Record<string, string> = {
    teacher: 'Giáo viên',
    student: 'Sinh viên',
    professional: 'Chuyên gia'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Đang tải thông tin giáo viên...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Không tìm thấy giáo viên</h2>
              <p className="text-muted-foreground mb-6">{error || 'Giáo viên này không tồn tại hoặc đã bị xóa.'}</p>
              <Button onClick={() => window.location.href = '/tutors'}>
                Quay lại danh sách giáo viên
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
                  {typeof tutor.occupation === 'object' && tutor.occupation && 'label' in tutor.occupation
                    ? tutor.occupation.label
                    : tutor.occupation === 'student' ? 'Sinh viên'
                    : tutor.occupation === 'teacher' ? 'Giáo viên'
                    : tutor.occupation === 'professional' ? 'Chuyên gia'
                    : 'Giáo viên'}
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
                    onClick={handleTrialBooking}
                    data-testid="button-book-trial"
                  >
                    <Calendar className="h-5 w-5" />
                    Đặt lịch học thử miễn phí
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
                  Lịch dạy trong tuần
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {tutor.availableSlotDetails.filter((s: AvailableSlot) => !s.isBusy).length} ca trống • {' '}
                  {tutor.availableSlotDetails.filter((s: AvailableSlot) => s.isBusy).length} ca đã có học viên
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tutor.availableSlotDetails.map((slot: AvailableSlot) => {
                    const isBusy = slot.isBusy || false;
                    const sessionsPerWeek = slot.sessionsPerWeek || 1;
                    const bookedDays = slot.bookingCount || 0;
                    const availableDays = sessionsPerWeek - bookedDays;
                    const hasPartialBooking = bookedDays > 0 && bookedDays < sessionsPerWeek;
                    
                    return (
                      <div 
                        key={slot.id} 
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isBusy 
                            ? 'border-muted bg-muted/30 opacity-75' 
                            : hasPartialBooking
                            ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/10'
                            : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                        }`}
                        data-testid={`slot-${slot.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <Badge variant="outline" className="font-semibold text-base px-3 py-1">
                                {slot.dayLabels}
                              </Badge>
                              <Badge variant="secondary" className="text-sm">
                                {sessionsPerWeek} buổi/tuần
                              </Badge>
                              
                              {isBusy ? (
                                <Badge variant="destructive" className="bg-red-600">
                                  <span className="mr-1">�</span> Đã có học viên
                                </Badge>
                              ) : hasPartialBooking ? (
                                <Badge variant="default" className="bg-orange-600">
                                  <span className="mr-1">⚡</span> Còn {availableDays}/{sessionsPerWeek} buổi
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <span className="mr-1">✓</span> Trống
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm mb-2">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="font-medium">{slot.startTime} - {slot.endTime}</span>
                              </div>
                              <div className="font-bold text-primary text-base">
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                }).format(slot.price)}/buổi
                              </div>
                            </div>
                            
                            <p className="text-xs text-muted-foreground">
                              Học phí/tháng: ~{new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(slot.price * sessionsPerWeek * 4)}
                            </p>
                            
                            {isBusy && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Ca này đã có học viên đăng ký. Bạn có thể chọn ca khác hoặc liên hệ giáo viên để đề xuất thời gian mới.
                              </p>
                            )}
                          </div>
                          
                          <Button 
                            size="lg" 
                            onClick={() => handleSlotBooking(slot.id)}
                            disabled={isBusy}
                            data-testid={`button-book-${slot.id}`}
                            className={`shrink-0 min-w-[130px] ${
                              isBusy 
                                ? 'cursor-not-allowed' 
                                : hasPartialBooking
                                ? 'bg-orange-600 hover:bg-orange-700' 
                                : ''
                            }`}
                            title={isBusy ? 'Ca này đã có học viên, vui lòng chọn ca khác' : 'Đặt lịch học ngay'}
                          >
                            {isBusy ? (
                              <>
                                <span className="mr-1">🔒</span> Đã có học viên
                              </>
                            ) : hasPartialBooking ? (
                              <>
                                <span className="mr-1">⚡</span> Đặt ngay
                              </>
                            ) : (
                              'Đặt lịch'
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {tutor.availableSlotDetails.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium mb-1">Giáo viên chưa đăng ký ca dạy nào</p>
                      <p className="text-sm">Vui lòng liên hệ trực tiếp với giáo viên để sắp xếp lịch học</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Lưu ý khi đặt lịch
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Đây là lớp <strong className="text-foreground">kèm riêng 1-1</strong>, mỗi ca chỉ dành cho 1 học viên</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>Ca có badge <Badge variant="destructive" className="inline-flex mx-1 bg-red-600 text-xs">Đã có học viên</Badge> nghĩa là đã có người đăng ký, không thể chọn ca này</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>Một số ca học nhiều buổi/tuần (VD: T2,4,6) có thể còn một vài buổi trống - bạn vẫn có thể đăng ký</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>Bạn có thể đề xuất thời gian khác qua tin nhắn với giáo viên nếu các ca hiện tại không phù hợp</span>
                    </li>
                  </ul>
                </div>
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

        {/* Booking Dialog - Single unified dialog */}
        <Suspense fallback={null}>
          <BookingDialog
            open={regularBookingOpen}
            onOpenChange={setRegularBookingOpen}
            tutorId={parseInt(tutorId)}
            tutorName={tutor.name}
            hourlyRate={tutor.hourlyRate}
            lessonDuration={tutor.lessonDuration}
            availableSlots={tutor.availableSlotDetails}
            tutorSubjects={tutor.subjects}
            preSelectedSlotId={preSelectedSlotId}
            openAsTrialMode={openAsTrialMode}
          />
        </Suspense>
      </div>
    </div>
  );
}
