import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, BookOpen, Calendar, CreditCard, User, Bell } from "lucide-react";

const navItems = [
  { title: "Trang chủ", href: "/student", icon: Home },
  { title: "Tìm gia sư", href: "/tutors", icon: BookOpen },
  { title: "Lớp học của tôi", href: "/student/classes", icon: Calendar },
  { title: "Thanh toán", href: "/student/payments", icon: CreditCard },
  { title: "Hồ sơ", href: "/student/profile", icon: User },
  { title: "Thông báo", href: "/student/notifications", icon: Bell },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: Access control is handled by middleware
  // Middleware allows admin with ?_impersonate=X&_role=student to access student routes

  return (
    <div>
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
      {children}
    </div>
  );
}
