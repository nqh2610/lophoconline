"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecurringSchedule {
  id: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  pricePerSession: number;
}

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DAY_FULL_NAMES = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

const PRESETS = [
  { id: "246", label: "Thứ 2, 4, 6", days: [1, 3, 5] },
  { id: "357", label: "Thứ 3, 5, 7", days: [2, 4, 6] },
  { id: "weekend", label: "Cuối tuần (T7, CN)", days: [0, 6] },
  { id: "weekday", label: "Cả tuần (T2-T6)", days: [1, 2, 3, 4, 5] },
  { id: "everyday", label: "Mỗi ngày", days: [0, 1, 2, 3, 4, 5, 6] },
];

export default function RecurringScheduleSetup() {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [price, setPrice] = useState("300000");
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([
    // Mock data để demo
    {
      id: "1",
      daysOfWeek: [1, 3, 5],
      startTime: "18:00",
      endTime: "19:30",
      pricePerSession: 300000,
    },
  ]);

  const handlePresetClick = (days: number[]) => {
    setSelectedDays(days);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleAddSchedule = () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một ngày trong tuần",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Lỗi",
        description: "Giờ kết thúc phải sau giờ bắt đầu",
        variant: "destructive",
      });
      return;
    }

    const newSchedule: RecurringSchedule = {
      id: Date.now().toString(),
      daysOfWeek: selectedDays,
      startTime,
      endTime,
      pricePerSession: parseInt(price),
    };

    setSchedules([...schedules, newSchedule]);
    
    // Reset form
    setSelectedDays([]);
    setStartTime("18:00");
    setEndTime("19:30");
    setPrice("300000");

    toast({
      title: "Thành công!",
      description: `Đã thêm lịch dạy ${selectedDays.length} buổi/tuần`,
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
    toast({
      title: "Đã xóa",
      description: "Lịch dạy đã được xóa",
    });
  };

  const getDayLabels = (days: number[]) => {
    return days.map((d) => DAY_NAMES[d]).join(", ");
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Thiết Lập Lịch Dạy Lặp Lại</h1>
        <p className="text-muted-foreground">
          Tạo lịch dạy hàng tuần cho học viên dễ dàng đăng ký
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form tạo lịch */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tạo Lịch Mới
            </CardTitle>
            <CardDescription>Chọn ngày và giờ dạy trong tuần</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset buttons */}
            <div>
              <Label className="mb-3 block">Chọn nhanh</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset.days)}
                    className={
                      JSON.stringify(selectedDays) === JSON.stringify(preset.days)
                        ? "border-primary bg-primary/10"
                        : ""
                    }
                    data-testid={`preset-${preset.id}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom day selection */}
            <div>
              <Label className="mb-3 block">Hoặc chọn tùy chỉnh</Label>
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map((day, index) => (
                  <Button
                    key={index}
                    variant={selectedDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(index)}
                    className="min-w-[3rem]"
                    data-testid={`day-${index}`}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time" className="mb-2 block">
                  Giờ bắt đầu
                </Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  data-testid="input-start-time"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="mb-2 block">
                  Giờ kết thúc
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="price" className="mb-2 block">
                Giá mỗi buổi (VNĐ)
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="300000"
                data-testid="input-price"
              />
            </div>

            {/* Preview */}
            {selectedDays.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Lịch đã chọn:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getDayLabels(selectedDays)} • {startTime} - {endTime} •{" "}
                      {parseInt(price).toLocaleString("vi-VN")}đ/buổi
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">{selectedDays.length} buổi/tuần</span> ={" "}
                      {(selectedDays.length * 4 * parseInt(price)).toLocaleString("vi-VN")}đ/tháng
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleAddSchedule}
              className="w-full"
              data-testid="button-add-schedule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm Lịch Dạy
            </Button>
          </CardContent>
        </Card>

        {/* Danh sách lịch đã tạo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Lịch Dạy Của Bạn
            </CardTitle>
            <CardDescription>
              {schedules.length} lịch dạy đang hoạt động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedules.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Chưa có lịch dạy nào. Tạo lịch mới bên trái.
              </p>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="p-4 border rounded-lg hover-elevate"
                  data-testid={`schedule-${schedule.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          {schedule.daysOfWeek.length} buổi/tuần
                        </Badge>
                        <span className="text-sm font-medium">
                          {schedule.pricePerSession.toLocaleString("vi-VN")}đ/buổi
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDayLabels(schedule.daysOfWeek)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                      <p className="text-sm font-medium mt-2">
                        ~{(schedule.daysOfWeek.length * 4 * schedule.pricePerSession).toLocaleString("vi-VN")}đ/tháng
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      data-testid={`delete-schedule-${schedule.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly calendar preview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lịch Tuần</CardTitle>
          <CardDescription>Xem trước lịch dạy của bạn trong tuần</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {DAY_FULL_NAMES.map((day, index) => {
              const daySchedules = schedules.filter((s) => s.daysOfWeek.includes(index));
              return (
                <div key={index} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">{day}</h4>
                  {daySchedules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Trống</p>
                  ) : (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="bg-primary/10 rounded p-2 text-xs"
                        >
                          <p className="font-medium">
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                          <p className="text-muted-foreground">
                            {(schedule.pricePerSession / 1000).toFixed(0)}k
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
