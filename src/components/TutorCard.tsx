import { Star, CheckCircle2, Video, Clock, Briefcase } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

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
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string;
  verified: boolean;
  hasVideo: boolean;
  occupation: 'student' | 'teacher' | 'professional' | 'tutor';
  availableSlots?: TimeSlot[];
}

const occupationLabels = {
  student: 'Sinh viên',
  teacher: 'Giáo viên',
  professional: 'Đã đi làm',
  tutor: 'Gia sư'
};

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
  // Group time slots by day
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    const key = `${slot.dayOfWeek}-${slot.shiftType}`;
    if (!acc[key]) {
      acc[key] = slot;
    }
    return acc;
  }, {} as Record<string, TimeSlot>);

  // Calculate session price (per session) and monthly price
  const firstSlot = availableSlots[0];
  const hoursPerSession = firstSlot ? calculateHours(firstSlot.startTime, firstSlot.endTime) : 2;
  const pricePerSession = Math.round(hourlyRate * hoursPerSession);
  const sessionsPerMonth = availableSlots.length * 4; // Assuming weekly schedule × 4 weeks
  const pricePerMonth = pricePerSession * Math.min(sessionsPerMonth, 16); // Cap at 16 sessions/month

  // Group slots by shift type for display
  const slotsByShift = availableSlots.reduce((acc, slot) => {
    const shift = shiftLabels[slot.shiftType] || slot.shiftType;
    if (!acc[shift]) {
      acc[shift] = new Set<number>();
    }
    acc[shift].add(slot.dayOfWeek);
    return acc;
  }, {} as Record<string, Set<number>>);

  // Format available slots for display by shift
  const formattedSlots = Object.entries(slotsByShift).map(([shift, days]) => {
    const sortedDays = Array.from(days).sort((a, b) => a - b);
    const daysList = sortedDays.map(d => dayNames[d]).join(', ');
    return `${shift}: ${daysList}`;
  });

  return (
    <Card className="h-full flex flex-col hover-elevate overflow-visible" data-testid={`card-tutor-${id}`}>
      <CardContent className="p-0 flex-1 flex flex-col">
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
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  <span className="text-xs" data-testid={`text-occupation-${id}`}>{occupationLabels[occupation]}</span>
                </Badge>
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
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{experience}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4 sm:mx-6" />

        {/* Info Section */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-8 bg-primary rounded-full" />
              <h4 className="text-sm font-semibold">Môn dạy</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject, idx) => (
                <Badge key={idx} variant="secondary" className="font-medium">
                  {subject.name} <span className="text-muted-foreground ml-1">{subject.grades}</span>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Lịch còn trống</h4>
            </div>
            {formattedSlots.length > 0 ? (
              <div className="space-y-1">
                {formattedSlots.slice(0, 3).map((slot, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                    {slot}
                  </p>
                ))}
                {formattedSlots.length > 3 && (
                  <p className="text-xs text-muted-foreground/70 italic">
                    +{formattedSlots.length - 3} khung giờ khác
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic" data-testid={`text-availability-${id}`}>
                Chưa có lịch trống
              </p>
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
          <Link href={`/tutor/${id}`}>
            Xem chi tiết
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
