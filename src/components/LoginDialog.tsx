import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User as UserIcon } from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";
import { signIn } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Đăng nhập thất bại",
          description: "Tên đăng nhập hoặc mật khẩu không đúng",
          variant: "destructive",
        });
      } else {
        // Check if there's a redirect path stored
        const params = new URLSearchParams(window.location.search);
        const redirectPath = params.get("redirectTo") || params.get("redirect");

        // Validate redirect path to prevent open redirect vulnerability
        let safeRedirectPath = "/";
        if (redirectPath) {
          try {
            const decoded = decodeURIComponent(redirectPath);
            // Only allow relative paths (must start with /)
            // Reject absolute URLs or protocol-relative URLs
            if (decoded.startsWith("/") && !decoded.startsWith("//")) {
              safeRedirectPath = decoded;
            }
          } catch {
            // Invalid redirect path, use default
            safeRedirectPath = "/";
          }
        }

        toast({
          title: "Đăng nhập thành công",
          description: safeRedirectPath !== "/" ? "Đang chuyển hướng..." : "Chào mừng bạn trở lại!",
        });
        onOpenChange(false);

        // Wait a bit for session to be established
        setTimeout(() => {
          if (safeRedirectPath !== "/") {
            // Redirect to the intended page
            router.push(safeRedirectPath);
          } else {
            // Just reload to update the UI
            window.location.reload();
          }
        }, 300);
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi đăng nhập",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Google OAuth not yet implemented
    toast({
      title: "Tính năng chưa hỗ trợ",
      description: "Đăng nhập bằng Google sẽ được hỗ trợ trong tương lai. Vui lòng sử dụng tài khoản email.",
      variant: "default",
    });
  };

  const handleFacebookAuth = () => {
    // Facebook OAuth not yet implemented
    toast({
      title: "Tính năng chưa hỗ trợ",
      description: "Đăng nhập bằng Facebook sẽ được hỗ trợ trong tương lai. Vui lòng sử dụng tài khoản email.",
      variant: "default",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-login">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isLogin ? "Đăng nhập" : "Đăng ký"}
          </DialogTitle>
          <DialogDescription>
            {isLogin
              ? "Đăng nhập để truy cập tài khoản của bạn"
              : "Tạo tài khoản mới để bắt đầu"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleAuth}
              data-testid="button-login-google"
            >
              <SiGoogle className="h-4 w-4" />
              {isLogin ? "Đăng nhập" : "Đăng ký"} với Google
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleFacebookAuth}
              data-testid="button-login-facebook"
            >
              <SiFacebook className="h-4 w-4" />
              {isLogin ? "Đăng nhập" : "Đăng ký"} với Facebook
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Hoặc
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin, student1, tutor1..."
                  className="pl-9"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  data-testid="input-username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-auth">
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium mb-1">Tài khoản test:</p>
            <p className="text-xs">admin/123456 | student1/123456 | tutor1/123456</p>
          </div>
        </div>
      </DialogContent>
      <ForgotPasswordDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </Dialog>
  );
}
