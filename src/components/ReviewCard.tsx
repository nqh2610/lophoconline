import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReviewCardProps {
  id: string;
  studentName: string;
  studentAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  subject: string;
}

export function ReviewCard({
  id,
  studentName,
  studentAvatar,
  rating,
  comment,
  date,
  subject,
}: ReviewCardProps) {
  return (
    <Card data-testid={`card-review-${id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={studentAvatar} alt={studentName} />
            <AvatarFallback>{studentName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium">{studentName}</h4>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rating ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{subject} • {date}</p>
            <p className="text-sm">{comment}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
