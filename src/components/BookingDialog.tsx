import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Calendar as CalendarIcon, CheckCircle2, Package, BookOpen, Sparkles, AlertCircle, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Subject {
  name: string;
  grades: string;
}

interface AvailableSlot {
  id: string;
  dayLabels: string;
  startTime: string;
  endTime: string;
  price: number;
  sessionsPerWeek: number;
  slotIds?: number[]; // ✅ Array of actual DB slot IDs for multi-day slots
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorId: number;
  tutorName: string;
  hourlyRate: number;
  lessonDuration: number;
  availableSlots?: AvailableSlot[];
  tutorSubjects?: Subject[];
  preSelectedSlotId?: string; // ✅ UX: Pre-select slot when user clicks from schedule
  openAsTrialMode?: boolean; // ✅ UX: Auto-check trial mode when opening from trial button
}

const PACKAGES = [
  { id: "1m", months: 1, discount: 0, label: "1 tháng", popular: false },
  { id: "2m", months: 2, discount: 3, label: "2 tháng (giảm 3%)", popular: false },
  { id: "3m", months: 3, discount: 5, label: "3 tháng (giảm 5%)", popular: true },
  { id: "6m", months: 6, discount: 8, label: "6 tháng (giảm 8%)", popular: false },
  { id: "12m", months: 12, discount: 12, label: "12 tháng (giảm 12%)", popular: false },
];

