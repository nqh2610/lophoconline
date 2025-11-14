import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useSubjects, useGradeLevels, useOccupations } from "@/hooks/use-tutors";
import { useFormAutoSave } from "@/hooks/use-form-auto-save";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, User, GraduationCap, BookOpen, Clock, DollarSign, FileText, Award, Camera, CheckCircle2, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import TeachingSessionManager from "@/components/TeachingSessionManagerV3";

// Helper function to strip HTML tags and clean text
function stripHtml(html: string): string {
  if (!html) return '';
  // Remove HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Trim and normalize whitespace
  return decoded.trim().replace(/\s+/g, ' ');
}

// Type definition for teaching sessions
export type TeachingSessionData = {
  id: string;
  recurringDays: number[];
  startTime: string;
  endTime: string;
  sessionType?: 'morning' | 'afternoon' | 'evening';
};

const tutorRegistrationSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Họ tên phải có ít nhất 2 ký tự"),
  phone: z.string().min(10, "Số điện thoại phải có ít nhất 10 số"),

  // Education - Array of education entries
  education: z.array(z.object({
    degree: z.string().min(1, "Vui lòng nhập bằng cấp/trình độ"),
    school: z.string().min(2, "Vui lòng nhập tên trường"),
    year: z.string().min(4, "Vui lòng nhập năm tốt nghiệp"),
  })).min(1, "Vui lòng thêm ít nhất 1 học vấn"),
  
  // Certifications - Array of certification strings (optional, but if provided must not be empty)
  certifications: z.array(z.string()).optional(),
  
  // Achievements - Array of achievement strings (optional, but if provided must not be empty)
  achievementsList: z.array(z.string()).optional(),

  // Teaching Experience
  teachingExperience: z.string().optional(), // Optional, defaults to "0" if empty
  occupationId: z.number().int().positive("Vui lòng chọn nghề nghiệp hiện tại"),

  // Subjects and Grades mapping - each subject can have multiple grades
  subjectGrades: z.array(z.object({
    subjectId: z.number(),
    gradeIds: z.array(z.number()).min(1, "Vui lòng chọn ít nhất 1 lớp cho môn này"),
  })).min(1, "Vui lòng chọn ít nhất 1 môn học và lớp tương ứng"),

  // Legacy fields (keep for backward compatibility, but will be derived from subjectGrades)
  subjects: z.array(z.number()).optional(),
  gradeCategory: z.string().optional(),
  grades: z.array(z.number()).optional(),

  // Bio & Achievements (plain text)
  bio: z.string().min(50, "Giới thiệu phải có ít nhất 50 ký tự").max(1000, "Giới thiệu không quá 1000 ký tự"),
  teachingMethod: z.string().min(20, "Phương pháp giảng dạy phải có ít nhất 20 ký tự"),

  // Hourly Rate
  hourlyRate: z.number().int().min(1000, "Học phí tối thiểu 1,000 VNĐ/giờ").max(10000000, "Học phí tối đa 10,000,000 VNĐ/giờ"),

  // Teaching Sessions (Ca dạy định kỳ với buổi học)
  teachingSessions: z.array(z.object({
    id: z.string(),
    recurringDays: z.array(z.number().min(0).max(6)).min(1, "Vui lòng chọn ít nhất 1 ngày"),
    startTime: z.string().min(1, "Vui lòng nhập giờ bắt đầu"),
    endTime: z.string().min(1, "Vui lòng nhập giờ kết thúc"),
    sessionType: z.enum(['morning', 'afternoon', 'evening']).optional(),
  })).min(1, "Vui lòng tạo ít nhất 1 ca dạy"),

  // Legacy Availability (optional for backward compatibility)
  availableDays: z.array(z.string()).optional(),
  availableTime: z.array(z.string()).optional(),
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

interface TutorRegistrationFormProps {
  mode?: 'create' | 'edit';
  tutorId?: number;
}

