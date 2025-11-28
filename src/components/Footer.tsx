import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <Logo size="sm" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Nền tảng kết nối giáo viên và học viên trực tuyến hàng đầu Việt Nam
            </p>
            <div className="flex gap-2">
              <a href="#" className="h-9 w-9 flex items-center justify-center rounded-md hover-elevate bg-muted" data-testid="link-facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 flex items-center justify-center rounded-md hover-elevate bg-muted" data-testid="link-twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 flex items-center justify-center rounded-md hover-elevate bg-muted" data-testid="link-instagram">
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Về chúng tôi</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">Giới thiệu</Link></li>
              <li><Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">Cách hoạt động</Link></li>
              <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">Bảng giá</Link></li>
              <li><Link href="/faq" className="text-muted-foreground hover:text-foreground">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Dành cho</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/for-tutors" className="text-muted-foreground hover:text-foreground">Giáo viên</Link></li>
              <li><Link href="/for-students" className="text-muted-foreground hover:text-foreground">Học viên</Link></li>
              <li><Link href="/for-parents" className="text-muted-foreground hover:text-foreground">Phụ huynh</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Liên hệ</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>support@lophoc.online</span>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>1900 xxxx</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>Hà Nội, Việt Nam</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2025 LopHoc.Online. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground">Chính sách bảo mật</Link>
              <Link href="/terms" className="hover:text-foreground">Điều khoản sử dụng</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
