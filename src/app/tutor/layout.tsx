"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  // Note: Access control is handled by middleware
  // Public tutor detail pages (/tutor/[id]) don't require authentication

  return (
    <div>
      <TutorNav />
      {children}
    </div>
  );
}
