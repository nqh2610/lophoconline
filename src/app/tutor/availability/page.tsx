"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TutorAvailability } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật', short: 'CN' },
  { value: 1, label: 'Thứ 2', short: 'T2' },
  { value: 2, label: 'Thứ 3', short: 'T3' },
  { value: 3, label: 'Thứ 4', short: 'T4' },
  { value: 4, label: 'Thứ 5', short: 'T5' },
  { value: 5, label: 'Thứ 6', short: 'T6' },
  { value: 6, label: 'Thứ 7', short: 'T7' },
];

const PRESETS = [
  { id: "246", label: "Thứ 2, 4, 6", days: [1, 3, 5] },
  { id: "357", label: "Thứ 3, 5, 7", days: [2, 4, 6] },
  { id: "weekend", label: "Cuối tuần", days: [0, 6] },
  { id: "weekday", label: "T2-T6", days: [1, 2, 3, 4, 5] },
];

export default function TutorAvailabilityManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");

  // Get current user (mock - in real app would come from auth context)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const tutorId = currentUser.id || 'tutor-1';

  // Fetch availability
  const { data: availability = [], isLoading } = useQuery<TutorAvailability[]>({
    queryKey: ['/api/tutor-availability', tutorId],
    enabled: !!tutorId,
  });

  // Create availability mutation
  const createMutation = useMutation({
    mutationFn: async (data: { tutorId: string; dayOfWeek: number; startTime: string; endTime: string }) => {
      return await apiRequest('POST', '/api/tutor-availability', data);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm ca dạy. Vui lòng kiểm tra lại thời gian.",
        variant: "destructive",
      });
    },
  });

  // Delete availability mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/tutor-availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutor-availability', tutorId] });
      toast({
        title: "Đã xóa ca dạy!",
        description: "Ca dạy đã được xóa khỏi lịch của bạn.",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa ca dạy.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDays([1]);
    setStartTime("18:00");
    setEndTime("19:30");
  };

  const handlePresetClick = (days: number[]) => {
    setSelectedDays(days);
  };

  const handleDayToggle = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng chọn ít nhất một ngày.",
        variant: "destructive",
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ thời gian.",
        variant: "destructive",
      });
      return;
    }

    // Validate time range
    if (startTime >= endTime) {
      toast({
        title: "Thời gian không hợp lệ",
        description: "Giờ kết thúc phải sau giờ bắt đầu.",
        variant: "destructive",
      });
      return;
    }

    // Create slots for all selected days
    try {
      for (const day of selectedDays) {
        await createMutation.mutateAsync({
          tutorId,
          dayOfWeek: day,
          startTime,
          endTime,
        });
      }
      
      toast({
        title: "Đã thêm ca dạy!",
        description: `Đã thêm ${selectedDays.length} ca dạy vào lịch của bạn.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tutor-availability', tutorId] });
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm ca dạy. Vui lòng kiểm tra lại thời gian.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa ca dạy này?")) {
      deleteMutation.mutate(id);
    }
  };

  // Group availability by day
  const groupedAvailability = availability.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, TutorAvailability[]>);

  // Sort slots by start time
  Object.values(groupedAvailability).forEach(slots => {
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="heading-availability">
                Quản lý lịch rảnh
              </h1>
              <p className="text-muted-foreground mt-2">
                Tạo và quản lý các ca dạy của bạn
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-slot">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm ca dạy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Thêm ca dạy mới</DialogTitle>
                  <DialogDescription>
                    Chọn ngày và khung giờ bạn có thể dạy
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Preset buttons */}
                  <div className="space-y-2">
                    <Label>Chọn nhanh</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESETS.map((preset) => (
                        <Button
                          key={preset.id}
                          variant="outline"
                          size="sm"
                          type="button"
                          onClick={() => handlePresetClick(preset.days)}
                          className={
                            JSON.stringify(selectedDays.sort()) === JSON.stringify(preset.days.sort())
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

                  {/* Day selection */}
                  <div className="space-y-2">
                    <Label>Hoặc chọn từng ngày</Label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          variant={selectedDays.includes(day.value) ? "default" : "outline"}
                          size="sm"
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          data-testid={`day-${day.value}`}
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time">Giờ bắt đầu</Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        data-testid="input-start-time"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end-time">Giờ kết thúc</Label>
                      <Input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        data-testid="input-end-time"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {selectedDays.length > 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        Sẽ tạo {selectedDays.length} ca dạy: {selectedDays.map(d => DAYS_OF_WEEK[d].short).join(", ")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {startTime} - {endTime}
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || selectedDays.length === 0}
                    data-testid="button-submit-slot"
                  >
                    {createMutation.isPending ? "Đang lưu..." : `Thêm ${selectedDays.length} ca dạy`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                <p className="text-2xl font-bold" data-testid="text-total-slots">
                  {availability.length}
                </p>
                <p className="text-sm text-muted-foreground">Ca dạy đã tạo</p>
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-active-days">
                  {Object.keys(groupedAvailability).length}
                </p>
                <p className="text-sm text-muted-foreground">Ngày có lịch dạy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability List */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Đang tải...
            </CardContent>
          </Card>
        ) : availability.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-slots">
                Bạn chưa có ca dạy nào
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-slot">
                <Plus className="h-4 w-4 mr-2" />
                Thêm ca dạy đầu tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => {
              const daySlots = groupedAvailability[day.value] || [];
              if (daySlots.length === 0) return null;

              return (
                <Card key={day.value}>
                  <CardHeader>
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                    <CardDescription>
                      {daySlots.length} ca dạy
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {daySlots.map(slot => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                          data-testid={`slot-${slot.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium" data-testid={`slot-time-${slot.id}`}>
                                {slot.startTime} - {slot.endTime}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round((parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]) - 
                                  parseInt(slot.startTime.split(':')[0]) * 60 - parseInt(slot.startTime.split(':')[1])) / 60 * 10) / 10} giờ
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={slot.isActive ? "default" : "secondary"}>
                              {slot.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(slot.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${slot.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
