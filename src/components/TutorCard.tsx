import { Star, CheckCircle2, Video, Clock, Briefcase } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useMemo } from "react";

interface SubjectDetail {
  name: string;
  grades: string;
}

interface TimeSlot {
  dayOfWeek: number;
  shiftType: string;
  startTime: string;
  endTime: string;
}

interface TutorCardProps {
  id: string;
  name: string;
  avatar?: string;
  subjects: SubjectDetail[];
  tutorSubjects?: any[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string | number; // Accept both string and number for flexibility
  verified: boolean;
  hasVideo: boolean;
  occupation?: {
    id: number;
    label: string;
  } | 'student' | 'teacher' | 'professional' | 'tutor'; // Support both new and legacy formats
  availableSlots?: TimeSlot[];
}

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const shiftLabels: Record<string, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối'
};

// Calculate hours from time range
function calculateHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return (endMinutes - startMinutes) / 60;
}

export function TutorCard({
  name,
  avatar,
  subjects,
  tutorSubjects = [],
  rating,
  reviewCount,
  hourlyRate,
  experience,
  verified,
  hasVideo,
  id,
  occupation,
  availableSlots = [],
}: TutorCardProps) {
  // Format experience display - handle both string and number
  const experienceText = useMemo(() => {
    // If already a formatted string, return as-is
    if (typeof experience === 'string' && isNaN(Number(experience))) {
      return experience;
    }
    
    // Convert to number and format
    const years = typeof experience === 'number' ? experience : Number(experience) || 0;
    return years < 1 
      ? "Dưới 1 năm kinh nghiệm"
      : `${years} năm kinh nghiệm`;
  }, [experience]);

  // Memoize displaySubjects to avoid re-computation on every render
  const displaySubjects: SubjectDetail[] = useMemo(() => {
    if (subjects && subjects.length > 0) return subjects;

    const ts = Array.isArray(tutorSubjects) ? tutorSubjects : [];
    if (ts.length === 0) return [];

    const groups: Record<string, Set<string>> = {};
    ts.forEach((t: any) => {
      const subjectName = t?.subject?.name || t.subjectName || '';
      const gradeName = t?.gradeLevel?.name || t.gradeLevelName || '';
      if (!subjectName) return;
      groups[subjectName] = groups[subjectName] || new Set<string>();
      if (gradeName) groups[subjectName].add(gradeName);
    });

    return Object.entries(groups).map(([name, set]) => ({ name, grades: Array.from(set).join(', ') }));
  }, [subjects, tutorSubjects]);

  // Format grades string for display: expand ranges like "Lớp 10-12" -> "10, 11, 12"
  function formatGrades(grades: string | undefined) {
    if (!grades) return '';
    // Split by comma, semicolon or slash
    const parts = grades.split(/[,;/]+/).map(p => p.trim()).filter(Boolean);
    const out: string[] = [];

    parts.forEach(p => {
      // Match ranges like "Lớp 10-12" or "10-12"
      const rangeMatch = p.match(/(?:[Ll]ớp\s*)?(\d{1,2})\s*-\s*(\d{1,2})/);
      const singleMatch = p.match(/(?:[Ll]ớp\s*)?(\d{1,2})$/);
      if (rangeMatch) {
        const a = parseInt(rangeMatch[1], 10);
        const b = parseInt(rangeMatch[2], 10);
        if (!isNaN(a) && !isNaN(b) && b >= a) {
          for (let i = a; i <= b; i++) out.push(String(i));
          return;
        }
      }
      if (singleMatch) {
        out.push(singleMatch[1]);
        return;
      }
      // If not a numeric class, keep original (e.g., "Luyện thi ĐH", "IELTS")
      out.push(p);
    });

    // Deduplicate while preserving order
    return Array.from(new Set(out)).join(', ');
  }
  // Memoize availability formatting to avoid re-computation
  const formattedAvailability = useMemo(() => {
    // Group slots by shift type for display
    const slotsByShift = availableSlots.reduce((acc, slot) => {
      const shift = shiftLabels[slot.shiftType] || slot.shiftType;
      if (!acc[shift]) {
        acc[shift] = new Set<number>();
      }
      acc[shift].add(slot.dayOfWeek);
      return acc;
    }, {} as Record<string, Set<number>>);

    // Format availability with days
    return Object.entries(slotsByShift)
      .sort(([a], [b]) => {
        const order = ['Sáng', 'Chiều', 'Tối'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([shift, days]) => {
        const sortedDays = Array.from(days).sort((a, b) => a - b);
        const daysList = sortedDays.map(d => dayNames[d]).join(', ');
        return { shift, days: daysList };
      });
  }, [availableSlots]);

  return (
    <Card className="h-full flex flex-col hover-elevate overflow-hidden" data-testid={`card-tutor-${id}`}>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        {/* Header Section */}
        <div className="p-4 sm:p-6">
          <div className="flex gap-4 mb-4">
            <Avatar className="h-20 w-20 flex-shrink-0 border-2 border-primary/10">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">{name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Link href={`/tutor/${id}`}>
                <h3 className="font-bold text-xl mb-1 hover:text-primary transition-colors cursor-pointer" data-testid={`text-tutor-name-${id}`}>
                  {name}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mb-2 flex-wrap mt-2">
                {occupation && (
                  <Badge variant="secondary" className="gap-1.5">
                    <Briefcase className="h-3 w-3" />
                    <span className="text-xs" data-testid={`text-occupation-${id}`}>
                      {typeof occupation === 'object' && 'label' in occupation 
                        ? occupation.label 
                        : occupation === 'student' ? 'Sinh viên'
                        : occupation === 'teacher' ? 'Giáo viên'
                        : occupation === 'professional' ? 'Chuyên gia'
                        : 'Gia sư'}
                    </span>
                  </Badge>
                )}
                {verified && (
                  <Badge variant="outline" className="gap-1 border-chart-2/30 text-chart-2 shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-xs">Đã xác thực</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <div className="flex items-center gap-1" data-testid={`text-rating-${id}`}>
                  <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">({reviewCount})</span>
                </div>
                {hasVideo && (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <Video className="h-3 w-3" />
                    <span className="text-xs">Video</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{experienceText}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4 sm:mx-6" />

        {/* Info Section */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 bg-primary rounded-full flex-shrink-0" />
              <h4 className="text-sm font-semibold">Môn dạy</h4>
            </div>
            {displaySubjects && displaySubjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displaySubjects.slice(0, 5).map((subject, idx) => (
                  <Badge key={idx} variant="secondary" className="font-medium text-xs">
                    {subject.name}
                    {subject.grades && (
                      <span className="text-muted-foreground ml-1">({formatGrades(subject.grades)})</span>
                    )}
                  </Badge>
                ))}
                {displaySubjects.length > 5 && (
                  <Badge variant="outline" className="font-medium text-xs">
                    +{displaySubjects.length - 5}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Chưa có thông tin môn dạy</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <h4 className="text-sm font-semibold">Lịch còn trống</h4>
            </div>
            {formattedAvailability.length > 0 ? (
              <div className="space-y-2">
                {formattedAvailability.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <div className="leading-relaxed">
                      <span className="font-medium text-foreground">{item.shift}:</span>{' '}
                      <span className="text-muted-foreground">{item.days}</span>
                    </div>
                  </div>
                ))}
                {formattedAvailability.length > 3 && (
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Clock className="h-3 w-3" />
                    <span>+{formattedAvailability.length - 3} ca khác</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={`text-availability-${id}`}>
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                <span className="italic">Chưa có lịch trống</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-4 sm:p-6 pt-0 flex items-center justify-between gap-3 flex-wrap border-t bg-muted/30">
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>
            {hourlyRate.toLocaleString('vi-VN')}đ
          </span>
          <span className="text-sm text-muted-foreground font-medium">/giờ</span>
        </div>
        <Button size="default" data-testid={`button-view-profile-${id}`} asChild>
          <Link href={`/tutor/${id}`} prefetch={true}>
            Xem chi tiết
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
