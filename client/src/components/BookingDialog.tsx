import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorName: string;
  hourlyRate: number;
  lessonDuration: number; // Thời lượng buổi học (giờ)
  isTrial?: boolean;
}

export function BookingDialog({ 
  open, 
  onOpenChange, 
  tutorName, 
  hourlyRate,
  lessonDuration,
  isTrial = false 
}: BookingDialogProps) {
  // For trial lessons (single session)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  
  // For monthly bookings
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime("");
      setSelectedMonth(new Date());
      setSelectedWeekdays([]);
      setSelectedTimeSlot("");
    }
  }, [open]);

  // Hàm tính giờ kết thúc từ giờ bắt đầu và thời lượng
  const calculateEndTime = (startTime: string, durationInHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationInHours * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Hàm tính số buổi học trong tháng
  const calculateSessionsInMonth = (month: Date, weekdays: number[]): number => {
    if (weekdays.length === 0) return 0;
    
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    let sessionCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      if (weekdays.includes(date.getDay())) {
        sessionCount++;
      }
    }
    
    return sessionCount;
  };

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", 
    "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00"
  ];

  const weekdayOptions = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 0, label: "Chủ nhật" },
  ];

  // Tạo time slots với cả giờ bắt đầu và kết thúc
  // Trial lessons are always 0.5 hours (30 minutes)
  const effectiveDuration = isTrial ? 0.5 : lessonDuration;
  const timeSlotRanges = timeSlots.map(startTime => ({
    start: startTime,
    end: calculateEndTime(startTime, effectiveDuration),
    display: `${startTime} - ${calculateEndTime(startTime, effectiveDuration)}`
  }));

  const handleWeekdayToggle = (weekday: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(weekday) 
        ? prev.filter(d => d !== weekday)
        : [...prev, weekday]
    );
  };

  const handleBooking = () => {
    if (isTrial) {
      // Trial booking logic - always 30 minutes (0.5 hours)
      if (!selectedDate || !selectedTime) {
        alert("Vui lòng chọn ngày và giờ học");
        return;
      }
      
      const endTime = calculateEndTime(selectedTime, 0.5);
      
      alert(`Đã đặt lịch học thử với ${tutorName}\nNgày: ${selectedDate.toLocaleDateString('vi-VN')}\nCa học: ${selectedTime} - ${endTime}\nThời lượng: 30 phút\nHọc phí: Miễn phí`);
    } else {
      // Monthly booking logic
      if (selectedWeekdays.length === 0 || !selectedTimeSlot) {
        alert("Vui lòng chọn các ngày trong tuần và ca học");
        return;
      }

      const sessionsCount = calculateSessionsInMonth(selectedMonth, selectedWeekdays);
      const totalFee = sessionsCount * hourlyRate * lessonDuration;
      const endTime = calculateEndTime(selectedTimeSlot, lessonDuration);
      
      const weekdayLabels = selectedWeekdays
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map(day => weekdayOptions.find(opt => opt.value === day)?.label)
        .join(", ");

      alert(`Đã đặt lịch học với ${tutorName}\nTháng: ${selectedMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}\nCác ngày: ${weekdayLabels}\nCa học: ${selectedTimeSlot} - ${endTime}\nSố buổi: ${sessionsCount} buổi\nTổng học phí: ${totalFee.toLocaleString('vi-VN')}đ\n\n⚠️ Vui lòng thanh toán trước để bắt đầu học`);
    }
    
    onOpenChange(false);
  };

  // Calculate monthly summary
  const sessionsCount = isTrial ? 0 : calculateSessionsInMonth(selectedMonth, selectedWeekdays);
  const totalMonthlyFee = sessionsCount * hourlyRate * lessonDuration;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isTrial ? "Đặt lịch học thử miễn phí" : "Đặt lịch học theo tháng"}
          </DialogTitle>
          <DialogDescription>
            {isTrial 
              ? `Buổi học thử 30 phút hoàn toàn miễn phí với ${tutorName}`
              : `Đăng ký học theo tháng với ${tutorName} - ${hourlyRate.toLocaleString('vi-VN')}đ/giờ`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isTrial ? (
            // Trial lesson booking (single session)
            <>
              {/* Calendar for single date */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Chọn ngày học
                </Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today || date.getDay() === 0;
                    }}
                    className="rounded-md border"
                    data-testid="calendar-booking"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Chọn ca học
                </Label>
                <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {timeSlotRanges.map((slot) => (
                      <div key={slot.start} className="flex items-center">
                        <RadioGroupItem 
                          value={slot.start} 
                          id={`time-${slot.start}`}
                          className="peer sr-only"
                          data-testid={`radio-time-${slot.start}`}
                        />
                        <Label
                          htmlFor={`time-${slot.start}`}
                          className="flex-1 cursor-pointer rounded-lg border-2 border-muted bg-background p-3 text-center text-sm font-medium hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          {slot.display}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Trial Summary */}
              {selectedDate && selectedTime && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-semibold mb-2">Thông tin đặt lịch:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Gia sư:</strong> {tutorName}</p>
                    <p><strong>Ngày:</strong> {selectedDate.toLocaleDateString('vi-VN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                    <p><strong>Ca học:</strong> {selectedTime} - {calculateEndTime(selectedTime, 0.5)}</p>
                    <p><strong>Thời lượng:</strong> 30 phút</p>
                    <p><strong>Học phí:</strong> Miễn phí</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Monthly booking
            <>
              {/* Month Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Chọn tháng học
                </Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={(date) => date && setSelectedMonth(date)}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                    className="rounded-md border"
                    data-testid="calendar-month-booking"
                  />
                </div>
              </div>

              {/* Weekday Selection */}
              <div>
                <Label className="text-base font-semibold mb-3">
                  Chọn các ngày trong tuần
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {weekdayOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`weekday-${option.value}`}
                        checked={selectedWeekdays.includes(option.value)}
                        onCheckedChange={() => handleWeekdayToggle(option.value)}
                        data-testid={`checkbox-weekday-${option.value}`}
                      />
                      <Label
                        htmlFor={`weekday-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time Slot Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Chọn ca học
                </Label>
                <RadioGroup value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {timeSlotRanges.map((slot) => (
                      <div key={slot.start} className="flex items-center">
                        <RadioGroupItem 
                          value={slot.start} 
                          id={`monthly-time-${slot.start}`}
                          className="peer sr-only"
                          data-testid={`radio-monthly-time-${slot.start}`}
                        />
                        <Label
                          htmlFor={`monthly-time-${slot.start}`}
                          className="flex-1 cursor-pointer rounded-lg border-2 border-muted bg-background p-3 text-center text-sm font-medium hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        >
                          {slot.display}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              {/* Monthly Summary */}
              {selectedWeekdays.length > 0 && selectedTimeSlot && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-semibold mb-2">Thông tin đặt lịch theo tháng:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Gia sư:</strong> {tutorName}</p>
                    <p><strong>Tháng:</strong> {selectedMonth.toLocaleDateString('vi-VN', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}</p>
                    <p><strong>Các ngày:</strong> {
                      selectedWeekdays
                        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                        .map(day => weekdayOptions.find(opt => opt.value === day)?.label)
                        .join(", ")
                    }</p>
                    <p><strong>Ca học:</strong> {selectedTimeSlot} - {calculateEndTime(selectedTimeSlot, lessonDuration)}</p>
                    <p><strong>Số buổi trong tháng:</strong> {sessionsCount} buổi</p>
                    <p><strong>Thời lượng mỗi buổi:</strong> {
                      lessonDuration >= 1 
                        ? `${lessonDuration} giờ` 
                        : `${lessonDuration * 60} phút`
                    }</p>
                    <p className="text-base font-semibold text-primary pt-2">
                      <strong>Tổng học phí:</strong> {totalMonthlyFee.toLocaleString('vi-VN')}đ
                    </p>
                    <p className="text-xs text-muted-foreground pt-1">
                      ⚠️ Cần thanh toán trước để bắt đầu học
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-booking"
          >
            Hủy
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleBooking}
            disabled={
              isTrial 
                ? !selectedDate || !selectedTime
                : selectedWeekdays.length === 0 || !selectedTimeSlot
            }
            data-testid="button-confirm-booking"
          >
            {isTrial ? "Xác nhận đặt lịch" : "Thanh toán & Đặt lịch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
