"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Clock, DollarSign, Calendar, Info } from "lucide-react";

// Teaching Session Data (Simplified for 1-on-1)
export interface TeachingSessionData {
  id: string;
  recurringDays: number[]; // [1,3,5] = Mon/Wed/Fri
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  durationHours: number; // 2.0
  pricePerSession: number;
  title?: string;
  description?: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD"
}

interface TeachingSessionManagerSimpleProps {
  defaultHourlyRate: number;
  onChange: (sessions: TeachingSessionData[]) => void;
  value: TeachingSessionData[];
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_FULL_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function TeachingSessionManagerSimple({
  defaultHourlyRate,
  onChange,
  value = [],
}: TeachingSessionManagerSimpleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Calculate duration
  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const duration = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
    return Math.max(0, duration);
  };

  const duration = calculateDuration(startTime, endTime);
  const suggestedPrice = Math.round(defaultHourlyRate * duration);

  // Reset form
  const resetForm = () => {
    setSelectedDays([]);
    setStartTime("14:00");
    setEndTime("16:00");
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setIsAdding(false);
    setEditingId(null);
  };

  // Add new session
  const handleAdd = () => {
    if (selectedDays.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ngày trong tuần");
      return;
    }
    if (!startTime || !endTime) {
      alert("Vui lòng nhập giờ bắt đầu và kết thúc");
      return;
    }
    if (duration < 0.5) {
      alert("Thời gian dạy phải ít nhất 30 phút");
      return;
    }
    if (!startDate) {
      alert("Vui lòng chọn ngày bắt đầu");
      return;
    }

    const newSession: TeachingSessionData = {
      id: Date.now().toString(),
      recurringDays: selectedDays.sort((a, b) => a - b),
      startTime,
      endTime,
      durationHours: duration,
      pricePerSession: suggestedPrice,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      startDate,
      endDate: endDate.trim() || undefined,
    };

    onChange([...value, newSession]);
    resetForm();
  };

  // Update session
  const handleUpdate = () => {
    if (!editingId) return;

    if (selectedDays.length === 0) {
      alert("Vui lòng chọn ít nhất 1 ngày trong tuần");
      return;
    }
    if (!startTime || !endTime) {
      alert("Vui lòng nhập giờ bắt đầu và kết thúc");
      return;
    }
    if (duration < 0.5) {
      alert("Thời gian dạy phải ít nhất 30 phút");
      return;
    }
    if (!startDate) {
      alert("Vui lòng chọn ngày bắt đầu");
      return;
    }

    const updatedSessions = value.map(session =>
      session.id === editingId
        ? {
            ...session,
            recurringDays: selectedDays.sort((a, b) => a - b),
            startTime,
            endTime,
            durationHours: duration,
            pricePerSession: suggestedPrice,
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            startDate,
            endDate: endDate.trim() || undefined,
          }
        : session
    );

    onChange(updatedSessions);
    resetForm();
  };

  // Delete session
  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc muốn xóa ca dạy này?")) {
      onChange(value.filter(s => s.id !== id));
    }
  };

  // Edit session
  const handleEdit = (session: TeachingSessionData) => {
    setSelectedDays(session.recurringDays);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setTitle(session.title || "");
    setDescription(session.description || "");
    setStartDate(session.startDate);
    setEndDate(session.endDate || "");
    setEditingId(session.id);
    setIsAdding(true);
  };

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Get day names from array
  const getDayNames = (days: number[]): string => {
    return days.map(d => DAY_NAMES[d]).join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Tạo các ca dạy định kỳ (ví dụ: T2/T4/T6 hoặc T3/T5/T7). Mỗi ca mặc định 2 tiếng. 
          Học sinh sẽ chọn môn học và lớp khi đăng ký.
        </AlertDescription>
      </Alert>

      {/* Session List */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Ca dạy đã tạo ({value.length})</h3>
          {value.map(session => (
            <Card key={session.id} className="relative">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      {session.title && (
                        <div className="font-medium">{session.title}</div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="font-medium">{getDayNames(session.recurringDays)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3" />
                        <span>
                          {session.startTime} - {session.endTime} ({session.durationHours.toFixed(1)} giờ)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <DollarSign className="h-3 w-3" />
                        <span>{session.pricePerSession.toLocaleString('vi-VN')}đ/ca</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        📆 Từ {session.startDate}
                        {session.endDate && ` đến ${session.endDate}`}
                      </div>
                      {session.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {session.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(session)}
                      >
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(session.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {value.length === 0 && !isAdding && (
        <Alert>
          <AlertDescription>
            Chưa có ca dạy nào. Nhấn "Thêm ca dạy" để bắt đầu.
          </AlertDescription>
        </Alert>
      )}

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Sửa ca dạy" : "Thêm ca dạy mới"}
            </CardTitle>
            <CardDescription>
              Chọn các ngày lặp lại và thời gian dạy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recurring Days */}
            <div className="space-y-2">
              <Label>Ngày trong tuần (lặp lại hàng tuần) *</Label>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <div key={day} className="flex items-center space-y-0">
                    <Checkbox
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      id={`day-${day}`}
                    />
                    <Label
                      htmlFor={`day-${day}`}
                      className="ml-2 text-sm font-normal cursor-pointer"
                    >
                      {DAY_NAMES[day]}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ví dụ: Chọn T2, T4, T6 để dạy 3 buổi/tuần
              </p>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Giờ bắt đầu *</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Giờ kết thúc *</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration & Price */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div>⏱️ Thời lượng: <strong>{duration.toFixed(1)} giờ</strong></div>
                  <div>💰 Giá đề xuất: <strong>{suggestedPrice.toLocaleString('vi-VN')}đ</strong> (dựa trên học phí {defaultHourlyRate.toLocaleString('vi-VN')}đ/giờ)</div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Ngày bắt đầu *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Ngày kết thúc (tùy chọn)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề (tùy chọn)</Label>
              <Input
                id="title"
                placeholder="VD: Luyện thi đại học, Học cơ bản..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả (tùy chọn)</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết về ca dạy..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={editingId ? handleUpdate : handleAdd}
                className="flex-1"
              >
                {editingId ? "Cập nhật" : "Thêm"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {!isAdding && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm ca dạy
        </Button>
      )}
    </div>
  );
}
