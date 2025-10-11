import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Upload, User, GraduationCap, BookOpen, Clock, DollarSign, FileText } from "lucide-react";

const tutorRegistrationSchema = z.object({
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
  
  // Subjects
  subjects: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 môn học"),
  grades: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 cấp lớp"),
  
  // Bio
  bio: z.string().min(50, "Giới thiệu phải có ít nhất 50 ký tự").max(1000, "Giới thiệu không quá 1000 ký tự"),
  teachingMethod: z.string().min(20, "Phương pháp giảng dạy phải có ít nhất 20 ký tự"),
  
  // Availability
  availableDays: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 ngày"),
  availableTime: z.array(z.string()).min(1, "Vui lòng chọn ít nhất 1 khung giờ"),
  
  // Rate
  hourlyRate: z.string().min(1, "Vui lòng nhập học phí"),
});

type TutorRegistrationFormValues = z.infer<typeof tutorRegistrationSchema>;

const subjects = [
  'Toán', 'Tiếng Anh', 'Vật Lý', 'Hóa học', 'Sinh học', 'Ngữ Văn',
  'Lịch Sử', 'Địa Lý', 'Tin học', 'IELTS', 'TOEFL', 'SAT'
];

const grades = ['Tiểu học', 'THCS', 'THPT', 'Đại học', 'Người đi làm'];

const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const timeSlots = [
  'Sáng (6h-12h)',
  'Chiều (12h-18h)',
  'Tối (18h-22h)',
];

export function TutorRegistrationForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TutorRegistrationFormValues>({
    resolver: zodResolver(tutorRegistrationSchema),
    defaultValues: {
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
      grades: [],
      bio: "",
      teachingMethod: "",
      availableDays: [],
      availableTime: [],
      hourlyRate: "",
    },
  });

  const onSubmit = async (data: TutorRegistrationFormValues) => {
    setIsSubmitting(true);
    
    // TODO: Implement API call to register tutor
    console.log("Tutor registration data:", data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Đăng ký thành công!",
      description: "Chúng tôi sẽ xem xét hồ sơ và liên hệ với bạn trong vòng 24 giờ.",
    });
    
    setIsSubmitting(false);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
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

            <div className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>

        {/* Education Background */}
        <Card>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-education">
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

            <div className="grid gap-4 sm:grid-cols-2">
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

              <FormField
                control={form.control}
                name="major"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chuyên ngành *</FormLabel>
                    <FormControl>
                      <Input placeholder="Toán học ứng dụng" {...field} data-testid="input-major" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
          </CardContent>
        </Card>

        {/* Teaching Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Kinh nghiệm giảng dạy
            </CardTitle>
            <CardDescription>
              Thông tin về kinh nghiệm dạy học của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="teachingExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số năm kinh nghiệm *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-experience">
                          <SelectValue placeholder="Chọn số năm" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Dưới 1 năm</SelectItem>
                        <SelectItem value="1">1-2 năm</SelectItem>
                        <SelectItem value="3">3-5 năm</SelectItem>
                        <SelectItem value="5">5-10 năm</SelectItem>
                        <SelectItem value="10">Trên 10 năm</SelectItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-occupation">
                          <SelectValue placeholder="Chọn nghề nghiệp" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="student">Sinh viên</SelectItem>
                        <SelectItem value="teacher">Giáo viên</SelectItem>
                        <SelectItem value="professional">Chuyên gia</SelectItem>
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
                  <FormLabel>Môn học giảng dạy *</FormLabel>
                  <FormDescription>Chọn các môn học bạn có thể dạy</FormDescription>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {subjects.map((subject) => (
                      <FormField
                        key={subject}
                        control={form.control}
                        name="subjects"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(subject)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, subject])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== subject)
                                      );
                                }}
                                data-testid={`checkbox-subject-${subject}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {subject}
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
              name="grades"
              render={() => (
                <FormItem>
                  <FormLabel>Cấp lớp giảng dạy *</FormLabel>
                  <FormDescription>Chọn các cấp lớp bạn có thể dạy</FormDescription>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {grades.map((grade) => (
                      <FormField
                        key={grade}
                        control={form.control}
                        name="grades"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(grade)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, grade])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== grade)
                                      );
                                }}
                                data-testid={`checkbox-grade-${grade}`}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {grade}
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
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giới thiệu bản thân *</FormLabel>
                  <FormDescription>
                    Viết vài dòng về bản thân, kinh nghiệm và thành tích của bạn (50-1000 ký tự)
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Tôi là giáo viên Toán với 5 năm kinh nghiệm..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-bio"
                    />
                  </FormControl>
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
                  <FormDescription>
                    Mô tả phương pháp và phong cách giảng dạy của bạn
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="Tôi áp dụng phương pháp học tích cực, khuyến khích học sinh tự khám phá..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-teaching-method"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
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
                  <div className="flex flex-wrap gap-3 pt-2">
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
                                    : field.onChange(
                                        field.value?.filter((value) => value !== day)
                                      );
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
                  <div className="flex flex-wrap gap-3 pt-2">
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
                                    : field.onChange(
                                        field.value?.filter((value) => value !== slot)
                                      );
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
          </CardContent>
        </Card>

        {/* Hourly Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Học phí
            </CardTitle>
            <CardDescription>
              Mức học phí bạn mong muốn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Học phí mỗi giờ (VNĐ) *</FormLabel>
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

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting}
            data-testid="button-submit-registration"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký làm gia sư"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