export function BookingDialog({ 
  open, 
  onOpenChange, 
  tutorId,
  tutorName, 
  hourlyRate,
  lessonDuration,
  availableSlots = [],
  tutorSubjects = [],
  preSelectedSlotId,
  openAsTrialMode = false
}: BookingDialogProps) {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  
  // Refs for error scrolling
  const subjectsRef = useRef<HTMLDivElement>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showTrialPreview, setShowTrialPreview] = useState<boolean>(false);
  const [trialLessonsCount, setTrialLessonsCount] = useState<number>(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  
  // ✅ OPTIMIZED: Load from localStorage immediately (no flash)
  const getInitialValue = (key: string, defaultValue: any) => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const saved = localStorage.getItem('booking-personal-info');
      if (!saved) return defaultValue;
      const info = JSON.parse(saved);
      // Check if data is less than 30 days old
      if (Date.now() - info.timestamp < 30 * 24 * 60 * 60 * 1000) {
        return info[key] ?? defaultValue;
      }
    } catch (e) {
      console.error('Failed to load initial value:', e);
    }
    return defaultValue;
  };

  // ✅ NEW: Editable profile fields with lazy initialization
  const [userFullName, setUserFullName] = useState<string>(() => getInitialValue('fullName', ''));
  const [userPhone, setUserPhone] = useState<string>(() => getInitialValue('phone', ''));
  const [selectedGrade, setSelectedGrade] = useState<string>(() => getInitialValue('grade', ''));
  const [additionalNotes, setAdditionalNotes] = useState<string>(() => getInitialValue('notes', ''));
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => getInitialValue('subjects', []));
  const [selectedSlot, setSelectedSlot] = useState<string>(() => getInitialValue('slot', ''));
  const [selectedPackage, setSelectedPackage] = useState<string>(() => getInitialValue('package', '1m'));
  
  const [profileChanged, setProfileChanged] = useState<boolean>(false);
  const [originalProfile, setOriginalProfile] = useState<{fullName: string, phone: string, grade: string}>(() => {
    // Initialize from localStorage too (avoid marking as changed on first load)
    if (typeof window === 'undefined') return {fullName: "", phone: "", grade: ""};
    try {
      const saved = localStorage.getItem('booking-personal-info');
      if (!saved) return {fullName: "", phone: "", grade: ""};
      const info = JSON.parse(saved);
      if (Date.now() - info.timestamp < 30 * 24 * 60 * 60 * 1000) {
        return {
          fullName: info.fullName || "",
          phone: info.phone || "",
          grade: info.grade || "",
        };
      }
    } catch (e) {
      console.error('Failed to load original profile:', e);
    }
    return {fullName: "", phone: "", grade: ""};
  });
  const [hasBookedBefore, setHasBookedBefore] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<number>(0); // ✅ Multi-step progress

  // ✅ PHASE 1: Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (open && status === "unauthenticated") {
      onOpenChange(false);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
      toast({
        title: "Yêu cầu đăng nhập",
        description: "Vui lòng đăng nhập để đặt lịch học",
        variant: "default",
      });
    }
  }, [open, status, onOpenChange, router, toast]);

  // ✅ NEW: Check booking history with this tutor
  useEffect(() => {
    const checkHistory = async () => {
      if (!open || !session?.user?.id || !tutorId) return;
      
      try {
        const response = await fetch(`/api/bookings/history?tutorId=${tutorId}`);
        if (response.ok) {
          const data = await response.json();
          setHasBookedBefore(data.count > 0);
        }
      } catch (error) {
        console.error('Failed to check booking history:', error);
      }
    };

    checkHistory();
  }, [open, session?.user?.id, tutorId]);

  // ✅ PHASE 3: Detect profile changes
  useEffect(() => {
    if (userFullName !== originalProfile.fullName || 
        userPhone !== originalProfile.phone || 
        selectedGrade !== originalProfile.grade) {
      setProfileChanged(true);
    } else {
      setProfileChanged(false);
    }
  }, [userFullName, userPhone, selectedGrade, originalProfile]);

  // ✅ Auto-save personal info to localStorage (global across all tutors)
  useEffect(() => {
    if (!open) return;
    
    const personalInfo = {
      fullName: userFullName,
      phone: userPhone,
      grade: selectedGrade,
      notes: additionalNotes,
      subjects: selectedSubjects,
      slot: selectedSlot,
      package: selectedPackage,
      timestamp: Date.now(),
    };
    
    localStorage.setItem('booking-personal-info', JSON.stringify(personalInfo));
  }, [open, userFullName, userPhone, selectedGrade, additionalNotes, selectedSubjects, selectedSlot, selectedPackage]);

  // ✅ Filter subjects & slots when tutor changes
  useEffect(() => {
    // Only filter if we have data (avoid filtering on initial empty state)
    if (tutorSubjects.length === 0 && availableSlots.length === 0) {
      return;
    }

    // Filter subjects: Remove subjects that current tutor doesn't teach
    setSelectedSubjects(prev => {
      if (!prev || prev.length === 0) return prev;
      if (tutorSubjects.length === 0) return prev; // No subjects loaded yet, keep current
      const tutorSubjectNames = tutorSubjects.map(s => s.name);
      const filtered = prev.filter(subjectName => tutorSubjectNames.includes(subjectName));
      return filtered;
    });

    // Filter slot: Clear ONLY if slot is invalid for current tutor
    setSelectedSlot(prev => {
      if (!prev) return prev;
      if (availableSlots.length === 0) return prev; // No slots loaded yet, keep current
      const slotExists = availableSlots.some(s => s.id === prev);
      if (slotExists) {
        return prev; // Slot is valid, keep it
      }
      // Only clear if we're actually switching tutors (not just re-rendering same tutor)
      return ""; 
    });
  }, [tutorId]); // ✅ Only re-run when tutorId changes

  // ✅ Fetch from DB when dialog opens (will override localStorage if user logged in)
  useEffect(() => {
    if (!open || !session?.user?.id) return;
    
    const loadFromDB = async () => {
      setIsLoadingProfile(true);
      
      try {
        const response = await fetch(`/api/students/booking-profile`);
        if (response.ok) {
          const data = await response.json();
          
          // If DB has data, use it and clear localStorage
          if (data.fullName || data.phone) {
            setUserFullName(data.fullName || "");
            setUserPhone(data.phone || "");
            setSelectedGrade(data.gradeLevel || "");
            setTrialLessonsCount(data.trialCount || 0);
            
            setOriginalProfile({
              fullName: data.fullName || "",
              phone: data.phone || "",
              grade: data.gradeLevel || "",
            });
            
            // Clear localStorage since we have DB data
            localStorage.removeItem('booking-personal-info');
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadFromDB();
  }, [open, session?.user?.id]);

  useEffect(() => {
    if (!open) {
      // Reset khi đóng dialog
      setIsTrial(false);
      setIsSubmitting(false);
      setShowTrialPreview(false);
      setProfileChanged(false);
      setBookingStep(0);
    } else if (open) {
      // ✅ UX: Auto-check trial mode khi mở từ nút học thử
      if (openAsTrialMode) {
        setIsTrial(true);
        setShowTrialPreview(true);
      }
      
      // ✅ UX: Set pre-selected slot when opened with a slot selected from schedule
      // preSelectedSlotId is the slot group ID (string like "1", "2"...)
      if (preSelectedSlotId && availableSlots.some(s => s.id === preSelectedSlotId)) {
        setSelectedSlot(preSelectedSlotId);
        
        // Scroll to slot section if pre-selected
        setTimeout(() => {
          slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [open, preSelectedSlotId, openAsTrialMode]); // ✅ Removed availableSlots - only run on open/preSelectedSlotId change

  const toggleSubject = (subjectName: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectName) 
        ? prev.filter(s => s !== subjectName)
        : [...prev, subjectName]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const slot = availableSlots.find((s) => s.id === selectedSlot);
  const pkg = PACKAGES.find((p) => p.id === selectedPackage);

  // ✅ PERFORMANCE: Memoized calculations to prevent unnecessary re-renders
  const totalSessions = useMemo(() => {
    if (!slot || !pkg) return 0;
    return pkg.months * slot.sessionsPerWeek * 4;
  }, [slot, pkg]);

  const monthlyPrice = useMemo(() => {
    if (!slot) return 0;
    return slot.sessionsPerWeek * 4 * slot.price;
  }, [slot]);

  const totalPrice = useMemo(() => {
    if (!slot || !pkg) return 0;
    const baseTotal = monthlyPrice * pkg.months;
    const discountAmount = (baseTotal * pkg.discount) / 100;
    return baseTotal - discountAmount;
  }, [slot, pkg, monthlyPrice]);

  const handleBooking = async () => {
    // ⚠️ SECURITY: Validate user is logged in
    if (!session?.user?.id) {
      toast({
        variant: "destructive",
        title: "Chưa đăng nhập",
        description: "Vui lòng đăng nhập để đặt lịch học",
      });
      return;
    }

    // ✅ NEW: Validate contact info (required for all bookings)
    if (!userFullName || userFullName.trim().length < 2) {
      nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameRef.current?.focus();
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng nhập họ tên (ít nhất 2 ký tự)",
      });
      return;
    }

    if (!userPhone || userPhone.trim().length === 0) {
      phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneRef.current?.focus();
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng nhập số điện thoại để giáo viên liên lạc",
      });
      return;
    }

    // Validate phone format
    const phoneClean = userPhone.replace(/\s/g, '');
    if (!/^(0|\+84)[0-9]{9,10}$/.test(phoneClean)) {
      phoneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      phoneRef.current?.focus();
      toast({
        variant: "destructive",
        title: "Số điện thoại không hợp lệ",
        description: "Vui lòng nhập số điện thoại Việt Nam hợp lệ",
      });
      return;
    }

    // ✅ UX: Validate subject and grade
    if (tutorSubjects.length > 0 && !isTrial) {
      if (selectedSubjects.length === 0) {
        subjectsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        toast({
          variant: "destructive",
          title: "Thiếu thông tin",
          description: "Vui lòng chọn ít nhất 1 môn học",
        });
        return;
      }
    }
    
    if (!selectedGrade) {
      gradeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng chọn lớp đang học",
      });
      return;
    }

    // ✅ UX: Validate available slots exist
    if (availableSlots.length === 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Giáo viên chưa có lịch trống. Vui lòng chọn giáo viên khác hoặc liên hệ trực tiếp.",
      });
      return;
    }

    // ✅ UX: Validate slot selection (required cho cả trial và regular)
    if (!selectedSlot) {
      slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast({
        variant: "destructive",
        title: "Thiếu thông tin",
        description: "Vui lòng chọn ca học",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ STEP 1: Save profile if changed
      if (profileChanged) {
        const profileResponse = await fetch('/api/students/booking-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: userFullName.trim(),
            phone: userPhone.trim(),
            gradeLevelId: selectedGrade ? parseInt(selectedGrade) : null,
          }),
        });

        if (!profileResponse.ok) {
          const profileError = await profileResponse.json();
          throw new Error(profileError.error || 'Lỗi cập nhật thông tin cá nhân');
        }

        // ❌ REMOVED: Annoying toast after profile save
        // User already sees success toast after booking
      }

      // ✅ STEP 2: Create booking
      const slot = availableSlots.find(s => s.id === selectedSlot);
      
      if (!slot) {
        throw new Error('Không tìm thấy thông tin ca học. Vui lòng chọn lại.');
      }
      
      // Get actual DB slot ID (first one from group for multi-day slots)
      const actualSlotId = slot.slotIds?.[0];
      
      if (!actualSlotId) {
        throw new Error('Lỗi dữ liệu ca học. Vui lòng tải lại trang và thử lại.');
      }
      
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tutorId,
          availabilityId: actualSlotId, // ✅ Use actual DB slot ID
          subjects: selectedSubjects,
          grade: selectedGrade,
          isTrial: isTrial ? 1 : null, // NULL for regular, 1 for trial
          totalSessions: isTrial ? 1 : totalSessions,
          packageId: selectedPackage,
          packageMonths: pkg?.months || 1,
          pricePerSession: slot.price || 0,
          totalAmount: isTrial ? 0 : totalPrice,
          notes: additionalNotes.trim() || null, // ✅ Additional notes/requirements
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đã có lỗi xảy ra');
      }

      // ✅ Clear personal info on success (user info now in DB)
      // ✅ Only remove notes field, keep other info for next booking
      const savedInfo = localStorage.getItem('booking-personal-info');
      if (savedInfo) {
        try {
          const info = JSON.parse(savedInfo);
          // Clear notes and booking-specific fields after successful booking
          info.notes = '';
          info.subjects = [];
          info.slot = '';
          info.package = selectedPackage; // Keep package preference
          info.timestamp = Date.now();
          localStorage.setItem('booking-personal-info', JSON.stringify(info));
        } catch (e) {
          console.error('Failed to clear notes:', e);
        }
      }

      // Success
      toast({
        title: "Đặt lịch thành công! 🎉",
        description: isTrial 
          ? "Yêu cầu học thử đã được gửi đến giáo viên. Bạn sẽ nhận được thông báo khi giáo viên xác nhận."
          : `Yêu cầu đăng ký ${pkg?.label} (${totalSessions} buổi) đã được gửi đến giáo viên. Bạn sẽ nhận được thông báo khi giáo viên xác nhận và số tiền cần thanh toán.`,
      });

      onOpenChange(false);
      
      // ✅ IMPROVED: Use router.refresh() instead of window.reload()
      router.refresh();

    } catch (error) {
      console.error('Booking error:', error);
      toast({
        variant: "destructive",
        title: "Đặt lịch thất bại",
        description: error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="booking-dialog">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Đặt lịch học với {tutorName}
          </DialogTitle>
          <DialogDescription>
            Chọn ca học và gói buổi học phù hợp. Sau khi giáo viên xác nhận, bạn sẽ nhận được thông báo về số tiền cần thanh toán.
          </DialogDescription>
          {/* ✅ PHASE 3: Display user name */}
          {isLoadingProfile ? (
            <Skeleton className="h-5 w-48 mt-2" />
          ) : userFullName ? (
            <p className="text-sm text-muted-foreground mt-2">
              Xin chào, <strong className="text-foreground">{userFullName}</strong>! 👋
            </p>
          ) : null}
        </DialogHeader>

        {/* ✅ NEW: Progress Steps Indicator */}
        <div className="flex items-center justify-center gap-2 py-3 border-b">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            userFullName && userPhone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              userFullName && userPhone ? 'bg-primary-foreground text-primary' : 'bg-background text-foreground'
            }`}>
              {userFullName && userPhone ? '✓' : '1'}
            </div>
            <span className="hidden sm:inline">Thông tin</span>
          </div>

          <div className="h-px w-8 bg-border"></div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            selectedGrade && (tutorSubjects.length === 0 || selectedSubjects.length > 0) 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              selectedGrade && (tutorSubjects.length === 0 || selectedSubjects.length > 0)
                ? 'bg-primary-foreground text-primary' 
                : 'bg-background text-foreground'
            }`}>
              {selectedGrade && (tutorSubjects.length === 0 || selectedSubjects.length > 0) ? '✓' : '2'}
            </div>
            <span className="hidden sm:inline">Môn Lớp</span>
          </div>

          <div className="h-px w-8 bg-border"></div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            selectedSlot ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              selectedSlot ? 'bg-primary-foreground text-primary' : 'bg-background text-foreground'
            }`}>
              {selectedSlot ? '✓' : '3'}
            </div>
            <span className="hidden sm:inline">Ca học</span>
          </div>

          {!isTrial && (
            <>
              <div className="h-px w-8 bg-border"></div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                selectedPackage ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedPackage ? 'bg-primary-foreground text-primary' : 'bg-background text-foreground'
                }`}>
                  {selectedPackage ? '✓' : '4'}
                </div>
                <span className="hidden sm:inline">Gói học</span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6 py-4">
          {/* ✅ NEW: Contact Information Section */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Thông tin liên lạc</h3>
              {profileChanged && (
                <Badge variant="outline" className="ml-auto">
                  Đã chỉnh sửa
                </Badge>
              )}
            </div>

            {/* ✅ NEW: Booking History Alert */}
            {hasBookedBefore && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  Bạn đã đặt lịch với giáo viên này trước đó. 
                  <a href="/student/bookings" className="underline ml-1 font-medium">
                    Xem lịch sử →
                  </a>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="grid gap-4">
              {/* Full Name */}
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium mb-2 flex items-center gap-1">
                  Họ và tên <span className="text-destructive">*</span>
                </Label>
                {isLoadingProfile ? (
                  <Skeleton className="h-[44px] w-full" />
                ) : (
                  <input
                    ref={nameRef}
                    id="fullName"
                    type="text"
                    value={userFullName}
                    onChange={(e) => setUserFullName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    className="w-full px-4 py-3 min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    data-testid="input-fullname"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Giáo viên sẽ gọi tên này khi liên lạc
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className="text-sm font-medium mb-2 flex items-center gap-1">
                  Số điện thoại <span className="text-destructive">*</span>
                </Label>
                {isLoadingProfile ? (
                  <Skeleton className="h-[44px] w-full" />
                ) : (
                  <input
                    ref={phoneRef}
                    id="phone"
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full px-4 py-3 min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    data-testid="input-phone"
                  />
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Giáo viên sẽ liên hệ qua số này để sắp xếp lịch học
                </p>
              </div>
            </div>
          </div>

          {/* Checkbox Học thử */}
          <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center justify-center min-h-[44px] min-w-[44px]">
              <Checkbox
                id="is-trial"
                checked={isTrial}
                onCheckedChange={(checked) => {
                  const isChecked = checked as boolean;
                  
                  // ✅ UX: Check trial limit before allowing selection
                  if (isChecked && trialLessonsCount >= 3) {
                    toast({
                      variant: "destructive",
                      title: "Đã hết lượt học thử",
                      description: "Bạn đã sử dụng hết 3 buổi học thử miễn phí. Vui lòng đăng ký gói học chính thức.",
                    });
                    return;
                  }
                  
                  setIsTrial(isChecked);
                  if (isChecked) {
                    setShowTrialPreview(true);
                  }
                }}
                disabled={trialLessonsCount >= 3 || isLoadingProfile}
                className="h-5 w-5"
                data-testid="checkbox-trial"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="is-trial"
                className={`text-sm font-medium leading-none cursor-pointer flex items-center gap-2 ${
                  trialLessonsCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Đăng ký học thử (miễn phí)
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {trialLessonsCount >= 3 ? (
                  <span className="text-destructive font-medium">
                    ⚠️ Bạn đã sử dụng hết 3 buổi học thử miễn phí
                  </span>
                ) : (
                  <>
                    Buổi học thử 30-45 phút hoàn toàn miễn phí. 
                    <span className="font-medium text-primary ml-1">
                      Còn {3 - trialLessonsCount} lượt
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Thông báo học thử */}
          {isTrial && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Lưu ý học thử:</strong> Sau khi giáo viên xác nhận, bạn sẽ nhận được thông báo về lịch học thử cụ thể. Buổi học thử sẽ diễn ra theo ca học mà giáo viên đã đăng ký.
              </AlertDescription>
            </Alert>
          )}

          {/* Chọn môn học và lớp */}
          {tutorSubjects.length > 0 && (
            <>
              <div ref={subjectsRef}>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Môn học muốn học
                  {!isTrial && <span className="text-destructive">*</span>}
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  💡 Bạn có thể chọn nhiều môn học cùng lúc
                </p>
                <div className="space-y-2">
                  {tutorSubjects.map((subject) => (
                    <div 
                      key={subject.name} 
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors min-h-[56px]"
                      data-testid={`subject-${subject.name.toLowerCase()}`}
                    >
                      <div className="flex items-center justify-center min-h-[44px] min-w-[44px]">
                        <Checkbox
                          id={`subject-${subject.name}`}
                          checked={selectedSubjects.includes(subject.name)}
                          onCheckedChange={() => toggleSubject(subject.name)}
                          className="h-5 w-5"
                          aria-label={`Chọn môn ${subject.name}`}
                          data-testid={`checkbox-${subject.name.toLowerCase()}`}
                        />
                      </div>
                      <label
                        htmlFor={`subject-${subject.name}`}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {subject.name}
                        <span className="text-muted-foreground ml-2">({subject.grades})</span>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedSubjects.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Đã chọn: <strong>{selectedSubjects.join(", ")}</strong>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Lớp đang học - MOVED outside conditional to always show */}
          <div ref={gradeRef}>
            <Label htmlFor="grade" className="text-base font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lớp đang học
              <span className="text-destructive">*</span>
            </Label>
            {isLoadingProfile ? (
              <Skeleton className="h-[44px] w-full" />
            ) : (
              <select
                id="grade"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-4 py-3 min-h-[44px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-label="Chọn lớp đang học"
                data-testid="select-grade"
              >
                <option value="">Chọn lớp</option>
                <option value="6">Lớp 6</option>
                <option value="7">Lớp 7</option>
                <option value="8">Lớp 8</option>
                <option value="9">Lớp 9</option>
                <option value="10">Lớp 10</option>
                <option value="11">Lớp 11</option>
                <option value="12">Lớp 12</option>
                <option value="other">Khác</option>
              </select>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Thông tin này giúp giáo viên chuẩn bị bài giảng phù hợp
            </p>
          </div>

          {/* Ghi chú / Yêu cầu thêm */}
          <div>
            <Label htmlFor="additionalNotes" className="text-base font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Ghi chú / Yêu cầu cho giáo viên
              <span className="text-xs font-normal text-muted-foreground">(Không bắt buộc)</span>
            </Label>
            <Textarea
              id="additionalNotes"
              placeholder="Ví dụ: Em muốn tập trung vào phần hình học, cần ôn tập cho kỳ thi sắp tới, hoặc bất kỳ yêu cầu đặc biệt nào..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="min-h-[100px] resize-y"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mô tả thêm những yêu cầu, mục tiêu học tập hoặc thông tin hữu ích cho giáo viên ({additionalNotes.length}/500 ký tự)
            </p>
          </div>

          {/* Chọn ca học - Thay đổi behavior cho trial mode */}
          <div ref={slotRef}>
            <Label className="text-base font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Chọn ca học
              {!isTrial && <span className="text-destructive">*</span>}
            </Label>
            
            {isTrial && (
              <Alert className="mb-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>Học thử miễn phí:</strong> Chọn ca học bạn muốn thử. Buổi học thử hoàn toàn miễn phí, không cần thanh toán.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {availableSlots.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Giáo viên chưa đăng ký ca học nào. Vui lòng liên hệ giáo viên để biết thêm chi tiết.
                  </AlertDescription>
                </Alert>
              ) : (
                availableSlots.map((slot) => {
                  const isSelected = selectedSlot === slot.id;
                  
                  return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlot(slot.id);
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 hover:bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                    role="button"
                    aria-label={`Ca học ${slot.dayLabels} từ ${slot.startTime} đến ${slot.endTime}`}
                    data-testid={`slot-option-${slot.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{slot.dayLabels}</Badge>
                          <Badge variant="secondary">
                            {slot.sessionsPerWeek} buổi/tuần
                          </Badge>
                          {isTrial && (
                            <Badge className="bg-green-500 text-white">
                              Học thử miễn phí
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                          <Clock className="h-4 w-4" />
                          <span>
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                      </div>
                      {!isTrial && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <p className="font-bold text-lg">
                              {formatPrice(slot.price)}
                            </p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-sm">
                                    <strong>Chi tiết giá:</strong><br/>
                                    • {slot.sessionsPerWeek} buổi/tuần<br/>
                                    • Mỗi buổi {lessonDuration} phút<br/>
                                    • Giá mỗi buổi: {formatPrice(slot.price)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <p className="text-sm text-foreground/70">/buổi</p>
                        </div>
                      )}
                      {isSelected && (
                        <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chọn gói thanh toán - Chỉ hiện khi KHÔNG phải học thử */}
          {!isTrial && (
            <>
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Chọn gói đăng ký <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-foreground/70 mb-3">
                  Gói tối thiểu 1 tháng. Hệ thống tự động tính số buổi dựa trên lịch học đã chọn.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg.id)}
                      className={`relative p-4 rounded-lg border-2 transition-all min-h-[80px] flex flex-col justify-center ${
                        selectedPackage === pkg.id
                          ? "border-primary bg-primary/5 hover:bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-primary/5"
                      }`}
                      aria-label={`Chọn gói ${pkg.label}`}
                      data-testid={`package-${pkg.id}`}
                    >
                      {pkg.popular && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs whitespace-nowrap">
                          Phổ biến
                        </Badge>
                      )}
                      <div className="text-center">
                        <p className="font-semibold text-sm sm:text-base">{pkg.months} tháng</p>
                        {pkg.discount > 0 && (
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                            Giảm {pkg.discount}%
                          </p>
                        )}
                      </div>
                      {selectedPackage === pkg.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary absolute bottom-2 right-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tóm tắt đặt lịch */}
              {selectedSlot && slot && pkg && (
                <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h4 className="font-bold text-lg">Chi tiết đăng ký</h4>
                  </div>
                  
                  {/* Thông tin cơ bản */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-foreground/70">Giáo viên</span>
                      <span className="font-semibold text-right">{tutorName}</span>
                    </div>
                    
                    {selectedSubjects.length > 0 && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-foreground/70">Môn học</span>
                        <span className="font-semibold text-right">
                          {selectedSubjects.join(", ")} - Lớp {selectedGrade}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-foreground/70">Lịch học</span>
                      <span className="font-semibold text-right">{slot.dayLabels}</span>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-foreground/70">Giờ học</span>
                      <span className="font-semibold text-right">
                        {slot.startTime} - {slot.endTime}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-foreground/70">Gói</span>
                      <span className="font-semibold text-right">{pkg.label}</span>
                    </div>
                  </div>

                  {/* Bảng tính phí */}
                  <div className="border-t border-primary/20 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/70">
                        {totalSessions} buổi × {formatPrice(slot.price)}
                      </span>
                      <span className="font-medium">
                        {formatPrice(monthlyPrice * pkg.months)}
                      </span>
                    </div>
                    
                    {pkg.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          Giảm giá {pkg.discount}%
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          -{formatPrice((monthlyPrice * pkg.months * pkg.discount) / 100)}
                        </span>
                      </div>
                    )}
                    
                    <div className="border-t border-primary/20 pt-3 mt-3 flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-lg">Tổng thanh toán</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p className="text-sm">
                                <strong>Cách tính:</strong><br/>
                                1. Giá cơ bản: {totalSessions} buổi × {formatPrice(slot.price)} = {formatPrice(monthlyPrice * pkg.months)}<br/>
                                {pkg.discount > 0 && (
                                  <>2. Giảm giá: {pkg.discount}% = -{formatPrice((monthlyPrice * pkg.months * pkg.discount) / 100)}<br/></>
                                )}
                                3. Tổng: {formatPrice(totalPrice)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-bold text-2xl text-primary">
                        {formatPrice(totalPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Lưu ý */}
                  <Alert className="mt-4 bg-background/50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Sau khi giáo viên xác nhận, bạn sẽ nhận thông báo về ngày bắt đầu học và hướng dẫn thanh toán.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex-1 min-h-[44px]" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            aria-label="Hủy đặt lịch"
            data-testid="button-cancel-booking"
          >
            Hủy
          </Button>
          <Button 
            className="flex-1 min-h-[44px]" 
            onClick={handleBooking}
            disabled={isSubmitting || !selectedSlot}
            aria-label={isTrial ? "Xác nhận đăng ký học thử" : "Xác nhận đăng ký học"}
            data-testid="button-confirm-booking"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Đang xử lý..." : (isTrial ? "Đăng ký học thử" : "Đăng ký học")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
