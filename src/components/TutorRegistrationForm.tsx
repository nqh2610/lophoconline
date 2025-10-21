import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSubjects, useGradeLevels } from "@/hooks/use-tutors";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, GraduationCap, BookOpen, Clock, DollarSign, FileText, Award, Camera, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RichTextEditor } from "@/components/RichTextEditor";

// Helper function to strip HTML tags for validation
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const tutorRegistrationSchema = z.object({
  // Account Information (for new users)
  username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự").optional(),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").optional(),
  confirmPassword: z.string().optional(),

  // Personal Information
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(10, "Số điện thoại phải có ít nhất 10 số"),

  // Education
  education: z.string().min(1, "Vui lòng chọn trình độ học vấn"),
  university: z.string().min(2, "Vui lòng nhập tên trường"),
  major: z.string().min(2, "Vui lòng nhập chuyên ngành"),
  graduationYear: z.string().min(4, "Vui lòng nhập năm tốt nghiệp"),

  // Teaching Experience
  teachingExperience: z.string().min(1, "Vui lòng chọn số năm kinh nghiệm"),
  occupation: z.string().min(1, "Vui lòng chọn nghề nghiệp hiện tại"),

  // Subjects - now using IDs from API
  subjects: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 môn học"),
  // Category selection (for UI grouping)
  gradeCategory: z.string().optional(),
  // Grade levels - now using IDs from API
  grades: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 cấp lớp"),

  // Bio & Achievements (validate text content, not HTML)
  bio: z.string().refine((val) => {
    const text = stripHtml(val);
    return text.length >= 50;
  }, "Giới thiệu phải có ít nhất 50 ký tự").refine((val) => {
    const text = stripHtml(val);
    return text.length <= 1000;
  }, "Giới thiệu không quá 1000 ký tự"),
  achievements: z.string().optional(),
  teachingMethod: z.string().refine((val) => {
    const text = stripHtml(val);
    return text.length >= 20;
  }, "Phương pháp giảng dạy phải có ít nhất 20 ký tự"),

  // Availability
  availableDays: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 ngày"),
  availableTime: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 khung giờ"),

  // Rate
  hourlyRate: z.string().min(1, "Vui lòng nhập học phí"),
}).refine((data) => {
  // If username is provided, password must also be provided
  if (data.username && !data.password) {
    return false;
  }
  return true;
}, {
  message: "Vui lòng nhập mật khẩu",
  path: ["password"]
}).refine((data) => {
  // If password is provided, it must match confirmPassword
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"]
});

type TutorRegistrationFormValues = z.infer<typeof tutorRegistrationSchema>;

const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const timeSlots = [
  'Sáng (6h-12h)',
  'Chiều (12h-18h)',
  'Tối (18h-22h)',
];

const STEPS = [
  { id: 1, title: "Thông tin cá nhân", icon: User },
  { id: 2, title: "Trình độ học vấn", icon: GraduationCap },
  { id: 3, title: "Kinh nghiệm & Môn học", icon: BookOpen },
  { id: 4, title: "Hồ sơ giảng dạy", icon: FileText },
  { id: 5, title: "Thời gian & Học phí", icon: Clock },
];

