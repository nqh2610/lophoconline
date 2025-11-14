"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Loader2, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Lazy load TutorRegistrationForm - it's a heavy component
const TutorRegistrationForm = dynamic(
  () => import("@/components/TutorRegistrationForm").then(mod => ({ default: mod.TutorRegistrationForm })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
);

export default function TutorRegistration() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [existingTutorId, setExistingTutorId] = useState<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated - but do it immediately to avoid flash
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?redirectTo=%2Ftutor-registration");
    }
  }, [status, router]);

    // Check if user already has a tutor profile
  useEffect(() => {
    async function checkExistingTutor() {
      if (status === 'loading') return;
      if (!session?.user?.id) {
        setIsCheckingExisting(false);
        return;
      }

      try {
        const response = await fetch(`/api/tutors?userId=${session.user.id}`);
        if (response.ok) {
          const tutors = await response.json();
          if (tutors && tutors.length > 0) {
            const existing = tutors[0];
            setHasExistingProfile(true);
            setExistingTutorId(existing.id ?? null);
          }
        }
      } catch (error) {
        console.error('Error checking existing tutor:', error);
      } finally {
        setIsCheckingExisting(false);
      }
    }

    checkExistingTutor();
  }, [session, status, router, toast]);

  // Auto-scroll to form when in edit mode and we know the existing tutor id
  useEffect(() => {
    if (hasExistingProfile && existingTutorId && formRef.current && !isCheckingExisting) {
      // Small delay to ensure DOM is ready and the form can pick up initial props
      setTimeout(() => {
        formRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 300);
    }
  }, [hasExistingProfile, existingTutorId, isCheckingExisting]);

  // Show loading during auth check or existing profile check to prevent flash
  if (status === "loading" || status === "unauthenticated" || isCheckingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isCheckingExisting ? 'Đang kiểm tra hồ sơ...' : 'Đang kiểm tra đăng nhập...'}
          </p>
        </div>
      </div>
    );
  }

  // This fallback should rarely show due to the useEffect redirect above
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Yêu cầu đăng nhập</CardTitle>
            <CardDescription>
              Bạn cần đăng nhập để đăng ký làm gia sư
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login?redirectTo=%2Ftutor-registration">
              <Button className="w-full">
                Đăng nhập
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Đã đăng nhập - hiển thị form đăng ký
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trang chủ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-tutor-registration">
            {hasExistingProfile ? 'Chỉnh sửa hồ sơ gia sư' : 'Đăng ký làm gia sư'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Xin chào <span className="font-semibold">{session.user?.name || session.user?.email}</span>! 
            {hasExistingProfile 
              ? ' Bạn đã có hồ sơ gia sư. Cập nhật thông tin bên dưới.'
              : ' Điền thông tin bên dưới để trở thành gia sư trên LopHoc.Online'
            }
          </p>
        </div>

        {/* Show info card if user already has profile */}
        {hasExistingProfile && (
          <Card className="mb-6 border-blue-200 bg-blue-50" id="edit-info-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Bạn đã có hồ sơ gia sư
                  </h3>
                  <p className="text-blue-700 text-sm mb-3">
                    Bạn có thể chỉnh sửa thông tin hồ sơ của mình bên dưới, hoặc quay lại dashboard để quản lý lớp học.
                  </p>
                  <div className="flex gap-2">
                    <Link href="/tutor/dashboard">
                      <Button variant="outline" size="sm" className="bg-white">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Về Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration/Edit Form */}
        <div ref={formRef}>
          {/* Pass initial mode and tutorId when we detected an existing profile to avoid race conditions */}
          <TutorRegistrationForm mode={hasExistingProfile ? 'edit' : 'create'} tutorId={existingTutorId ?? undefined} />
        </div>
      </div>
    </div>
  );
}
