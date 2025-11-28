"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Star, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 via-background to-background py-20 md:py-32">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utb3BhY2l0eT0iLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L2c+PC9zdmc+')] opacity-30"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Kết nối với <span className="text-primary whitespace-nowrap">giáo viên chất lượng</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Nền tảng học trực tuyến tin cậy với hơn <strong className="text-foreground">5,000+ giáo viên</strong> đã được xác thực.
            Học thử miễn phí, thanh toán an toàn, hoàn tiền nếu không hài lòng.
          </p>

          {/* Key Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm rounded-lg p-4 border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Giáo viên đã xác thực</p>
                <p className="text-xs text-muted-foreground">100% có bằng cấp</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm rounded-lg p-4 border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Đánh giá 4.8/5</p>
                <p className="text-xs text-muted-foreground">Từ 50,000+ học viên</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-background/50 backdrop-blur-sm rounded-lg p-4 border">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Học thử miễn phí</p>
                <p className="text-xs text-muted-foreground">Không hài lòng hoàn tiền</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tutors">
              <Button size="lg" className="h-12 px-8 text-base gap-2" data-testid="button-find-tutor">
                Tìm giáo viên ngay
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/tutor-registration">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" data-testid="button-become-tutor">
                Trở thành giáo viên
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Thanh toán an toàn</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Hỗ trợ 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Hoàn tiền dễ dàng</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
