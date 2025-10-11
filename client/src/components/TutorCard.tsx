import { Star, CheckCircle2, Video, Clock, Briefcase } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";

interface SubjectDetail {
  name: string;
  grades: string;
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
  occupation: 'student' | 'teacher' | 'professional';
  availableSlots: string[];
}

const occupationLabels = {
  student: 'Sinh viên',
  teacher: 'Giáo viên',
  professional: 'Đã đi làm'
};

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
  availableSlots,
}: TutorCardProps) {
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
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-availability-${id}`}>
              {availableSlots.join(', ')}
            </p>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-4 sm:p-6 pt-0 flex items-center justify-between gap-3 flex-wrap border-t bg-muted/30">
        <div className="flex items-baseline gap-1">
          <span className="text-xl sm:text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>{hourlyRate.toLocaleString('vi-VN')}đ</span>
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
