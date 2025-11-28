"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, Video, Award, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const profileSchema = z.object({
  displayName: z.string().min(2, "Tên hiển thị phải có ít nhất 2 ký tự"),
  tagline: z.string().min(10, "Khẩu hiệu phải có ít nhất 10 ký tự").max(100, "Khẩu hiệu không quá 100 ký tự"),
  bio: z.string().min(100, "Giới thiệu phải có ít nhất 100 ký tự").max(2000, "Giới thiệu không quá 2000 ký tự"),
  achievements: z.string().min(20, "Thành tích phải có ít nhất 20 ký tự"),
  teachingStyle: z.string().min(50, "Phong cách giảng dạy phải có ít nhất 50 ký tự"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function TutorProfileSetup() {
  const { toast } = useToast();
  const router = useRouter();
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [introVideo, setIntroVideo] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      tagline: "",
      bio: "",
      achievements: "",
      teachingStyle: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video' | 'certificates') => {
    const files = e.target.files;
    if (!files) return;

    if (type === 'photo') {
      setProfilePhoto(files[0]);
    } else if (type === 'video') {
      setIntroVideo(files[0]);
    } else if (type === 'certificates') {
      setCertificates(Array.from(files));
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!profilePhoto || !introVideo) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng tải lên ảnh đại diện và video giới thiệu",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // TODO: Upload files and save profile data
    console.log("Profile data:", { ...data, profilePhoto, introVideo, certificates });

    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({
      title: "Hồ sơ đã được lưu!",
      description: "Tiếp tục thiết lập lịch dạy của bạn.",
    });

    setIsSubmitting(false);
    router.push('/tutor/schedule-setup');
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
          <h1 className="text-3xl font-bold" data-testid="heading-profile-setup">
            Tạo hồ sơ giáo viên
          </h1>
          <p className="text-muted-foreground mt-2">
            Hoàn thiện hồ sơ để học sinh có thể tìm thấy bạn
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Media Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Ảnh và Video
                </CardTitle>
                <CardDescription>
                  Tải lên ảnh đại diện và video giới thiệu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Profile Photo */}
                  <div className="space-y-3">
                    <Label htmlFor="profile-photo">Ảnh đại diện *</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Input
                        id="profile-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'photo')}
                        className="hidden"
                        data-testid="input-profile-photo"
                      />
                      <label htmlFor="profile-photo" className="cursor-pointer">
                        {profilePhoto ? (
                          <div className="space-y-2">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                            <p className="text-sm font-medium">{profilePhoto.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <User className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Tải lên ảnh đại diện
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Intro Video */}
                  <div className="space-y-3">
                    <Label htmlFor="intro-video">Video giới thiệu * (1-3 phút)</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                      <Input
                        id="intro-video"
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileChange(e, 'video')}
                        className="hidden"
                        data-testid="input-intro-video"
                      />
                      <label htmlFor="intro-video" className="cursor-pointer">
                        {introVideo ? (
                          <div className="space-y-2">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                            <p className="text-sm font-medium">{introVideo.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Video className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Tải lên video giới thiệu
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Certificates */}
                <div className="space-y-3">
                  <Label htmlFor="certificates">Chứng chỉ (tùy chọn)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Input
                      id="certificates"
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      onChange={(e) => handleFileChange(e, 'certificates')}
                      className="hidden"
                      data-testid="input-certificates"
                    />
                    <label htmlFor="certificates" className="cursor-pointer">
                      {certificates.length > 0 ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                          <p className="text-sm font-medium">
                            {certificates.length} tệp đã chọn
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Award className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Tải lên bằng cấp, chứng chỉ
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Information */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin hồ sơ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên hiển thị *</FormLabel>
                      <FormControl>
                        <Input placeholder="Thầy/Cô [Tên]" {...field} data-testid="input-display-name" />
                      </FormControl>
                      <FormDescription>
                        Tên này sẽ hiển thị trên hồ sơ công khai của bạn
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tagline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Khẩu hiệu *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="VD: Chuyên gia luyện thi IELTS 8.0+" 
                          {...field} 
                          data-testid="input-tagline"
                        />
                      </FormControl>
                      <FormDescription>
                        Một câu ngắn gọn mô tả điểm mạnh của bạn
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới thiệu bản thân *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Chia sẻ về kinh nghiệm, phong cách dạy học và thành tích của bạn..."
                          className="min-h-[150px]"
                          {...field}
                          data-testid="textarea-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        100-2000 ký tự
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="achievements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thành tích nổi bật *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="VD: 95% học sinh đậu đại học, 50+ học sinh đạt IELTS 7.5+..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-achievements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teachingStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phong cách giảng dạy *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Mô tả phương pháp và cách tiếp cận của bạn trong giảng dạy..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-teaching-style"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-submit-profile"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu và tiếp tục'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
