import { Star, CheckCircle2, Video, Clock } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TutorCardProps {
  id: string;
  name: string;
  avatar?: string;
  subjects: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  experience: string;
  verified: boolean;
  hasVideo: boolean;
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
}: TutorCardProps) {
  return (
    <Card className="hover-elevate overflow-visible" data-testid={`card-tutor-${id}`}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate" data-testid={`text-tutor-name-${id}`}>
                {name}
              </h3>
              {verified && (
                <Badge variant="outline" className="gap-1 shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-chart-2" />
                  <span className="text-xs">Đã xác thực</span>
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{experience}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {subjects.slice(0, 3).map((subject) => (
                <Badge key={subject} variant="secondary" className="text-xs">
                  {subject}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
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
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary">{hourlyRate.toLocaleString('vi-VN')}đ</span>
          <span className="text-sm text-muted-foreground">/giờ</span>
        </div>
        <Button size="sm" data-testid={`button-view-profile-${id}`}>
          Xem chi tiết
        </Button>
      </CardFooter>
    </Card>
  );
}
