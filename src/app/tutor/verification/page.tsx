"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileCheck, 
  Video, 
  CheckCircle2, 
  Camera,
  ArrowLeft,
  AlertCircle 
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function TutorVerification() {
  const { toast } = useToast();
  const router = useRouter();
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'processing' | 'verified'>('pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'front') setIdCardFront(file);
      else if (type === 'back') setIdCardBack(file);
      else setVideoFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!idCardFront || !idCardBack || !videoFile) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng tải lên đầy đủ ảnh CMND/CCCD và video xác minh",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setVerificationStatus('processing');

    // TODO: Implement OCR and video verification API
    // This would send files to backend for processing
    console.log("Submitting verification:", { idCardFront, idCardBack, videoFile });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));

    setVerificationStatus('verified');
    toast({
      title: "Xác minh thành công!",
      description: "Hồ sơ của bạn đã được xác minh. Bạn có thể tiếp tục bước tiếp theo.",
    });

    setIsSubmitting(false);

    // Redirect to profile setup after 2 seconds
    setTimeout(() => {
      router.push('/tutor/profile-setup');
    }, 2000);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-verification">
            Xác minh danh tính
          </h1>
          <p className="text-muted-foreground mt-2">
            Tải lên CMND/CCCD và video xác minh để hoàn tất quy trình
          </p>
        </div>

        {verificationStatus === 'verified' && (
          <Alert className="mb-6 border-primary">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription>
              Xác minh thành công! Đang chuyển đến bước tiếp theo...
            </AlertDescription>
          </Alert>
        )}

        {/* ID Card Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Tải lên CMND/CCCD
            </CardTitle>
            <CardDescription>
              Vui lòng chụp rõ 2 mặt của CMND/CCCD hoặc Căn cước công dân
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Front Side */}
              <div className="space-y-3">
                <Label htmlFor="id-front">Mặt trước *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Input
                    id="id-front"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'front')}
                    className="hidden"
                    data-testid="input-id-front"
                  />
                  <label htmlFor="id-front" className="cursor-pointer" data-testid="label-id-front">
                    {idCardFront ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                        <p className="text-sm font-medium" data-testid="text-id-front-filename">{idCardFront.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Nhấn để tải lên ảnh mặt trước
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Back Side */}
              <div className="space-y-3">
                <Label htmlFor="id-back">Mặt sau *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Input
                    id="id-back"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'back')}
                    className="hidden"
                    data-testid="input-id-back"
                  />
                  <label htmlFor="id-back" className="cursor-pointer" data-testid="label-id-back">
                    {idCardBack ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                        <p className="text-sm font-medium" data-testid="text-id-back-filename">{idCardBack.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Nhấn để tải lên ảnh mặt sau
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Đảm bảo ảnh rõ ràng, đầy đủ thông tin và không bị mờ hoặc che khuất
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Video Verification */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video xác minh
            </CardTitle>
            <CardDescription>
              Quay video ngắn (15-30 giây) để xác minh danh tính
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Input
                id="video-verification"
                type="file"
                accept="video/*"
                onChange={(e) => handleFileChange(e, 'video')}
                className="hidden"
                data-testid="input-video-verification"
              />
              <label htmlFor="video-verification" className="cursor-pointer">
                {videoFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
                    <p className="text-sm font-medium">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Nhấn để tải lên video xác minh
                    </p>
                  </div>
                )}
              </label>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Hướng dẫn quay video:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Quay ở nơi có ánh sáng tốt</li>
                  <li>Giơ CMND/CCCD lên cạnh khuôn mặt</li>
                  <li>Nói rõ: "Tôi là [Họ tên], đăng ký làm giáo viên trên LopHoc.Online"</li>
                  <li>Thời lượng: 15-30 giây</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={!idCardFront || !idCardBack || !videoFile || isSubmitting}
            className="flex-1"
            data-testid="button-submit-verification"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác minh ngay'}
          </Button>
        </div>
      </div>
    </div>
  );
}
