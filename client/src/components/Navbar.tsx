import { useState } from "react";
import { Link } from "wouter";
import { Search, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { LoginDialog } from "./LoginDialog";
import { NotificationDropdown } from "./NotificationDropdown";

export function Navbar() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/">
              <Logo size="sm" />
            </Link>

            <div className="flex-1 max-w-2xl hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm gia sư theo môn học, cấp lớp..."
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/tutor-registration">
                <Button variant="ghost" size="sm" className="hidden lg:flex" data-testid="button-become-tutor">
                  Trở thành gia sư
                </Button>
              </Link>
              <NotificationDropdown />
              <ThemeToggle />
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
            </div>
          </div>
        </div>
      </nav>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
