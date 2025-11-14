import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TutorCardSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4 mb-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
          
          <div className="flex-1 space-y-2">
            {/* Name skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Rating and reviews skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            
            {/* Occupation skeleton */}
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        
        {/* Subjects skeleton */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        
        {/* Time slots skeleton */}
        <div className="flex gap-2 flex-wrap mb-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        
        {/* Stats skeleton */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/50 p-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}
