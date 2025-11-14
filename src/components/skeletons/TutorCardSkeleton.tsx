import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TutorCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-2">
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        {/* Header Section */}
        <div className="p-4 sm:p-6">
          <div className="flex gap-4 mb-4">
            {/* Avatar skeleton */}
            <Skeleton className="h-20 w-20 rounded-full flex-shrink-0" />

            <div className="flex-1 min-w-0 space-y-3">
              {/* Name skeleton */}
              <Skeleton className="h-6 w-3/4 max-w-[200px]" />
              
              {/* Badges skeleton */}
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              
              {/* Rating skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Experience text skeleton */}
          <Skeleton className="h-4 w-full max-w-[300px]" />
          <Skeleton className="h-4 w-2/3 max-w-[200px] mt-2" />
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4 sm:mx-6" />

        {/* Info Section */}
        <div className="p-4 sm:p-6 space-y-4 flex-1">
          {/* Subjects section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
          </div>

          {/* Availability section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-full max-w-[250px]" />
              </div>
              <div className="flex items-start gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-5/6 max-w-[220px]" />
              </div>
              <div className="flex items-start gap-2">
                <Skeleton className="h-1.5 w-1.5 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-4/6 max-w-[180px]" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-4 sm:p-6 pt-4 flex items-center justify-between gap-3 border-t bg-muted/30">
        <div className="flex items-baseline gap-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </CardFooter>
    </Card>
  );
}

// Grid of skeleton cards
export function TutorCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <TutorCardSkeleton key={i} />
      ))}
    </div>
  );
}
