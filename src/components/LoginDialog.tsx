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
import { Mail, Lock } from "lucide-react";
import { SiGoogle, SiFacebook } from "react-icons/si";
import { ForgotPasswordDialog } from "./ForgotPasswordDialog";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement JWT authentication
    console.log("Email auth:", { email, password, name });
    
    // Simulate successful login - save to localStorage
    const userData = {
      name: isLogin ? email.split('@')[0] : name,
      email: email,
      loginMethod: 'email'
    };
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Close dialog and reload to show updated home page
    onOpenChange(false);
    window.location.reload();
  };

  const handleGoogleAuth = () => {
    // TODO: Implement Google OAuth
    console.log("Google auth");
    
    // Simulate successful login
    const userData = {
      name: 'Người dùng Google',
      email: 'user@gmail.com',
      loginMethod: 'google'
    };
    localStorage.setItem('user', JSON.stringify(userData));
    
    onOpenChange(false);
    window.location.reload();
  };

  const handleFacebookAuth = () => {
    // TODO: Implement Facebook OAuth
    console.log("Facebook auth");
    
    // Simulate successful login
    const userData = {
      name: 'Người dùng Facebook',
      email: 'user@facebook.com',
      loginMethod: 'facebook'
    };
    localStorage.setItem('user', JSON.stringify(userData));
    
    onOpenChange(false);
    window.location.reload();
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
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <Input
                  id="name"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  data-testid="input-name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
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
                  data-testid="input-password"
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-sm text-primary hover:underline"
                  data-testid="button-forgot-password"
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full" data-testid="button-submit-auth">
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
            </span>{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
              data-testid="button-toggle-auth-mode"
            >
              {isLogin ? "Đăng ký ngay" : "Đăng nhập"}
            </button>
          </div>
        </div>
      </DialogContent>
      <ForgotPasswordDialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen} />
    </Dialog>
  );
}
