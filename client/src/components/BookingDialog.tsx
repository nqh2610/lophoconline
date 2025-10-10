import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, Calendar as CalendarIcon } from "lucide-react";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorName: string;
  hourlyRate: number;
  isTrial?: boolean;
}

export function BookingDialog({ 
  open, 
  onOpenChange, 
  tutorName, 
  hourlyRate,
  isTrial = false 
}: BookingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDate(undefined);
      setSelectedTime("");
    }
  }, [open]);

  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", 
    "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00"
  ];

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) {
      alert("Vui lòng chọn ngày và giờ học");
      return;
    }
    
    // TODO: Implement actual booking logic
    alert(`Đã đặt lịch ${isTrial ? 'học thử' : 'học'} với ${tutorName}\nNgày: ${selectedDate.toLocaleDateString('vi-VN')}\nGiờ: ${selectedTime}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isTrial ? "Đặt lịch học thử miễn phí" : "Đặt lịch học"}
          </DialogTitle>
          <DialogDescription>
            {isTrial 
              ? `Buổi học thử 30 phút hoàn toàn miễn phí với ${tutorName}`
              : `Đặt lịch học với ${tutorName} - ${hourlyRate.toLocaleString('vi-VN')}đ/giờ`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Calendar */}
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
              Chọn giờ học
            </Label>
            <RadioGroup value={selectedTime} onValueChange={setSelectedTime}>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {timeSlots.map((time) => (
                  <div key={time} className="flex items-center">
                    <RadioGroupItem 
                      value={time} 
                      id={`time-${time}`}
                      className="peer sr-only"
                      data-testid={`radio-time-${time}`}
                    />
                    <Label
                      htmlFor={`time-${time}`}
                      className="flex-1 cursor-pointer rounded-lg border-2 border-muted bg-background p-3 text-center font-medium hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      {time}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Summary */}
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
                <p><strong>Giờ:</strong> {selectedTime}</p>
                <p><strong>Thời lượng:</strong> {isTrial ? "30 phút" : "60 phút"}</p>
                <p><strong>Học phí:</strong> {isTrial ? "Miễn phí" : `${hourlyRate.toLocaleString('vi-VN')}đ`}</p>
              </div>
            </div>
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
            disabled={!selectedDate || !selectedTime}
            data-testid="button-confirm-booking"
          >
            Xác nhận đặt lịch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
