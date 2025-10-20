"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, GraduationCap, UserCircle, DollarSign, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: Home,
  },
  {
    title: "Người dùng",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Học viên",
    href: "/admin/students",
    icon: UserCircle,
  },
  {
    title: "Gia sư",
    href: "/admin/tutors",
    icon: GraduationCap,
  },
  {
    title: "Giao dịch",
    href: "/admin/transactions",
    icon: Receipt,
  },
  {
    title: "Tài chính",
    href: "/admin/financial",
    icon: DollarSign,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 whitespace-nowrap",
                    isActive && "bg-destructive hover:bg-destructive/90"
                  )}
                >
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
