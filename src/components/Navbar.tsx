"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn, LogOut, User, Search, GraduationCap, BookOpen, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { NotificationDropdown } from "./NotificationDropdown";
import { SearchBar } from "./SearchBar";
import { MobileSearchDialog } from "./MobileSearchDialog";
import { useSession, signOut } from "next-auth/react";
import { useUserRoles } from "@/hooks/use-user-roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { data: session, status } = useSession();

  // ✅ REALTIME: Use custom hook to fetch fresh user roles from database
  const { hasRole, refetch } = useUserRoles();

  // ✅ REALTIME: Refetch roles when window gains focus (e.g., after booking in another tab or returning to the page)
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session?.user, refetch]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // Render tutor button based on role
  const renderTutorButton = () => {
    // If user is logged in and has tutor role - show edit button
    if (session?.user && hasRole('tutor')) {
      return (
        <Link href="/tutor-registration">
          <Button variant="ghost" size="sm" className="hidden lg:flex gap-2" data-testid="button-edit-tutor">
            <Edit className="h-4 w-4" />
            Sửa thông tin gia sư
          </Button>
        </Link>
      );
    }
    
    // For not logged in OR logged in without tutor role - show become tutor button
    return (
      <Link href="/tutor-registration">
        <Button variant="ghost" size="sm" className="hidden lg:flex" data-testid="button-become-tutor">
          Trở thành gia sư
        </Button>
      </Link>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/">
              <Logo size="sm" />
            </Link>

            <div className="hidden md:block flex-1 max-w-2xl">
              <SearchBar />
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileSearchOpen(true)}
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Tutor button - changes based on profile status */}
              {renderTutorButton()}
              
              <NotificationDropdown />
              <ThemeToggle />

              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-user-menu">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{session.user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Show tutor dashboard link if user has tutor role */}
                    {hasRole('tutor') && (
                      <Link href="/tutor/dashboard">
                        <DropdownMenuItem data-testid="menu-tutor-dashboard">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          Dashboard gia sư
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {/* Show student dashboard link if user has student role */}
                    {hasRole('student') && (
                      <Link href="/student/dashboard">
                        <DropdownMenuItem data-testid="menu-student-dashboard">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Dashboard học viên
                        </DropdownMenuItem>
                      </Link>
                    )}

                    {/* Don't show admin dashboard in menu for security (admin can access via URL) */}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                      <LogOut className="h-4 w-4 mr-2" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-2"
                    data-testid="button-login"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Đăng nhập</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <MobileSearchDialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />
    </>
  );
}
