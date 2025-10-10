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
      <CardContent className="p-6 flex-1">
        <div className="flex gap-4 mb-4">
          <Avatar className="h-16 w-16 flex-shrink-0">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link href={`/tutor/${id}`}>
                <h3 className="font-semibold text-lg truncate hover:text-primary transition-colors cursor-pointer" data-testid={`text-tutor-name-${id}`}>
                  {name}
                </h3>
              </Link>
              {verified && (
                <Badge variant="outline" className="gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-chart-2" />
                  <span className="text-xs">Đã xác thực</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid={`text-occupation-${id}`}>{occupationLabels[occupation]}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{experience}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1" data-testid={`text-rating-${id}`}>
            <Star className="h-4 w-4 fill-chart-5 text-chart-5" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </div>
          {hasVideo && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Video className="h-4 w-4" />
              <span>Video</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Môn dạy:</h4>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {subject.name} {subject.grades}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Lịch còn trống:
            </h4>
            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-availability-${id}`}>
              {availableSlots.join(', ')}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>{hourlyRate.toLocaleString('vi-VN')}đ</span>
          <span className="text-sm text-muted-foreground">/giờ</span>
        </div>
        <Button size="sm" data-testid={`button-view-profile-${id}`} asChild>
          <Link href={`/tutor/${id}`}>
            Xem chi tiết
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
