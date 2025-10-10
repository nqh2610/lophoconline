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

interface TutorDetailData {
  id: string;
  name: string;
  avatar: string;
  subjects: Subject[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string;
  verified: boolean;
  hasVideo: boolean;
  videoUrl?: string;
  occupation: 'student' | 'teacher' | 'professional';
  availableSlots: string[];
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
    experience: '5 năm kinh nghiệm dạy THPT',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'teacher' as const,
    availableSlots: ['T2, T4, T6 (19h-21h)', 'T7, CN (14h-20h)'],
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
    experience: '7 năm kinh nghiệm IELTS, TOEFL',
    verified: true,
    hasVideo: true,
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    occupation: 'professional' as const,
    availableSlots: ['T3, T5, T7 (18h-21h)', 'CN (9h-18h)'],
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">Giới thiệu</TabsTrigger>
            <TabsTrigger value="schedule">Lịch trống</TabsTrigger>
            <TabsTrigger value="reviews">Đánh giá</TabsTrigger>
            <TabsTrigger value="achievements">Thành tích</TabsTrigger>
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
                <div className="space-y-3">
                  {tutor.availableSlots.map((slot: string, index: number) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      data-testid={`slot-${index}`}
                    >
                      <span className="font-medium">{slot}</span>
                      <Button 
                        size="sm" 
                        onClick={() => setRegularBookingOpen(true)}
                        data-testid={`button-book-slot-${index}`}
                      >
                        Đặt lịch
                      </Button>
                    </div>
                  ))}
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

          {/* Achievements Tab */}
          <TabsContent value="achievements">
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
        </Tabs>

        {/* Booking Dialogs */}
        <BookingDialog
          open={trialBookingOpen}
          onOpenChange={setTrialBookingOpen}
          tutorName={tutor.name}
          hourlyRate={tutor.hourlyRate}
          isTrial={true}
        />
        <BookingDialog
          open={regularBookingOpen}
          onOpenChange={setRegularBookingOpen}
          tutorName={tutor.name}
          hourlyRate={tutor.hourlyRate}
          isTrial={false}
        />
      </div>
    </div>
  );
}
