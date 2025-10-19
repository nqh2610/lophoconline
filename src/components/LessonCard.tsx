import { Calendar, Clock, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LessonCardProps {
  id: string;
  tutorName: string;
  tutorAvatar?: string;
  subject: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

const statusConfig = {
  pending: { label: 'Đang chờ', variant: 'secondary' as const },
  confirmed: { label: 'Đã xác nhận', variant: 'default' as const },
  completed: { label: 'Hoàn thành', variant: 'outline' as const },
  cancelled: { label: 'Đã hủy', variant: 'destructive' as const },
};

export function LessonCard({
  id,
  tutorName,
  tutorAvatar,
  subject,
  date,
  time,
  status,
  price,
}: LessonCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Card className="hover-elevate overflow-visible" data-testid={`card-lesson-${id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tutorAvatar} alt={tutorName} />
              <AvatarFallback>{tutorName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" data-testid={`text-lesson-tutor-${id}`}>
                {tutorName}
              </h3>
              <p className="text-sm text-muted-foreground">{subject}</p>
            </div>
          </div>
          <Badge variant={statusInfo.variant} data-testid={`badge-status-${id}`}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{time}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-primary">{price.toLocaleString('vi-VN')}đ</span>
          {status === 'confirmed' && (
            <Button size="sm" className="gap-2" data-testid={`button-join-lesson-${id}`}>
              <Video className="h-4 w-4" />
              Vào học
            </Button>
          )}
          {status === 'completed' && (
            <Button variant="outline" size="sm" data-testid={`button-review-lesson-${id}`}>
              Đánh giá
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
