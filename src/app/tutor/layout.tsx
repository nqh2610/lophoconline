"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PendingApprovalBanner } from "@/components/PendingApprovalBanner";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  Users,
  DollarSign,
  Star,
  Settings,
  Clock,
  BookOpen
} from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/tutor", icon: Home },
  { title: "Lịch dạy", href: "/tutor/availability", icon: Calendar },
  { title: "Học viên", href: "/tutor/students", icon: Users },
  { title: "Buổi học", href: "/tutor/lessons", icon: BookOpen },
  { title: "Thu nhập", href: "/tutor/earnings", icon: DollarSign },
  { title: "Đánh giá", href: "/tutor/reviews", icon: Star },
  { title: "Cài đặt", href: "/tutor/settings", icon: Settings },
];

function TutorNav() {
  const pathname = usePathname();

  // Don't show nav for public tutor detail pages (e.g., /tutor/1, /tutor/123)
  if (pathname && pathname.match(/^\/tutor\/\d+$/)) {
    return null;
  }

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm" className="gap-2 whitespace-nowrap">
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is a public tutor detail page
  const isPublicPage = pathname && pathname.match(/^\/tutor\/\d+$/);

  // Fetch tutor profile to check approval status
  useEffect(() => {
    async function fetchTutorProfile() {
      // Skip if public page or no session
      if (isPublicPage || !session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/tutors?userId=${session.user.id}`);
        if (response.ok) {
          const tutors = await response.json();
          if (tutors && tutors.length > 0) {
            setTutorProfile(tutors[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching tutor profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTutorProfile();
  }, [session, isPublicPage]);

  // Note: Access control is handled by middleware
  // Public tutor detail pages (/tutor/[id]) don't require authentication

  return (
    <div>
      <TutorNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Show approval banner for protected tutor pages only */}
        {!isPublicPage && !isLoading && tutorProfile && (
          <PendingApprovalBanner
            approvalStatus={tutorProfile.approvalStatus || 'pending'}
            rejectionReason={tutorProfile.rejectionReason}
          />
        )}
        {children}
      </div>
    </div>
  );
}
