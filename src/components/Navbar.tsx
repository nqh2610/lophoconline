"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogIn, LogOut, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { LoginDialog } from "./LoginDialog";
import { NotificationDropdown } from "./NotificationDropdown";
import { SearchBar } from "./SearchBar";
import { MobileSearchDialog } from "./MobileSearchDialog";
import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { data: session } = useSession();

  // Auto-open login dialog when query param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "required") {
      setLoginOpen(true);
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const getDashboardLink = () => {
    if (!session?.user?.role) return "/";
    switch (session.user.role) {
      case "admin":
        return "/admin";
      case "tutor":
        return "/tutor";
      case "student":
        return "/student";
      default:
        return "/";
    }
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

              <Link href="/tutor-registration">
                <Button variant="ghost" size="sm" className="hidden lg:flex" data-testid="button-become-tutor">
                  Trở thành gia sư
                </Button>
              </Link>
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
                    <Link href={getDashboardLink()}>
                      <DropdownMenuItem data-testid="menu-dashboard">
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                    <Link href={getDashboardLink()}>
                      <DropdownMenuItem data-testid="menu-profile">
                        Hồ sơ của tôi
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                      <LogOut className="h-4 w-4 mr-2" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="gap-2" 
                  onClick={() => setLoginOpen(true)}
                  data-testid="button-login"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <MobileSearchDialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />
    </>
  );
}
