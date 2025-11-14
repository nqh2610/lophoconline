"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Clock, Info } from "lucide-react";

// Ultra-simple Teaching Session: Only Days + Times
export interface TeachingSessionData {
  id: string;
  recurringDays: number[]; // [1,3,5] = Mon/Wed/Fri
  startTime: string; // "14:00"
  endTime: string; // "16:00"
}

interface TeachingSessionManagerUltraSimpleProps {
  onChange: (sessions: TeachingSessionData[]) => void;
  value: TeachingSessionData[];
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function TeachingSessionManagerUltraSimple({
  onChange,
  value = [],
}: TeachingSessionManagerUltraSimpleProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state - only 3 fields!
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");

  // Reset form
  const resetForm = () => {
    setSelectedDays([]);
    setStartTime("14:00");
    setEndTime("16:00");
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

    const newSession: TeachingSessionData = {
      id: Date.now().toString(),
      recurringDays: selectedDays.sort((a, b) => a - b),
      startTime,
      endTime,
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

    const updatedSessions = value.map(session =>
      session.id === editingId
        ? {
            ...session,
            recurringDays: selectedDays.sort((a, b) => a - b),
            startTime,
            endTime,
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
          Chỉ cần chọn <strong>ngày</strong> và <strong>giờ</strong> bạn có thể dạy. 
          Học sinh sẽ chọn môn học, lớp, và học phí khi đăng ký.
        </AlertDescription>
      </Alert>

      {/* Session List */}
      {value.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Ca dạy đã tạo ({value.length})</h3>
          {value.map(session => (
            <Card key={session.id} className="relative">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Clock className="h-4 w-4" />
                      <span>{getDayNames(session.recurringDays)}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.startTime} - {session.endTime}
                    </div>
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
              Chọn ngày và giờ bạn có thể dạy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recurring Days */}
            <div className="space-y-2">
              <Label>Ngày trong tuần *</Label>
              <div className="grid grid-cols-7 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <div key={day} className="flex flex-col items-center">
                    <Checkbox
                      checked={selectedDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                      id={`day-${day}`}
                    />
                    <Label
                      htmlFor={`day-${day}`}
                      className="mt-1 text-xs font-normal cursor-pointer"
                    >
                      {DAY_NAMES[day]}
                    </Label>
                  </div>
                ))}
              </div>
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
