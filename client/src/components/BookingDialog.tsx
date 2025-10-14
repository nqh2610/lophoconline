import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";

interface AvailableSlot {
  id: string;
  dayLabels: string;
  startTime: string;
  endTime: string;
  price: number;
  sessionsPerWeek: number;
}

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorName: string;
  hourlyRate: number;
  lessonDuration: number;
  isTrial?: boolean;
  availableSlots?: AvailableSlot[];
}

export function BookingDialog({ 
  open, 
  onOpenChange, 
  tutorName, 
  hourlyRate,
  lessonDuration,
  isTrial = false,
  availableSlots = []
}: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime("");
      setSelectedSlot("");
      setStartDate("");
    }
  }, [open]);

  const calculateEndTime = (startTime: string, durationInHours: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationInHours * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", 
    "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00"
  ];

  const effectiveDuration = isTrial ? 0.5 : lessonDuration;
  const timeSlotRanges = timeSlots.map(startTime => ({
    start: startTime,
    end: calculateEndTime(startTime, effectiveDuration),
    display: `${startTime} - ${calculateEndTime(startTime, effectiveDuration)}`
  }));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const slot = availableSlots.find((s) => s.id === selectedSlot);

  const calculateMonthlyPrice = () => {
    if (!slot) return 0;
    return slot.sessionsPerWeek * 4 * slot.price;
  };

  const handleBooking = () => {
    if (isTrial) {
      if (!selectedDate || !selectedTime) {
        alert("Vui lòng chọn ngày và giờ học");
        return;
      }
      
      const endTime = calculateEndTime(selectedTime, 0.5);
      
      alert(`Đã đặt lịch học thử với ${tutorName}\nNgày: ${selectedDate.toLocaleDateString('vi-VN')}\nCa học: ${selectedTime} - ${endTime}\nThời lượng: 30 phút\nHọc phí: Miễn phí`);
    } else {
      if (!selectedSlot || !startDate) {
        alert("Vui lòng chọn ca học và ngày bắt đầu");
        return;
      }

      const monthlyPrice = calculateMonthlyPrice();
      
      alert(`Đã đặt lịch học với ${tutorName}\nLịch học: ${slot?.dayLabels}\nCa học: ${slot?.startTime} - ${slot?.endTime}\nNgày bắt đầu: ${new Date(startDate).toLocaleDateString('vi-VN')}\nHọc phí/tháng: ${formatPrice(monthlyPrice)}\n\n⚠️ Vui lòng thanh toán để bắt đầu học`);
    }
    
    onOpenChange(false);
  };

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
              : `Chọn ca học và ngày bắt đầu với ${tutorName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isTrial ? (
            <>
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
            <>
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Chọn ca học
                </Label>
                <div className="space-y-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all hover-elevate ${
                        selectedSlot === slot.id
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                      data-testid={`slot-option-${slot.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{slot.dayLabels}</Badge>
                            <Badge variant="secondary">
                              {slot.sessionsPerWeek} buổi/tuần
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatPrice(slot.price)}
                          </p>
                          <p className="text-sm text-muted-foreground">/buổi</p>
                        </div>
                        {selectedSlot === slot.id && (
                          <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Ngày bắt đầu học
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="max-w-xs"
                  data-testid="input-start-date"
                />
                {startDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Buổi học đầu tiên:{" "}
                    {new Date(startDate).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>

              {selectedSlot && startDate && slot && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-semibold mb-2">Tóm tắt đặt lịch:</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Gia sư:</strong> {tutorName}</p>
                    <p><strong>Lịch học:</strong> {slot.dayLabels}</p>
                    <p><strong>Ca học:</strong> {slot.startTime} - {slot.endTime}</p>
                    <p><strong>Ngày bắt đầu:</strong> {new Date(startDate).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Số buổi/tuần:</strong> {slot.sessionsPerWeek} buổi</p>
                    <p><strong>Học phí/buổi:</strong> {formatPrice(slot.price)}</p>
                    <p className="text-base font-semibold text-primary pt-2">
                      <strong>Học phí/tháng:</strong> {formatPrice(calculateMonthlyPrice())}
                    </p>
                    <p className="text-xs text-muted-foreground pt-1">
                      = {slot.sessionsPerWeek} buổi × 4 tuần × {formatPrice(slot.price)}
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
                : !selectedSlot || !startDate
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