export function TutorRegistrationForm({ mode: initialMode = 'create', tutorId: initialTutorId }: TutorRegistrationFormProps = {}) {
  const { toast } = useToast();
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>(initialMode);
  const [tutorId, setTutorId] = useState<number | undefined>(initialTutorId);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  // Track expanded categories for each subject: { subjectId: categoryName }
  const [expandedCategories, setExpandedCategories] = useState<Record<number, string | null>>({});
  // Track which steps have been saved in edit mode
  const [savedSteps, setSavedSteps] = useState<Set<number>>(new Set());
  // Track if currently saving a specific step
  const [savingStep, setSavingStep] = useState<number | null>(null);

  // Redirect to login if not authenticated
  // Check authentication
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập trước khi đăng ký làm gia sư. Nếu chưa có tài khoản, hãy đăng ký tài khoản trước.",
        variant: "destructive",
      });
      router.push('/login?redirectTo=/tutor-registration');
    }
  }, [status, router, toast]);

  // Check if user already has a tutor profile (skip in edit mode)
  // Auto-detect mode: check if user has existing profile
  useEffect(() => {
    async function checkAndLoadProfile() {
      if (status === 'loading') return;
      if (!session?.user?.id) {
        setIsLoadingData(false);
        return;
      }

      try {
        const response = await fetch(`/api/tutors?userId=${session.user.id}`);
        if (response.ok) {
          const tutors = await response.json();
          if (tutors && tutors.length > 0) {
            // User has existing profile - switch to edit mode
            const existingTutor = tutors[0];
            console.log('[TutorRegistrationForm] Found existing tutor profile:', existingTutor.id);
            setMode('edit');
            setTutorId(existingTutor.id);
            // Don't set isLoadingData to false yet - let the edit mode useEffect handle it
          } else {
            // No profile - stay in create mode
            console.log('[TutorRegistrationForm] No existing profile, staying in create mode');
            setIsLoadingData(false);
          }
        } else {
          setIsLoadingData(false);
        }
      } catch (error) {
        console.error('Error checking existing tutor:', error);
        setIsLoadingData(false);
      }
    }

    checkAndLoadProfile();
  }, [session, status]);

  // Fetch subjects and grade levels from API
  const { data: subjects = [], isLoading: isLoadingSubjects } = useSubjects();
  const { data: gradeLevels = [], isLoading: isLoadingGrades } = useGradeLevels();
  const { data: occupationsList = [], isLoading: isLoadingOccupations } = useOccupations();

  // Helper function: Get grade levels for a specific subject
  const getGradeLevelsForSubject = useMemo(() => {
    return (subjectId: number) => {
      return gradeLevels.filter(gl =>
        gl.subjectId === null || gl.subjectId === subjectId
      );
    };
  }, [gradeLevels]);

  // Helper function: Group grade levels by category for a subject
  const getGradeLevelsByCategoryForSubject = useMemo(() => {
    return (subjectId: number) => {
      const subjectGrades = getGradeLevelsForSubject(subjectId);
      return subjectGrades.reduce((acc, gl) => {
        if (!acc[gl.category]) {
          acc[gl.category] = [];
        }
        acc[gl.category].push(gl);
        return acc;
      }, {} as Record<string, typeof gradeLevels>);
    };
  }, [getGradeLevelsForSubject]);

  // Get sorted categories
  const categories = useMemo(() => {
    const order = ['Tiểu học', 'THCS', 'THPT', 'Luyện thi', 'Khác'];
    return order;
  }, []);

  const form = useForm<TutorRegistrationFormValues>({
    resolver: zodResolver(tutorRegistrationSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "", // Will be auto-filled from session via useEffect
      phone: "",
      education: [],
      certifications: [],
      achievementsList: [],
      teachingExperience: "",
      subjectGrades: [],
      subjects: [],
      gradeCategory: "",
      grades: [],
      bio: "",
      teachingMethod: "",
      hourlyRate: 100000, // Default 100k VNĐ/giờ
      teachingSessions: [], // Teaching sessions array
      availableDays: [], // Optional now
      availableTime: [], // Optional now
    },
  });

  // Setup auto-save (only in create mode, not edit mode)
  const autoSave = useFormAutoSave({
    key: `tutor-registration-${session?.user?.id || 'guest'}`,
    form,
    delay: 2000, // Save 2 seconds after user stops typing
    enabled: mode === 'create' && status === 'authenticated', // Only auto-save in create mode
    // Silent auto-save - no callbacks to avoid UI notifications
    excludeFields: [],
  });

  // Auto-fill from session when loaded
  useEffect(() => {
    if (session?.user) {
      // Note: We do NOT auto-fill fullName with username
      // User must enter their real full name for contact purposes
    }
  }, [session, form]);

  // Load existing tutor data in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !tutorId) {
      // If not in edit mode, ensure loading is false
      if (mode === 'create') {
        setIsLoadingData(false);
      }
      return;
    }

    async function loadTutorData() {
      console.log('[TutorRegistrationForm] Loading tutor data for ID:', tutorId);
      setIsLoadingData(true);
      try {
        const response = await fetch(`/api/tutors/${tutorId}`);
        if (!response.ok) {
          toast({
            title: "Lỗi",
            description: "Không thể tải thông tin gia sư",
            variant: "destructive",
          });
          router.push('/tutor/dashboard');
          return;
        }

        const tutor = await response.json();
        console.log('[TutorRegistrationForm] Loaded tutor data:', tutor);
        
        // Parse JSON fields
        let education = [];
        try {
          education = typeof tutor.education === 'string' 
            ? JSON.parse(tutor.education) 
            : (tutor.education || []);
        } catch (e) {
          console.error('Error parsing education:', e);
        }

        let certifications = [];
        try {
          certifications = typeof tutor.certifications === 'string' 
            ? JSON.parse(tutor.certifications) 
            : (tutor.certifications || []);
        } catch (e) {
          console.error('Error parsing certifications:', e);
        }

        let achievementsList = [];
        try {
          achievementsList = typeof tutor.achievements === 'string' 
            ? JSON.parse(tutor.achievements) 
            : (tutor.achievements || []);
        } catch (e) {
          console.error('Error parsing achievements:', e);
        }

        // Build subjectGrades from tutorSubjects
        const subjectGradesMap: Record<number, number[]> = {};
        (tutor.tutorSubjects || []).forEach((ts: any) => {
          const subjectId = ts.subject?.id || ts.subjectId;
          const gradeId = ts.gradeLevel?.id || ts.gradeLevelId;
          if (subjectId && gradeId) {
            if (!subjectGradesMap[subjectId]) {
              subjectGradesMap[subjectId] = [];
            }
            if (!subjectGradesMap[subjectId].includes(gradeId)) {
              subjectGradesMap[subjectId].push(gradeId);
            }
          }
        });

        const subjectGrades = Object.entries(subjectGradesMap).map(([subjectId, gradeIds]) => ({
          subjectId: parseInt(subjectId),
          gradeIds
        }));

        // Build teachingSessions from timeSlots
        const sessionsByKey: Record<string, any> = {};
        (tutor.timeSlots || []).forEach((slot: any) => {
          const key = `${slot.startTime}-${slot.endTime}`;
          if (!sessionsByKey[key]) {
            sessionsByKey[key] = {
              id: Math.random().toString(36).substr(2, 9),
              recurringDays: [],
              startTime: slot.startTime,
              endTime: slot.endTime,
              sessionType: undefined,
            };
          }
          sessionsByKey[key].recurringDays.push(slot.dayOfWeek);
        });

        const teachingSessions = Object.values(sessionsByKey);

        // Reset form with existing data
        console.log('[TutorRegistrationForm] Resetting form with tutor data');
        form.reset({
          fullName: tutor.fullName || '',
          phone: tutor.phone || '0000000000', // Provide default if missing
          education,
          certifications,
          achievementsList,
          teachingExperience: tutor.experience?.toString() || '0',
          occupationId: tutor.occupation?.id || undefined,
          subjectGrades,
          subjects: [],
          gradeCategory: '',
          grades: [],
          bio: tutor.bio || '',
          teachingMethod: tutor.teachingMethod || '',
          hourlyRate: tutor.hourlyRate || 100000,
          teachingSessions,
          availableDays: [],
          availableTime: [],
        });
        console.log('[TutorRegistrationForm] Form reset complete');
      } catch (error) {
        console.error('Error loading tutor data:', error);
        toast({
          title: "Lỗi",
          description: "Không thể tải thông tin gia sư",
          variant: "destructive",
        });
      } finally {
        console.log('[TutorRegistrationForm] Setting isLoadingData to false');
        setIsLoadingData(false);
      }
    }

    loadTutorData();
  }, [mode, tutorId, form, toast, router]);

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
        fieldsToValidate = ['fullName', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['education'];
        break;
      case 3:
        fieldsToValidate = ['occupationId', 'subjectGrades'];
        break;
      case 4:
        // Validate bio and teachingMethod (achievementsList is optional)
        fieldsToValidate = ['bio', 'teachingMethod'];

        // Clean up empty achievements before validation
        const currentAchievements = form.getValues('achievementsList') || [];
        const filteredAchievements = currentAchievements.filter(a => a && a.trim().length > 0);
        if (filteredAchievements.length !== currentAchievements.length) {
          form.setValue('achievementsList', filteredAchievements);
        }
        break;
      case 5:
        fieldsToValidate = ['hourlyRate', 'teachingSessions'];
        break;
    }

    const result = await form.trigger(fieldsToValidate);

    // If validation fails, scroll to first error
    if (!result) {
      const firstErrorField = fieldsToValidate.find(field => form.formState.errors[field]);

      if (firstErrorField) {
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      toast({
        title: "Vui lòng kiểm tra lại thông tin",
        description: "Có một số trường thông tin chưa hợp lệ trong bước này.",
        variant: "destructive",
      });
    }

    return result;
  };

  const nextStep = async () => {
    console.log('🟢 [nextStep] Called from step', currentStep);
    const isValid = await validateStep(currentStep);
    console.log('[nextStep] Validation result:', isValid);

    if (isValid && currentStep < STEPS.length) {
      console.log('[nextStep] ✅ Moving to step', currentStep + 1);
      
      // Auto-save before moving to next step (in create mode) - silent
      if (mode === 'create') {
        autoSave.save();
      }
      
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.log('[nextStep] ❌ NOT moving');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Auto-save before moving to previous step (in create mode) - silent
      if (mode === 'create') {
        autoSave.save();
      }
      
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Allow jumping to any step in edit mode
  const goToStep = (stepId: number) => {
    if (mode === 'edit') {
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Save current step only (for edit mode)
  const saveCurrentStep = async () => {
    console.log('🟡 [saveCurrentStep] Called from step', currentStep);

    if (mode !== 'edit' || !tutorId) {
      console.log('[saveCurrentStep] Blocked - mode:', mode, 'tutorId:', tutorId);
      toast({
        title: "Lỗi",
        description: "Chỉ có thể lưu từng bước trong chế độ chỉnh sửa",
        variant: "destructive",
      });
      return;
    }

    // Validate current step first
    const isValid = await validateStep(currentStep);
    if (!isValid) {
      return; // validateStep already shows toast
    }

    setSavingStep(currentStep);

    try {
      const data = form.getValues();
      const userId = session?.user?.id ? parseInt(session.user.id) : undefined;

      if (!userId) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      // Prepare data based on current step
      let updatePayload: any = {};

      switch (currentStep) {
        case 1: // Personal Information
          updatePayload = {
            fullName: data.fullName,
            phone: data.phone,
          };
          break;

        case 2: // Education
          const education = JSON.stringify(data.education);
          const validCertifications = data.certifications?.filter(c => c && c.trim().length > 0) || [];
          const certifications = validCertifications.length > 0 ? JSON.stringify(validCertifications) : null;
          
          updatePayload = {
            education,
            certifications,
          };
          break;

        case 3: // Experience & Subjects
          const validAchievements = data.achievementsList?.filter(a => a && a.trim().length > 0) || [];
          const achievements = validAchievements.length > 0 ? JSON.stringify(validAchievements) : null;
          const subjectsJson = JSON.stringify(
            data.subjectGrades.map(sg => {
              const subject = subjects.find(s => s.id === sg.subjectId);
              return {
                subject: subject?.name || '',
                grades: sg.gradeIds.map(gradeId => {
                  const grade = gradeLevels.find(g => g.id === gradeId);
                  return grade?.name || '';
                })
              };
            })
          );

          updatePayload = {
            experience: parseInt(data.teachingExperience || '0'),
            occupationId: data.occupationId,
            subjects: subjectsJson,
            achievements,
          };
          break;

        case 4: // Bio & Teaching Method
          updatePayload = {
            bio: data.bio,
            teachingMethod: data.teachingMethod,
          };
          break;

        case 5: // Rate & Sessions
          updatePayload = {
            hourlyRate: data.hourlyRate,
          };
          // Teaching sessions will be handled separately below
          break;
      }

      // Update tutor profile
      const response = await fetch(`/api/tutors/${tutorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Cập nhật thất bại');
      }

      // If step 5, also update teaching sessions
      if (currentStep === 5) {
        // Delete old sessions and create new ones
        await fetch(`/api/tutor-availability?tutorId=${tutorId}`, {
          method: 'DELETE',
        });

        for (const session of data.teachingSessions) {
          for (const dayOfWeek of session.recurringDays) {
            const availabilityData = {
              tutorId,
              dayOfWeek,
              shiftType: session.sessionType || 'afternoon',
              startTime: session.startTime,
              endTime: session.endTime,
              isActive: 1,
            };

            await fetch('/api/tutor-availability', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(availabilityData),
            });
          }
        }
      }

      // Mark step as saved
      setSavedSteps(prev => new Set(prev).add(currentStep));

      toast({
        title: "Đã lưu! ✓",
        description: `${STEPS[currentStep - 1].title} đã được cập nhật thành công.`,
      });
    } catch (error) {
      console.error("Save step error:", error);
      toast({
        title: "Có lỗi xảy ra",
        description: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSavingStep(null);
    }
  };

  const onSubmit = async (data: TutorRegistrationFormValues) => {
    console.log('🔴 [onSubmit] FORM SUBMITTED!');
    console.log('[onSubmit] Current step:', currentStep);
    console.log('[onSubmit] STEPS.length:', STEPS.length);

    // SAFETY CHECK: Block submit if not at final step
    if (currentStep !== STEPS.length) {
      console.error('❌ BLOCKING SUBMIT - Not at final step!');
      alert(`BUG DETECTED! Form submitted at step ${currentStep}/${STEPS.length}. Check console for details.`);
      return; // Block submit
    }

    // Validate all fields before submitting
    const isValid = await form.trigger();
    if (!isValid) {
      // Find the first error and scroll to it
      const errorKeys = Object.keys(form.formState.errors);
      if (errorKeys.length > 0) {
        const firstErrorField = errorKeys[0];
        
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        toast({
          title: "Vui lòng kiểm tra lại thông tin",
          description: "Có một số trường thông tin chưa hợp lệ. Vui lòng xem lại các thông báo lỗi.",
          variant: "destructive",
        });
      }
      return;
    }
    
    setIsSubmitting(true);

    try {
      const userId = session?.user?.id ? parseInt(session.user.id) : undefined;

      // Check if user is logged in (should always be true due to useEffect redirect)
      if (!userId) {
        toast({
          title: "Chưa đăng nhập",
          description: "Vui lòng đăng nhập để đăng ký làm gia sư.",
          variant: "destructive",
        });
        router.push('/login?redirectTo=/tutor-registration');
        return;
      }

      // Prepare education data - already array format
      const education = JSON.stringify(data.education);

      // Prepare certifications data - filter out empty strings
      const validCertifications = data.certifications?.filter(c => c && c.trim().length > 0) || [];
      const certifications = validCertifications.length > 0
        ? JSON.stringify(validCertifications)
        : null;

      // Prepare achievements data - filter out empty strings
      const validAchievements = data.achievementsList?.filter(a => a && a.trim().length > 0) || [];
      const achievements = validAchievements.length > 0
        ? JSON.stringify(validAchievements)
        : null;

      // Prepare subjects data from subjectGrades mapping
      const subjectsJson = JSON.stringify(
        data.subjectGrades.map(sg => {
          const subject = subjects.find(s => s.id === sg.subjectId);
          return {
            subject: subject?.name || '',
            grades: sg.gradeIds.map(gradeId => {
              const grade = gradeLevels.find(g => g.id === gradeId);
              return grade?.name || '';
            })
          };
        })
      );

      // Parse experience years from input (defaults to 0 if empty)
      const experienceYears = parseInt(data.teachingExperience || "0") || 0;

      // Prepare tutor data for API
      const tutorData: any = {
        userId: userId,
        fullName: data.fullName,
        phone: data.phone,
        bio: data.bio,
        teachingMethod: data.teachingMethod,
        education: education,
        certifications: certifications,
        achievements: achievements,
        subjects: subjectsJson,
        experience: experienceYears,
        hourlyRate: data.hourlyRate, // Use number directly
      };

      // Only include occupationId if it's a valid positive number
      if (data.occupationId && data.occupationId > 0) {
        tutorData.occupationId = data.occupationId;
      }

      // Note: availableDays and availableTime are NOT sent to tutors table
      // They will be handled separately via time-slots API

      let currentTutorId: number;

      if (mode === 'edit') {
        // Edit mode: Update existing tutor
        console.log('[Update] Sending to API:', tutorData);
        console.log('[Update] Tutor ID:', tutorId);
        console.log('[Update] Mode:', mode);
        
        if (!tutorId) {
          throw new Error('Tutor ID is required for edit mode');
        }
        
        const response = await fetch(`/api/tutors/${tutorId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tutorData),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Update] API Error:', error);
          console.error('[Update] Validation details:', JSON.stringify(error.details, null, 2));
          throw new Error(error.error || 'Failed to update tutor');
        }

        const updatedTutor = await response.json();
        currentTutorId = updatedTutor.id;
        console.log("Tutor updated:", updatedTutor);
      } else {
        // Create mode: Create new tutor profile
        console.log('[Registration] Sending to API:', tutorData);
        const response = await fetch('/api/tutors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tutorData),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Registration] API Error:', error);
          console.error('[Registration] Validation details:', JSON.stringify(error.details, null, 2));
          throw new Error(error.error || 'Failed to register tutor');
        }

        const newTutor = await response.json();
        currentTutorId = newTutor.id;
        console.log("Tutor created:", newTutor);
      }

      // In edit mode, clear old subjects and availability first (in ONE API call)
      if (mode === 'edit') {
        console.log('[Update] Clearing old subjects and availability...');
        try {
          await fetch(`/api/tutors/${currentTutorId}/clear-data`, {
            method: 'DELETE',
          });
          console.log('[Update] ✅ Old data cleared');
        } catch (err) {
          console.error('[Update] ⚠️ Failed to clear old data (non-critical):', err);
        }
      }

      // 2. Create tutor-subject relationships (BULK INSERT in ONE query)
      // Source of Truth: tutor_subjects table
      console.log('[Registration] Bulk inserting tutor subjects...');
      const subjectsToInsert: Array<{ subjectId: number; gradeLevelId: number }> = [];

      for (const sg of data.subjectGrades) {
        for (const gradeLevelId of sg.gradeIds) {
          subjectsToInsert.push({
            subjectId: sg.subjectId,
            gradeLevelId
          });
        }
      }

      if (subjectsToInsert.length > 0) {
        try {
          await fetch('/api/tutor-subjects/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tutorId: currentTutorId,
              subjects: subjectsToInsert
            }),
          });
          console.log(`[Registration] ✅ Bulk inserted ${subjectsToInsert.length} subjects`);
        } catch (err) {
          console.error('Error bulk inserting tutor subjects:', err);
          throw err; // Critical error - should not continue
        }
      }

      // 3. Sync to JSON cache for fast display (Hybrid approach)
      console.log('[Registration] Syncing tutor subjects to JSON cache...');
      try {
        // Call API to sync instead of direct DB call
        const syncResponse = await fetch(`/api/tutors/${currentTutorId}/subjects/sync`, {
          method: 'POST',
        });
        
        if (syncResponse.ok) {
          console.log('[Registration] ✅ Sync completed successfully');
        } else {
          console.error('[Registration] ⚠️ Sync failed (non-critical)');
        }
      } catch (syncError) {
        console.error('[Registration] ⚠️ Sync failed (non-critical):', syncError);
        // Non-critical error - registration still succeeded
      }

      // 4. Create tutor availability (BULK INSERT in ONE query)
      console.log('[Registration] Bulk inserting tutor availability...');
      const availabilitySlots = data.teachingSessions.map(session => ({
        recurringDays: session.recurringDays, // Will be stringified by API
        shiftType: session.sessionType || 'afternoon',
        startTime: session.startTime,
        endTime: session.endTime,
        sessionType: session.sessionType || null,
      }));

      if (availabilitySlots.length > 0) {
        try {
          const availabilityResponse = await fetch('/api/tutor-availability/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tutorId: currentTutorId,
              slots: availabilitySlots
            }),
          });

          if (!availabilityResponse.ok) {
            console.error('[Registration] Failed to bulk insert availability:', await availabilityResponse.json());
            throw new Error('Failed to insert availability');
          } else {
            console.log(`[Registration] ✅ Bulk inserted ${availabilitySlots.length} availability slots`);
          }
        } catch (err) {
          console.error('[Registration] Error bulk inserting availability:', err);
          throw err; // Critical error
        }
      }

      // Show success toast
      toast({
        title: mode === 'edit' ? "Cập nhật thành công! 🎉" : "Đăng ký thành công! 🎉",
        description: mode === 'edit' 
          ? `Hồ sơ của bạn đã được cập nhật.`
          : `Hồ sơ và ${data.teachingSessions.length} ca dạy của bạn đã được tạo. Chúng tôi sẽ xem xét và duyệt trong vòng 24 giờ.`,
        duration: 15000,
      });

      // Clear auto-saved data on successful submission (silent)
      if (mode === 'create') {
        autoSave.clear();
      }

      // CRITICAL: Refresh session to get updated roles from server
      console.log('[Registration] Refreshing session to update roles...');
      try {
        await updateSession();
        console.log('[Registration] ✅ Session refreshed successfully');
      } catch (err) {
        console.error('[Registration] ⚠️ Session refresh failed:', err);
      }

      // Wait for toast to be visible
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Force full page reload to ensure session is completely refreshed
      console.log('[Registration] Redirecting to dashboard...');
      window.location.href = '/tutor/dashboard';
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

  // Debug logging
  console.log('[TutorRegistrationForm] Render state:', {
    mode,
    tutorId,
    isLoadingData,
    currentStep,
    hasFormData: !!form.getValues().fullName,
  });

  // Show loading spinner while loading data in edit mode
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin gia sư...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isSaved = savedSteps.has(step.id);
            const canClick = mode === 'edit'; // Only allow clicking in edit mode
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all relative
                      ${isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
                      ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                      ${canClick ? 'cursor-pointer hover:scale-110 hover:shadow-md' : ''}
                      ${isSaved && mode === 'edit' ? 'ring-2 ring-green-500' : ''}
                    `}
                    onClick={() => canClick && goToStep(step.id)}
                    data-testid={`step-indicator-${step.id}`}
                    title={canClick ? `Nhảy đến: ${step.title}` : step.title}
                  >
                    {isSaved && mode === 'edit' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                    {/* Show saved indicator badge */}
                    {isSaved && mode === 'edit' && !isActive && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs mt-2 text-center hidden sm:block ${isActive ? 'font-semibold' : ''} ${canClick ? 'cursor-pointer' : ''}`}
                    onClick={() => canClick && goToStep(step.id)}
                  >
                    {step.title}
                  </span>
                  {isSaved && mode === 'edit' && (
                    <span className="text-[10px] text-green-600 font-semibold hidden sm:block">Đã lưu</span>
                  )}
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
        {mode === 'edit' && (
          <Alert className="border-blue-200 bg-blue-50">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                ℹ️
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-blue-900 mb-1">Hướng dẫn sửa thông tin:</p>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• <strong>Click vào các bước phía trên</strong> để nhảy đến phần cần sửa</li>
                  <li>• Nhấn <strong>"Lưu [Tên bước]"</strong> để lưu ngay phần đó</li>
                  <li>• Hoặc nhấn <strong>"Lưu tất cả & Hoàn tất"</strong> ở bước cuối để lưu toàn bộ</li>
                  <li>• Các bước đã lưu sẽ hiển thị dấu ✓</li>
                </ul>
              </div>
            </div>
          </Alert>
        )}
      </div>

      <Form {...form}>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          className="space-y-6"
          onKeyDown={(e) => {
            // Prevent Enter key from submitting form before final step
            if (e.key === 'Enter') {
              const target = e.target as HTMLElement;
              console.log('⌨️ [onKeyDown] Enter pressed');
              console.log('[onKeyDown] Target:', target.tagName);
              console.log('[onKeyDown] Current step:', currentStep);

              if (currentStep < STEPS.length) {
                // Allow Enter in textarea (for new lines)
                if (target.tagName === 'TEXTAREA') {
                  console.log('[onKeyDown] In TEXTAREA - allowing default');
                  return; // Allow default behavior
                }

                // In input fields, go to next step
                if (target.tagName === 'INPUT') {
                  console.log('[onKeyDown] In INPUT - preventing default and calling nextStep');
                  e.preventDefault();
                  nextStep();
                  return;
                }

                // For other elements, prevent submit
                console.log('[onKeyDown] Other element - preventing default');
                e.preventDefault();
              }
            }
          }}
        >
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <Card data-testid="step-1-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Vui lòng cung cấp thông tin cơ bản về bản thân
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section 1: Profile Photo */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Ảnh đại diện của bạn
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Ảnh chân dung rõ nét, trang phục lịch sự. JPG/PNG, tối đa 5MB.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4">
                    <div className="relative">
                      {profilePhoto ? (
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(profilePhoto)}
                            alt="Profile preview"
                            className="h-24 w-24 rounded-full object-cover border-2 border-blue-300 dark:border-blue-700"
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
                        <div className="h-24 w-24 rounded-full border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center bg-white dark:bg-gray-900">
                          <Camera className="h-8 w-8 text-blue-400 dark:text-blue-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        data-testid="button-upload-photo"
                        className="border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {profilePhoto ? 'Thay đổi ảnh' : 'Chọn ảnh'}
                      </Button>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                        data-testid="input-profile-photo"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Full Name */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        Họ và tên đầy đủ
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        💡 Họ tên chính thức như trên giấy tờ. VD: <strong>Nguyễn Văn A</strong>
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Nhập họ và tên đầy đủ của bạn" 
                            {...field} 
                            data-testid="input-fullname"
                            className={field.value && field.value.length >= 3 ? "border-green-500" : ""}
                          />
                        </FormControl>
                        {field.value && field.value.length >= 3 && (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <span>✓</span>
                            <span>Tuyệt vời!</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 3: Phone */}
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                        Số điện thoại liên hệ
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        💡 Số điện thoại để học sinh và phụ huynh liên hệ. VD: <strong>0912345678</strong>
                      </p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Nhập số điện thoại (10 chữ số)" 
                            {...field} 
                            data-testid="input-phone"
                            className={field.value && /^0\d{9}$/.test(field.value) ? "border-green-500" : ""}
                          />
                        </FormControl>
                        {field.value && /^0\d{9}$/.test(field.value) && (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <span>✓</span>
                            <span>Số điện thoại hợp lệ</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Education */}
          {currentStep === 2 && (
            <Card data-testid="step-2-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Học vấn & Chứng chỉ
                </CardTitle>
                <CardDescription>
                  Thông tin về quá trình đào tạo và chứng chỉ của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section 1: Education */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Trình độ học vấn
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Liệt kê bằng cấp từ cao xuống thấp. VD: <strong>Cử nhân - ĐH Bách Khoa HN - 2020</strong>
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-4 mt-4">
                          {(!field.value || field.value.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p className="text-sm">Chưa có thông tin học vấn nào</p>
                              <p className="text-xs mt-1">Nhấn nút bên dưới để thêm</p>
                            </div>
                          )}
                          
                          {field.value?.map((edu, index) => (
                            <Card key={index} className="p-4 relative group hover:shadow-md transition-shadow">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const newEdu = [...field.value];
                                  newEdu.splice(index, 1);
                                  field.onChange(newEdu);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              
                              <div className="space-y-3 pr-8">
                                <div>
                                  <label className="text-sm font-medium">
                                    Bằng cấp / Trình độ <span className="text-destructive">*</span>
                                  </label>
                                  <Select
                                    value={edu.degree}
                                    onValueChange={(value) => {
                                      const newEdu = [...field.value];
                                      newEdu[index] = { ...newEdu[index], degree: value };
                                      field.onChange(newEdu);
                                    }}
                                  >
                                    <SelectTrigger className={edu.degree ? "border-green-500" : "border-destructive"}>
                                      <SelectValue placeholder="Chọn trình độ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Tốt nghiệp THPT">Tốt nghiệp THPT</SelectItem>
                                      <SelectItem value="Cao đẳng">Cao đẳng</SelectItem>
                                      <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                                      <SelectItem value="Thạc sĩ">Thạc sĩ</SelectItem>
                                      <SelectItem value="Tiến sĩ">Tiến sĩ</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {edu.degree && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Đã chọn</p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">
                                    Trường <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    placeholder="VD: Đại học Bách Khoa Hà Nội"
                                    value={edu.school}
                                    onChange={(e) => {
                                      const newEdu = [...field.value];
                                      newEdu[index] = { ...newEdu[index], school: e.target.value };
                                      field.onChange(newEdu);
                                    }}
                                    className={edu.school && edu.school.length >= 2 ? "border-green-500" : ""}
                                  />
                                  {edu.school && edu.school.length >= 2 && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Hợp lệ</p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">
                                    Năm tốt nghiệp <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    placeholder="VD: 2020"
                                    value={edu.year}
                                    onChange={(e) => {
                                      const newEdu = [...field.value];
                                      newEdu[index] = { ...newEdu[index], year: e.target.value };
                                      field.onChange(newEdu);
                                    }}
                                    className={edu.year && edu.year.length === 4 ? "border-green-500" : ""}
                                  />
                                  {edu.year && edu.year.length === 4 && (
                                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Hợp lệ</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                          
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            onClick={() => {
                              field.onChange([...(field.value || []), { degree: '', school: '', year: '' }]);
                            }}
                          >
                          <Plus className="h-4 w-4 mr-2" />
                          Thêm học vấn
                        </Button>
                      </div>
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                {/* Section 2: Certifications */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Chứng chỉ (không bắt buộc)
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        💡 VD: <strong>IELTS 8.0</strong>, <strong>Giáo viên giỏi cấp thành phố</strong>
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3 mt-4">
                          {(!field.value || field.value.length === 0) && (
                            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                              <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Chưa có chứng chỉ nào</p>
                              <p className="text-xs mt-1">Nhấn nút bên dưới để thêm (không bắt buộc)</p>
                            </div>
                          )}
                          
                          {field.value?.map((cert, index) => (
                            <div key={index} className="flex gap-2 group">
                              <Input
                                placeholder="VD: IELTS 8.0, Chứng chỉ Giáo viên giỏi..."
                                value={cert}
                                onChange={(e) => {
                                  const newCerts = [...(field.value || [])];
                                  newCerts[index] = e.target.value;
                                  field.onChange(newCerts);
                                }}
                                className={cert && cert.length >= 3 ? "border-green-500" : ""}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  const newCerts = [...(field.value || [])];
                                  newCerts.splice(index, 1);
                                  field.onChange(newCerts);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                            onClick={() => {
                              field.onChange([...(field.value || []), '']);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm chứng chỉ
                          </Button>
                        </div>
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  Thông tin về kinh nghiệm giảng dạy và môn học bạn có thể dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section 1: Occupation & Experience */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Nghề nghiệp và kinh nghiệm
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Chọn nghề nghiệp hiện tại. Chưa có kinh nghiệm thì để trống.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="occupationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nghề nghiệp hiện tại *</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value?.toString()}
                            data-testid="select-occupation"
                          >
                            <FormControl>
                              <SelectTrigger className={field.value ? "border-green-500" : ""}>
                                <SelectValue placeholder="Chọn nghề nghiệp" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingOccupations ? (
                                <div className="text-sm text-muted-foreground py-2 px-2">Đang tải...</div>
                              ) : (
                                occupationsList.map(occupation => (
                                  <SelectItem key={occupation.id} value={occupation.id.toString()}>
                                    {occupation.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {field.value && (
                            <p className="text-sm text-green-600 dark:text-green-400">✓ Đã chọn</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="teachingExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số năm kinh nghiệm</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              step="1"
                              placeholder="VD: 3" 
                              {...field}
                              data-testid="input-experience"
                              className={field.value && parseInt(field.value) > 0 ? "border-green-500" : ""}
                            />
                          </FormControl>
                          {field.value && parseInt(field.value) > 0 ? (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              ✓ {field.value} năm kinh nghiệm
                            </p>
                          ) : (
                            <FormDescription>
                              Nếu để trống, sẽ hiển thị "Dưới 1 năm kinh nghiệm"
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Section 2: Subject-Grade Mapping */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        Môn học và lớp có thể dạy
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        💡 Chọn môn học → Click cấp học → Chọn các lớp bạn có thể dạy
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="subjectGrades"
                    render={({ field }) => {
                      // Get available subjects (not yet selected)
                      const selectedSubjectIds = field.value?.map(sg => sg.subjectId) || [];
                      const availableSubjects = subjects.filter(s => !selectedSubjectIds.includes(s.id));

                      return (
                        <FormItem>
                          {isLoadingSubjects || isLoadingGrades ? (
                            <div className="text-sm text-muted-foreground py-2">Đang tải dữ liệu...</div>
                          ) : (
                            <div className="space-y-4 mt-4">
                            {/* Display selected subjects */}
                            {field.value && field.value.length > 0 && (
                              <div className="space-y-3">
                                {field.value.map((sg, index) => {
                                  const subject = subjects.find(s => s.id === sg.subjectId);
                                  if (!subject) return null;

                                  return (
                                    <div key={sg.subjectId} className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5 space-y-3">
                                      {/* Subject header with remove button */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <BookOpen className="h-5 w-5 text-primary" />
                                          <h4 className="font-semibold text-lg">{subject.name}</h4>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            field.onChange(field.value?.filter((_, i) => i !== index));
                                          }}
                                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                          Xóa
                                        </Button>
                                      </div>

                                      {/* Grade selection by category - Expand/Collapse */}
                                      <div className="space-y-3 pl-7">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                          <p className="text-sm text-blue-900">
                                            💡 <strong>Hướng dẫn:</strong> Click vào cấp học để xem các lớp, sau đó chọn các lớp bạn có thể dạy.
                                          </p>
                                        </div>

                                        {/* Category Buttons - FILTERED BY SUBJECT */}
                                        <div className="flex flex-wrap gap-2">
                                          {categories.map(category => {
                                            const gradeLevelsByCategory = getGradeLevelsByCategoryForSubject(sg.subjectId);
                                            const categoryGrades = gradeLevelsByCategory[category] || [];
                                            if (categoryGrades.length === 0) return null;

                                            const allGradesInCategory = categoryGrades.map(g => g.id);
                                            const selectedInCategory = allGradesInCategory.filter(id => sg.gradeIds.includes(id));
                                            const hasSelected = selectedInCategory.length > 0;
                                            const isExpanded = expandedCategories[sg.subjectId] === category;

                                            return (
                                              <Button
                                                key={category}
                                                type="button"
                                                variant={isExpanded ? "default" : (hasSelected ? "secondary" : "outline")}
                                                size="sm"
                                                onClick={() => {
                                                  setExpandedCategories(prev => ({
                                                    ...prev,
                                                    [sg.subjectId]: isExpanded ? null : category
                                                  }));
                                                }}
                                                className="relative"
                                              >
                                                {category}
                                                {hasSelected && (
                                                  <span className="ml-1.5 text-xs font-semibold">
                                                    ({selectedInCategory.length})
                                                  </span>
                                                )}
                                                {isExpanded ? (
                                                  <ChevronRight className="ml-1 h-3 w-3 rotate-90 transition-transform" />
                                                ) : (
                                                  <ChevronRight className="ml-1 h-3 w-3 transition-transform" />
                                                )}
                                              </Button>
                                            );
                                          })}
                                        </div>

                                        {/* Expanded category grades */}
                                        {expandedCategories[sg.subjectId] && (() => {
                                          const expandedCategory = expandedCategories[sg.subjectId];
                                          const gradeLevelsByCategory = getGradeLevelsByCategoryForSubject(sg.subjectId);
                                          const categoryGrades = gradeLevelsByCategory[expandedCategory!] || [];

                                          return (
                                            <div className="mt-3 p-3 bg-secondary/30 rounded-lg space-y-2">
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Chọn lớp trong {expandedCategory}:</span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-auto p-0 text-xs underline-offset-2 hover:underline"
                                                  onClick={() => {
                                                    const allGradesInCategory = categoryGrades.map(g => g.id);
                                                    const allSelected = allGradesInCategory.every(id => sg.gradeIds.includes(id));

                                                    const newSubjectGrades = field.value.map((item, i) => {
                                                      if (i === index) {
                                                        if (allSelected) {
                                                          return {
                                                            ...item,
                                                            gradeIds: item.gradeIds.filter(id => !allGradesInCategory.includes(id))
                                                          };
                                                        } else {
                                                          const newIds = [...new Set([...item.gradeIds, ...allGradesInCategory])];
                                                          return {
                                                            ...item,
                                                            gradeIds: newIds
                                                          };
                                                        }
                                                      }
                                                      return item;
                                                    });
                                                    field.onChange(newSubjectGrades);
                                                  }}
                                                >
                                                  {categoryGrades.every(g => sg.gradeIds.includes(g.id)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                                </Button>
                                              </div>

                                              <div className="flex flex-wrap gap-2">
                                                {categoryGrades.map(grade => {
                                                  const isGradeSelected = sg.gradeIds.includes(grade.id);

                                                  return (
                                                    <label
                                                      key={grade.id}
                                                      className={`
                                                        inline-flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-all
                                                        ${isGradeSelected
                                                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                                                          : 'bg-background border-2 border-muted hover:border-primary/50 hover:bg-primary/5'
                                                        }
                                                      `}
                                                    >
                                                      <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={isGradeSelected}
                                                        onChange={(e) => {
                                                          const checked = e.target.checked;
                                                          const newSubjectGrades = field.value.map((item, i) => {
                                                            if (i === index) {
                                                              return {
                                                                ...item,
                                                                gradeIds: checked
                                                                  ? [...item.gradeIds, grade.id]
                                                                  : item.gradeIds.filter(id => id !== grade.id)
                                                              };
                                                            }
                                                            return item;
                                                          });
                                                          field.onChange(newSubjectGrades);
                                                        }}
                                                      />
                                                      {grade.name}
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {/* Summary of selected grades with improved color coding */}
                                        {sg.gradeIds.length > 0 && (
                                          <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              <p className="text-sm font-semibold text-green-900">
                                                Đã chọn {sg.gradeIds.length} lớp
                                              </p>
                                            </div>
                                            <div className="space-y-2">
                                              {categories.map(category => {
                                                const gradeLevelsByCategory = getGradeLevelsByCategoryForSubject(sg.subjectId);
                                                const categoryGrades = gradeLevelsByCategory[category] || [];
                                                const selectedInCategory = categoryGrades.filter(g => sg.gradeIds.includes(g.id));

                                                if (selectedInCategory.length === 0) return null;

                                                // Different color schemes for each category
                                                const categoryColors: Record<string, { bg: string; badge: string; text: string; border: string }> = {
                                                  'Tiểu học': {
                                                    bg: 'bg-blue-50',
                                                    badge: 'bg-blue-500 text-white',
                                                    text: 'text-blue-700',
                                                    border: 'border-blue-200'
                                                  },
                                                  'THCS': {
                                                    bg: 'bg-purple-50',
                                                    badge: 'bg-purple-500 text-white',
                                                    text: 'text-purple-700',
                                                    border: 'border-purple-200'
                                                  },
                                                  'THPT': {
                                                    bg: 'bg-orange-50',
                                                    badge: 'bg-orange-500 text-white',
                                                    text: 'text-orange-700',
                                                    border: 'border-orange-200'
                                                  },
                                                  'Luyện thi': {
                                                    bg: 'bg-red-50',
                                                    badge: 'bg-red-500 text-white',
                                                    text: 'text-red-700',
                                                    border: 'border-red-200'
                                                  },
                                                  'Khác': {
                                                    bg: 'bg-gray-50',
                                                    badge: 'bg-gray-500 text-white',
                                                    text: 'text-gray-700',
                                                    border: 'border-gray-200'
                                                  },
                                                };

                                                const colors = categoryColors[category] || categoryColors['Khác'];

                                                return (
                                                  <div key={category} className={`${colors.bg} ${colors.border} border rounded-lg p-2`}>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <span className={`inline-flex items-center px-2 py-0.5 ${colors.badge} text-xs font-semibold rounded-md`}>
                                                        {category}
                                                      </span>
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {selectedInCategory.map(grade => (
                                                          <span
                                                            key={grade.id}
                                                            className={`inline-flex items-center gap-1 px-2 py-1 bg-white ${colors.border} border ${colors.text} text-xs font-medium rounded-full shadow-sm hover:shadow-md transition-shadow`}
                                                          >
                                                            {grade.name}
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                const newSubjectGrades = field.value.map((item, i) => {
                                                                  if (i === index) {
                                                                    return {
                                                                      ...item,
                                                                      gradeIds: item.gradeIds.filter(id => id !== grade.id)
                                                                    };
                                                                  }
                                                                  return item;
                                                                });
                                                                field.onChange(newSubjectGrades);
                                                              }}
                                                              className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                                                              aria-label={`Xóa ${grade.name}`}
                                                            >
                                                              ×
                                                            </button>
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {/* Show error if no grades selected */}
                                        {sg.gradeIds.length === 0 && (
                                          <Alert variant="destructive" className="py-2">
                                            <AlertDescription className="text-sm">
                                              Vui lòng chọn ít nhất 1 lớp cho môn {subject.name}
                                            </AlertDescription>
                                          </Alert>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add subject section with clear instructions */}
                            {availableSubjects.length > 0 && (
                              <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 bg-primary/5 space-y-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary font-semibold text-sm">
                                      {field.value.length + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <h4 className="font-semibold text-base mb-1">
                                        {field.value.length === 0 ? 'Thêm môn học đầu tiên' : 'Thêm môn học khác'}
                                      </h4>
                                      <p className="text-sm text-muted-foreground">
                                        {field.value.length === 0
                                          ? 'Chọn môn học bạn có thể dạy, sau đó chọn các lớp phù hợp'
                                          : 'Bạn có thể dạy nhiều môn học. Tiếp tục thêm nếu bạn muốn.'
                                        }
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Select
                                        onValueChange={(value) => {
                                          const subjectId = parseInt(value);
                                          field.onChange([...field.value, { subjectId, gradeIds: [] }]);
                                        }}
                                      >
                                        <SelectTrigger className="flex-1 bg-background">
                                          <SelectValue placeholder="Chọn môn học..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {availableSubjects.map(subject => (
                                            <SelectItem key={subject.id} value={subject.id.toString()}>
                                              {subject.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Success state when all subjects added */}
                            {availableSubjects.length === 0 && field.value.length > 0 && (
                              <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium text-green-900">
                                    Hoàn tất! Đã thêm {field.value.length} môn học
                                  </p>
                                  <p className="text-xs text-green-700">
                                    Bạn đã thêm tất cả các môn học có sẵn
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Empty state - encourage to start */}
                            {field.value.length === 0 && (
                              <Alert className="border-orange-200 bg-orange-50">
                                <AlertDescription className="text-orange-900">
                                  <strong>Lưu ý:</strong> Bạn cần chọn ít nhất 1 môn học để tiếp tục. Bạn có thể thêm nhiều môn học và chọn các lớp khác nhau cho mỗi môn.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                </div>
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
                  Giúp học sinh và phụ huynh hiểu rõ hơn về bạn và phong cách giảng dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Bio Section */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Giới thiệu bản thân
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Hãy chia sẻ về bản thân, kinh nghiệm giảng dạy và điểm mạnh của bạn. Phụ huynh muốn biết:
                      </p>
                      <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1 ml-2">
                        <li>Bạn đã dạy được bao lâu?</li>
                        <li>Bạn giỏi ở lĩnh vực nào?</li>
                        <li>Điều gì khiến bạn đặc biệt?</li>
                      </ul>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => {
                      const charCount = (field.value || '').length;
                      const isValid = charCount >= 50 && charCount <= 1000;

                      return (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">
                            Giới thiệu bản thân *
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Textarea
                                {...field}
                                placeholder="VD: Xin chào, tôi là Nguyễn Văn A, có 5 năm kinh nghiệm giảng dạy Toán THPT. Tôi chuyên giúp học sinh nắm vững kiến thức cơ bản và phát triển tư duy logic..."
                                rows={8}
                                className="resize-y"
                              />
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${
                                  charCount < 50 ? 'text-red-500' :
                                  charCount > 1000 ? 'text-red-500' :
                                  'text-green-600'
                                }`}>
                                  {charCount} / 1000 ký tự {charCount < 50 && `(còn thiếu ${50 - charCount})`}
                                </span>
                                {isValid && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Hợp lệ
                                  </span>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            💡 Viết chi tiết để thu hút học sinh và phụ huynh
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Divider */}
                <div className="border-t" />

                {/* Teaching Method Section */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        Phương pháp giảng dạy
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Mô tả cách bạn dạy và tương tác với học sinh:
                      </p>
                      <ul className="text-sm text-purple-700 dark:text-purple-300 list-disc list-inside space-y-1 ml-2">
                        <li>Bạn dạy theo phong cách nào? (lý thuyết, thực hành, kết hợp)</li>
                        <li>Bạn sử dụng tài liệu/công cụ gì?</li>
                        <li>Bạn đánh giá tiến độ học sinh như thế nào?</li>
                      </ul>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="teachingMethod"
                    render={({ field }) => {
                      const charCount = (field.value || '').length;
                      const isValid = charCount >= 20;

                      return (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">
                            Phương pháp giảng dạy *
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <Textarea
                                {...field}
                                placeholder="VD: Tôi áp dụng phương pháp dạy tương tác, kết hợp lý thuyết với bài tập thực hành. Sau mỗi buổi học, tôi giao bài tập về nhà và kiểm tra định kỳ để đảm bảo học sinh nắm vững kiến thức..."
                                rows={8}
                                className="resize-y"
                              />
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-medium ${
                                  charCount < 20 ? 'text-red-500' : 'text-green-600'
                                }`}>
                                  {charCount} ký tự {charCount < 20 && `(còn thiếu ${20 - charCount})`}
                                </span>
                                {isValid && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Hợp lệ
                                  </span>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            💡 Chia sẻ điểm đặc biệt trong cách dạy của bạn để thu hút học sinh
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {/* Divider */}
                <div className="border-t" />

                {/* Achievements Section */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Thành tích nổi bật (không bắt buộc)
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Liệt kê các thành tích đáng tự hào để tăng uy tín:
                      </p>
                      <div className="grid gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>Học sinh đạt 9.5+ môn Toán: 45 em</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>Giải Nhất Olympic Vật Lý cấp tỉnh 2023</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>100% học sinh đỗ đại học năm 2024</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="achievementsList"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold flex items-center gap-2">
                          <Award className="h-4 w-4 text-amber-500" />
                          Thành tích nổi bật
                        </FormLabel>
                        <FormDescription className="text-xs">
                          Thêm từng thành tích một dòng. Bạn có thể bỏ qua nếu chưa có.
                        </FormDescription>
                        
                        <div className="space-y-3 mt-4">
                          {field.value && field.value.length > 0 ? (
                            field.value.map((achievement, index) => (
                              <div key={index} className="flex gap-2 items-start group">
                                <div className="flex-1">
                                  <Input
                                    placeholder={`VD: ${
                                      index === 0 ? 'Học sinh đạt 9.5+ môn Toán: 45 em' :
                                      index === 1 ? 'Giải Nhất Olympic Vật Lý cấp tỉnh 2023' :
                                      '100% học sinh đỗ đại học năm 2024'
                                    }`}
                                    value={achievement}
                                    onChange={(e) => {
                                      const newAchievements = [...(field.value || [])];
                                      newAchievements[index] = e.target.value;
                                      field.onChange(newAchievements);
                                    }}
                                    className="transition-all"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    const newAchievements = [...(field.value || [])];
                                    newAchievements.splice(index, 1);
                                    field.onChange(newAchievements);
                                  }}
                                  title="Xóa thành tích này"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                              <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Chưa có thành tích nào</p>
                              <p className="text-xs mt-1">Nhấn nút bên dưới để thêm</p>
                            </div>
                          )}
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              field.onChange([...(field.value || []), '']);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm thành tích
                          </Button>
                          
                          {field.value && field.value.length > 0 && (
                            <p className="text-xs text-muted-foreground text-center">
                              Đã thêm {field.value.length} thành tích
                            </p>
                          )}
                        </div>
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Availability & Rate */}
          {currentStep === 5 && (
            <Card data-testid="step-5-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Ca dạy & Học phí
                </CardTitle>
                <CardDescription>
                  Thiết lập học phí và thời gian bạn có thể dạy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Section 1: Hourly Rate */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Mức học phí của bạn
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        💡 Gợi ý: <strong>50k-100k</strong> (Mới), <strong>100k-200k</strong> (Có kinh nghiệm), <strong>200k+</strong> (Chuyên gia)
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="VD: 100,000"
                            value={field.value ? new Intl.NumberFormat('vi-VN').format(field.value) : ''}
                            onChange={(e) => {
                              const rawValue = e.target.value.replace(/[.,]/g, '');
                              const numValue = parseInt(rawValue) || 0;
                              field.onChange(numValue);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            className={field.value && field.value >= 1000 ? "border-green-500 text-lg font-semibold" : "text-lg"}
                          />
                        </FormControl>
                        {field.value && field.value >= 1000 && (
                          <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <span>✓</span>
                            <span>{new Intl.NumberFormat('vi-VN').format(field.value)} VNĐ/giờ</span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section 2: Teaching Sessions */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        Thời gian có thể dạy
                      </h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        💡 Chọn ca dạy trong tuần. Có thể thêm nhiều ca/ngày và thay đổi sau.
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="teachingSessions"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TeachingSessionManager
                            sessions={field.value || []}
                            onChange={field.onChange}
                            hourlyRate={form.watch('hourlyRate') || 100000}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-between items-center">
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

            <div className="flex gap-3">
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground mr-2 self-center">
                  Step {currentStep}/{STEPS.length} | Mode: {mode}
                </div>
              )}
              
              {/* Show Save button in edit mode for all steps - Show FIRST for convenience */}
              {mode === 'edit' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveCurrentStep}
                  disabled={savingStep === currentStep}
                  data-testid="button-save-step"
                  className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  {savingStep === currentStep ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      💾 Lưu bước này
                    </>
                  )}
                </Button>
              )}
              
              {/* Next/Submit button - Show after Save button in edit mode */}
              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    console.log('🔵 [Button Click] "Tiếp theo" clicked');
                    console.log('[Button] Event type:', e.type);
                    console.log('[Button] Button type:', e.currentTarget.type);
                    console.log('[Button] Current step:', currentStep);
                    e.preventDefault();
                    e.stopPropagation();
                    nextStep();
                  }}
                  data-testid="button-next"
                  variant="default"
                  className="gap-2"
                >
                  Tiếp theo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit-registration"
                  onClick={() => {
                    console.log('🔵 [Button Click] "Submit" clicked at step', currentStep);
                  }}
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : mode === 'edit'
                      ? "Lưu tất cả & Hoàn tất"
                      : "Đăng ký làm gia sư"}
                </Button>
              )}
            </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
