import { TutorRegistrationForm } from "@/components/TutorRegistrationForm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function TutorRegistration() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trang chủ
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-tutor-registration">
            Đăng ký làm gia sư
          </h1>
          <p className="text-muted-foreground mt-2">
            Điền thông tin bên dưới để trở thành gia sư trên LopHoc.Online
          </p>
        </div>

        {/* Registration Form */}
        <TutorRegistrationForm />
      </div>
    </div>
  );
}