export function TutorRegistrationForm() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);

  // Fetch subjects and grade levels from API
  const { data: subjects = [], isLoading: isLoadingSubjects } = useSubjects();
  const { data: gradeLevels = [], isLoading: isLoadingGrades } = useGradeLevels();

  // Group grade levels by category
  const gradeLevelsByCategory = useMemo(() => {
    return gradeLevels.reduce((acc, gl) => {
      if (!acc[gl.category]) {
        acc[gl.category] = [];
      }
      acc[gl.category].push(gl);
      return acc;
    }, {} as Record<string, typeof gradeLevels>);
  }, [gradeLevels]);

  // Get sorted categories
  const categories = useMemo(() => {
    const cats = Object.keys(gradeLevelsByCategory);
    const order = ['Tiểu học', 'THCS', 'THPT', 'Luyện thi', 'Khác'];
    return cats.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [gradeLevelsByCategory]);

  const form = useForm<TutorRegistrationFormValues>({
    resolver: zodResolver(tutorRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      email: "",
      phone: "",
      education: "",
      university: "",
      major: "",
      graduationYear: "",
      teachingExperience: "",
      occupation: "",
      subjects: [],
      gradeCategory: "",
      grades: [],
      bio: "",
      achievements: "",
      teachingMethod: "",
      availableDays: [],
      availableTime: [],
      hourlyRate: "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
    }
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setCertificates(prev => [...prev, ...files]);
  };

  const removeCertificate = (index: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof TutorRegistrationFormValues)[] = [];

    switch (step) {
      case 1:
        fieldsToValidate = ['fullName', 'email', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['education', 'university', 'major', 'graduationYear'];
        break;
      case 3:
        fieldsToValidate = ['teachingExperience', 'occupation', 'subjects', 'grades'];
        break;
      case 4:
        fieldsToValidate = ['bio', 'teachingMethod'];
        break;
      case 5:
        fieldsToValidate = ['availableDays', 'availableTime', 'hourlyRate'];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: TutorRegistrationFormValues) => {
    setIsSubmitting(true);

    try {
      let userId = session?.user?.id;

      // If user is not logged in and provided username/password, create account first
      if (!userId && data.username && data.password) {
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: data.username,
            email: data.email,
            password: data.password,
            role: 'tutor',
          }),
        });

        if (!signupResponse.ok) {
          const error = await signupResponse.json();
          throw new Error(error.error || 'Failed to create account');
        }

        const signupData = await signupResponse.json();
        userId = signupData.user.id;

        toast({
          title: "Tạo tài khoản thành công!",
          description: "Đang tiếp tục đăng ký hồ sơ gia sư...",
        });
      }

      // Check if user is logged in or just created account
      if (!userId) {
        toast({
          title: "Chưa đăng nhập",
          description: "Vui lòng đăng nhập hoặc tạo tài khoản mới để đăng ký làm gia sư.",
          variant: "destructive",
        });
        return;
      }

      // Prepare education data
      const education = JSON.stringify([{
        degree: data.education,
        school: data.university,
        major: data.major,
        year: data.graduationYear
      }]);

      // Prepare subjects data (still need JSON for backward compatibility)
      const subjectsJson = JSON.stringify(
        data.subjects.map(subjectId => {
          const subject = subjects.find(s => s.id === subjectId);
          return {
            subject: subject?.name || '',
            grades: data.grades.map(gradeId => {
              const grade = gradeLevels.find(g => g.id === gradeId);
              return grade?.name || '';
            })
          };
        })
      );

      // Map experience string to number
      const experienceMap: Record<string, number> = {
        '<1': 0,
        '1-2': 1,
        '3-5': 3,
        '5+': 6
      };
      const experienceYears = experienceMap[data.teachingExperience] || 0;

      // Prepare tutor data for API
      const tutorData = {
        userId: userId,
        fullName: data.fullName,
        bio: data.bio,
        teachingMethod: data.teachingMethod,
        education: education,
        achievements: data.achievements || '',
        subjects: subjectsJson,
        experience: experienceYears,
        hourlyRate: parseInt(data.hourlyRate.replace(/\D/g, '')), // Remove non-numeric chars
        occupation: data.occupation,
      };

      // 1. Create tutor profile
      const response = await fetch('/api/tutors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tutorData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register tutor');
      }

      const newTutor = await response.json();
      const tutorId = newTutor.id;
      console.log("Tutor created:", newTutor);

      // 2. Create tutor-subject relationships
      for (const subjectId of data.subjects) {
        for (const gradeLevelId of data.grades) {
          try {
            await fetch('/api/tutor-subjects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tutorId,
                subjectId,
                gradeLevelId
              }),
            });
          } catch (err) {
            console.error('Error creating tutor-subject relationship:', err);
          }
        }
      }

      // 3. Create time slots based on availability
      const dayMap: Record<string, number> = {
        'Thứ 2': 1,
        'Thứ 3': 2,
        'Thứ 4': 3,
        'Thứ 5': 4,
        'Thứ 6': 5,
        'Thứ 7': 6,
        'Chủ nhật': 0
      };

      const timeSlotMap: Record<string, { shiftType: string; startTime: string; endTime: string }> = {
        'Sáng (6h-12h)': { shiftType: 'morning', startTime: '06:00', endTime: '12:00' },
        'Chiều (12h-18h)': { shiftType: 'afternoon', startTime: '12:00', endTime: '18:00' },
        'Tối (18h-22h)': { shiftType: 'evening', startTime: '18:00', endTime: '22:00' }
      };

      for (const dayName of data.availableDays) {
        for (const timeSlotName of data.availableTime) {
          const dayOfWeek = dayMap[dayName];
          const timeSlot = timeSlotMap[timeSlotName];

          if (dayOfWeek !== undefined && timeSlot) {
            try {
              await fetch('/api/time-slots', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tutorId,
                  dayOfWeek,
                  shiftType: timeSlot.shiftType,
                  startTime: timeSlot.startTime,
                  endTime: timeSlot.endTime,
                  isAvailable: 1
                }),
              });
            } catch (err) {
              console.error('Error creating time slot:', err);
            }
          }
        }
      }

      // Show success toast
      toast({
        title: "Đăng ký thành công!",
        description: "Chúng tôi sẽ xem xét hồ sơ và liên hệ với bạn trong vòng 24 giờ.",
        duration: 10000,
      });

      // Wait a bit for toast to mount
      await new Promise(resolve => setTimeout(resolve, 100));

      // If user just created account, redirect to login page
      if (!session?.user?.id) {
        router.push('/');
      } else {
        // If already logged in, redirect to dashboard
        router.push('/tutor/dashboard');
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-colors
                      ${isActive ? 'bg-primary text-primary-foreground' : ''}
                      ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}
                    data-testid={`step-indicator-${step.id}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center hidden sm:block ${isActive ? 'font-semibold' : ''}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div 
                    className={`h-1 flex-1 mx-2 transition-colors ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-bar" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Card data-testid="step-1-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Thông tin cơ bản về bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Photo Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ảnh đại diện *</label>
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="relative">
                          <img 
                            src={URL.createObjectURL(profilePhoto)} 
                            alt="Preview" 
                            className="h-24 w-24 rounded-full object-cover border-2 border-primary"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => setProfilePhoto(null)}
                            data-testid="button-remove-photo"
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        data-testid="button-upload-photo"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Chọn ảnh
                      </Button>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                        data-testid="input-profile-photo"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Ảnh chân dung rõ nét, kích thước tối đa 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} data-testid="input-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số điện thoại *</FormLabel>
                        <FormControl>
                          <Input placeholder="0912345678" {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Account creation fields - only show if not logged in */}
                {!session?.user && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold text-sm mb-3">Tạo tài khoản (nếu chưa có)</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Nếu bạn chưa có tài khoản, vui lòng điền thông tin dưới đây. Nếu đã có tài khoản, vui lòng đăng nhập trước.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tên đăng nhập</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} data-testid="input-username" />
                            </FormControl>
                            <FormDescription>
                              Tối thiểu 3 ký tự
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} data-testid="input-password" />
                            </FormControl>
                            <FormDescription>
                              Tối thiểu 6 ký tự
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Xác nhận mật khẩu</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Education */}
          {currentStep === 2 && (
            <Card data-testid="step-2-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Trình độ học vấn
                </CardTitle>
                <CardDescription>
                  Thông tin về quá trình học tập của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trình độ học vấn *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-education">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trình độ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="highschool">Tốt nghiệp THPT</SelectItem>
                          <SelectItem value="bachelor">Cử nhân</SelectItem>
                          <SelectItem value="master">Thạc sĩ</SelectItem>
                          <SelectItem value="phd">Tiến sĩ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trường đại học *</FormLabel>
                      <FormControl>
                        <Input placeholder="ĐH Bách Khoa Hà Nội" {...field} data-testid="input-university" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="major"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chuyên ngành *</FormLabel>
                        <FormControl>
                          <Input placeholder="Công nghệ thông tin" {...field} data-testid="input-major" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="graduationYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Năm tốt nghiệp *</FormLabel>
                        <FormControl>
                          <Input placeholder="2020" {...field} data-testid="input-graduation-year" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Certificates Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chứng chỉ / Bằng cấp</label>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('certificates-upload')?.click()}
                      data-testid="button-upload-certificates"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Tải lên chứng chỉ
                    </Button>
                    <input
                      id="certificates-upload"
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={handleCertificateChange}
                      data-testid="input-certificates"
                    />
                    {certificates.length > 0 && (
                      <div className="space-y-2">
                        {certificates.map((cert, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm truncate flex-1" data-testid={`text-certificate-${index}`}>
                              {cert.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCertificate(index)}
                              data-testid={`button-remove-certificate-${index}`}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Tải lên các chứng chỉ liên quan (không bắt buộc)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Experience & Subjects */}
          {currentStep === 3 && (
            <Card data-testid="step-3-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Kinh nghiệm & Môn học
                </CardTitle>
                <CardDescription>
                  Kinh nghiệm giảng dạy và môn học bạn có thể dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teachingExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số năm kinh nghiệm *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-experience">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn số năm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<1">Dưới 1 năm</SelectItem>
                            <SelectItem value="1-2">1-2 năm</SelectItem>
                            <SelectItem value="3-5">3-5 năm</SelectItem>
                            <SelectItem value="5+">Trên 5 năm</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nghề nghiệp hiện tại *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-occupation">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn nghề nghiệp" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="teacher">Giáo viên</SelectItem>
                            <SelectItem value="student">Sinh viên</SelectItem>
                            <SelectItem value="tutor">Gia sư</SelectItem>
                            <SelectItem value="other">Khác</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="subjects"
                  render={() => (
                    <FormItem>
                      <FormLabel>Môn học có thể dạy *</FormLabel>
                      <FormDescription>Chọn các môn học bạn có thể dạy</FormDescription>
                      {isLoadingSubjects ? (
                        <div className="text-sm text-muted-foreground py-2">Đang tải môn học...</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {subjects.map((subject) => (
                            <FormField
                              key={subject.id}
                              control={form.control}
                              name="subjects"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(subject.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, subject.id])
                                          : field.onChange(field.value?.filter((val) => val !== subject.id));
                                      }}
                                      data-testid={`checkbox-subject-${subject.name}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {subject.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category Selection */}
                <FormField
                  control={form.control}
                  name="gradeCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cấp học *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Clear selected grades when category changes
                          form.setValue('grades', []);
                        }}
                        value={field.value}
                        data-testid="select-grade-category"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn cấp học" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingGrades ? (
                            <div className="text-sm text-muted-foreground py-2 px-2">Đang tải...</div>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Chọn cấp học trước để xem các lớp chi tiết
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Grade Levels - only show when category is selected */}
                {form.watch('gradeCategory') && (
                  <FormField
                    control={form.control}
                    name="grades"
                    render={() => (
                      <FormItem>
                        <FormLabel>Lớp có thể dạy *</FormLabel>
                        <FormDescription>
                          Chọn các lớp trong {form.watch('gradeCategory')} bạn có thể dạy
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {gradeLevelsByCategory[form.watch('gradeCategory') || '']?.map((gradeLevel) => (
                            <FormField
                              key={gradeLevel.id}
                              control={form.control}
                              name="grades"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(gradeLevel.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, gradeLevel.id])
                                          : field.onChange(field.value?.filter((val) => val !== gradeLevel.id));
                                      }}
                                      data-testid={`checkbox-grade-${gradeLevel.name}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">
                                    {gradeLevel.name}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Teaching Profile */}
          {currentStep === 4 && (
            <Card data-testid="step-4-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Hồ sơ giảng dạy
                </CardTitle>
                <CardDescription>
                  Mô tả về bản thân và phương pháp giảng dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giới thiệu bản thân *</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Giới thiệu về bản thân, kinh nghiệm và điểm mạnh của bạn..."
                          minHeight="120px"
                        />
                      </FormControl>
                      <FormDescription>
                        Tối thiểu 50 ký tự, tối đa 1000 ký tự. Sử dụng toolbar để định dạng văn bản.
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
                      <FormLabel className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Thành tích nổi bật
                      </FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Các giải thưởng, thành tích nổi bật trong quá trình giảng dạy..."
                          minHeight="100px"
                        />
                      </FormControl>
                      <FormDescription>
                        Không bắt buộc. Sử dụng danh sách để liệt kê thành tích.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teachingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phương pháp giảng dạy *</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value || ''}
                          onChange={field.onChange}
                          placeholder="Mô tả phương pháp và phong cách giảng dạy của bạn..."
                          minHeight="120px"
                        />
                      </FormControl>
                      <FormDescription>
                        Tối thiểu 20 ký tự. Định dạng để làm nổi bật phương pháp của bạn.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 5: Availability & Rate */}
          {currentStep === 5 && (
            <Card data-testid="step-5-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Thời gian rảnh
                </CardTitle>
                <CardDescription>
                  Chọn thời gian bạn có thể dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="availableDays"
                  render={() => (
                    <FormItem>
                      <FormLabel>Ngày trong tuần *</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {days.map((day) => (
                          <FormField
                            key={day}
                            control={form.control}
                            name="availableDays"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, day])
                                        : field.onChange(field.value?.filter((val) => val !== day));
                                    }}
                                    data-testid={`checkbox-day-${day}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {day}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availableTime"
                  render={() => (
                    <FormItem>
                      <FormLabel>Khung giờ *</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                        {timeSlots.map((slot) => (
                          <FormField
                            key={slot}
                            control={form.control}
                            name="availableTime"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(slot)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, slot])
                                        : field.onChange(field.value?.filter((val) => val !== slot));
                                    }}
                                    data-testid={`checkbox-time-${slot}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {slot}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Học phí mỗi giờ (VNĐ) *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="150000"
                          {...field}
                          data-testid="input-hourly-rate"
                        />
                      </FormControl>
                      <FormDescription>
                        Nhập học phí bạn mong muốn cho mỗi giờ dạy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              data-testid="button-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={nextStep}
                data-testid="button-next"
              >
                Tiếp theo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit-registration"
              >
                {isSubmitting ? "Đang xử lý..." : "Đăng ký làm gia sư"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
