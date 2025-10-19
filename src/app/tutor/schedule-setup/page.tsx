"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const daysOfWeek = [
  { id: 'mon', label: 'Thứ 2' },
  { id: 'tue', label: 'Thứ 3' },
  { id: 'wed', label: 'Thứ 4' },
  { id: 'thu', label: 'Thứ 5' },
  { id: 'fri', label: 'Thứ 6' },
  { id: 'sat', label: 'Thứ 7' },
  { id: 'sun', label: 'Chủ nhật' },
];

const timeSlots = [
  { id: 'morning', label: 'Sáng', time: '6:00 - 12:00' },
  { id: 'afternoon', label: 'Chiều', time: '12:00 - 18:00' },
  { id: 'evening', label: 'Tối', time: '18:00 - 22:00' },
];

export default function TutorScheduleSetup() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSlot = (day: string, slot: string) => {
    const key = `${day}-${slot}`;
    const newSlots = new Set(selectedSlots);
    if (newSlots.has(key)) {
      newSlots.delete(key);
    } else {
      newSlots.add(key);
    }
    setSelectedSlots(newSlots);
  };

  const handleSubmit = async () => {
    if (selectedSlots.size === 0) {
      toast({
        title: "Chưa chọn lịch",
        description: "Vui lòng chọn ít nhất một khung giờ rảnh",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // TODO: Save schedule to backend
    console.log("Selected schedule:", Array.from(selectedSlots));

    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "Lịch đã được lưu!",
      description: "Bây giờ bạn có thể nhận yêu cầu từ học sinh.",
    });

    setIsSubmitting(false);
    router.push('/tutor/trial-requests');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tutor/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold" data-testid="heading-schedule-setup">
            Thiết lập lịch dạy
          </h1>
          <p className="text-muted-foreground mt-2">
            Chọn khung giờ bạn có thể dạy. Bạn có thể thay đổi sau.
          </p>
        </div>

        {/* Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tóm tắt lịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold">{selectedSlots.size}</p>
                <p className="text-sm text-muted-foreground">Khung giờ đã chọn</p>
              </div>
              {selectedSlots.size > 0 && (
                <Badge variant="outline" data-testid="badge-slots-selected">
                  {selectedSlots.size} / {daysOfWeek.length * timeSlots.length} khung giờ
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Chọn lịch rảnh</CardTitle>
            <CardDescription>
              Nhấn vào các ô để chọn khung giờ bạn có thể dạy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-left border-b">Ngày</th>
                    {timeSlots.map(slot => (
                      <th key={slot.id} className="p-3 text-center border-b">
                        <div>
                          <p className="font-semibold">{slot.label}</p>
                          <p className="text-xs text-muted-foreground">{slot.time}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map(day => (
                    <tr key={day.id}>
                      <td className="p-3 font-medium border-b">{day.label}</td>
                      {timeSlots.map(slot => {
                        const key = `${day.id}-${slot.id}`;
                        const isSelected = selectedSlots.has(key);
                        return (
                          <td key={key} className="p-2 border-b text-center">
                            <button
                              type="button"
                              onClick={() => toggleSlot(day.id, slot.id)}
                              className={`w-full h-16 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 hover:bg-primary/20'
                                  : 'border-border hover:border-primary/50 hover:bg-accent'
                              }`}
                              data-testid={`slot-${day.id}-${slot.id}`}
                            >
                              {isSelected && (
                                <Clock className="h-5 w-5 mx-auto text-primary" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSubmit}
            disabled={selectedSlots.size === 0 || isSubmitting}
            className="flex-1"
            data-testid="button-save-schedule"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu lịch và tiếp tục'}
          </Button>
        </div>
      </div>
    </div>
  );
}
