"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, Clock, Users, DollarSign, BookOpen, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface TeachingSessionData {
  id: string; // Temporary ID for form management
  subjectId: number;
  gradeLevelId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationHours: number;
  pricePerSession: number;
  maxStudents: number;
  title?: string;
  description?: string;
  startDate: string;
  endDate?: string;
}

interface TeachingSessionManagerProps {
  subjects: Array<{ id: number; name: string }>;
  gradeLevels: Array<{ id: number; name: string; category: string; subjectId?: number | null }>;
  defaultHourlyRate?: number;
  onChange: (sessions: TeachingSessionData[]) => void;
  value: TeachingSessionData[];
}

const days = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];

export function TeachingSessionManager({
  subjects,
  gradeLevels,
  defaultHourlyRate = 150000,
  onChange,
  value
}: TeachingSessionManagerProps) {
  const [editingSession, setEditingSession] = useState<TeachingSessionData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const getGradeLevelsForSubject = (subjectId: number) => {
    return gradeLevels.filter(gl =>
      gl.subjectId === null || gl.subjectId === subjectId
    );
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.round((endMinutes - startMinutes) / 60 * 10) / 10;
  };

  const handleCreateSession = () => {
    const today = new Date().toISOString().split('T')[0];
    const newSession: TeachingSessionData = {
      id: `temp-${Date.now()}`,
      subjectId: subjects[0]?.id || 0,
      gradeLevelId: 0,
      dayOfWeek: 1,
      startTime: '18:00',
      endTime: '20:00',
      durationHours: 2,
      pricePerSession: defaultHourlyRate * 2,
      maxStudents: 1,
      title: '',
      description: '',
      startDate: today,
      endDate: '',
    };
    setEditingSession(newSession);
    setIsCreating(true);
  };

  const handleSaveSession = () => {
    if (!editingSession) return;

    // Validation
    if (!editingSession.subjectId || !editingSession.gradeLevelId) {
      alert('Vui lòng chọn môn học và lớp');
      return;
    }
    if (!editingSession.startTime || !editingSession.endTime) {
      alert('Vui lòng nhập thời gian');
      return;
    }
    if (!editingSession.startDate) {
      alert('Vui lòng chọn ngày bắt đầu');
      return;
    }

    const duration = calculateDuration(editingSession.startTime, editingSession.endTime);
    if (duration <= 0) {
      alert('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    const sessionToSave = {
      ...editingSession,
      durationHours: duration,
    };

    if (isCreating) {
      onChange([...value, sessionToSave]);
    } else {
      onChange(value.map(s => s.id === editingSession.id ? sessionToSave : s));
    }

    setEditingSession(null);
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setIsCreating(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('Bạn có chắc muốn xóa ca dạy này?')) {
      onChange(value.filter(s => s.id !== sessionId));
    }
  };

  const handleEditSession = (session: TeachingSessionData) => {
    setEditingSession({ ...session });
    setIsCreating(false);
  };

  const getSubjectName = (subjectId: number) => {
    return subjects.find(s => s.id === subjectId)?.name || '';
  };

  const getGradeLevelName = (gradeLevelId: number) => {
    return gradeLevels.find(g => g.id === gradeLevelId)?.name || '';
  };

  const getDayName = (dayOfWeek: number) => {
    return days.find(d => d.value === dayOfWeek)?.label || '';
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Ca dạy là gì?</strong> Ca dạy là lịch học cố định hàng tuần mà học sinh có thể đăng ký. 
          Ví dụ: "Toán lớp 10 - Thứ 3, 18h-20h" là một ca dạy. Học sinh sẽ xem và đăng ký các ca này.
        </AlertDescription>
      </Alert>

      {/* Existing Sessions List */}
      {value.length > 0 && !editingSession && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ca dạy đã tạo ({value.length})
          </h3>
          
          <div className="grid gap-3">
            {value.map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Title or Subject */}
                      <div>
                        <h4 className="font-semibold text-lg">
                          {session.title || `${getSubjectName(session.subjectId)} - ${getGradeLevelName(session.gradeLevelId)}`}
                        </h4>
                        {session.description && (
                          <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{getDayName(session.dayOfWeek)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{session.startTime} - {session.endTime} ({session.durationHours}h)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Tối đa {session.maxStudents} học sinh</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-primary">
                            {session.pricePerSession.toLocaleString('vi-VN')}đ/buổi
                          </span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="text-xs text-muted-foreground">
                        Từ {new Date(session.startDate).toLocaleDateString('vi-VN')}
                        {session.endDate && ` đến ${new Date(session.endDate).toLocaleDateString('vi-VN')}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSession(session)}
                      >
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {editingSession && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>{isCreating ? 'Tạo ca dạy mới' : 'Sửa ca dạy'}</CardTitle>
            <CardDescription>
              Điền thông tin cho ca dạy. Học sinh sẽ xem và đăng ký theo lịch này.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject & Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  Môn học *
                </Label>
                <Select
                  value={editingSession.subjectId.toString()}
                  onValueChange={(value) => {
                    setEditingSession({
                      ...editingSession,
                      subjectId: parseInt(value),
                      gradeLevelId: 0, // Reset grade when subject changes
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn môn" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" />
                  Lớp *
                </Label>
                <Select
                  value={editingSession.gradeLevelId.toString()}
                  onValueChange={(value) => {
                    setEditingSession({
                      ...editingSession,
                      gradeLevelId: parseInt(value),
                    });
                  }}
                  disabled={!editingSession.subjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn lớp" />
                  </SelectTrigger>
                  <SelectContent>
                    {getGradeLevelsForSubject(editingSession.subjectId).map(grade => (
                      <SelectItem key={grade.id} value={grade.id.toString()}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Day & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Thứ *
                </Label>
                <Select
                  value={editingSession.dayOfWeek.toString()}
                  onValueChange={(value) => {
                    setEditingSession({
                      ...editingSession,
                      dayOfWeek: parseInt(value),
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Giờ bắt đầu *</Label>
                <Input
                  type="time"
                  value={editingSession.startTime}
                  onChange={(e) => {
                    const duration = calculateDuration(e.target.value, editingSession.endTime);
                    setEditingSession({
                      ...editingSession,
                      startTime: e.target.value,
                      durationHours: duration,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Giờ kết thúc *</Label>
                <Input
                  type="time"
                  value={editingSession.endTime}
                  onChange={(e) => {
                    const duration = calculateDuration(editingSession.startTime, e.target.value);
                    setEditingSession({
                      ...editingSession,
                      endTime: e.target.value,
                      durationHours: duration,
                    });
                  }}
                />
              </div>
            </div>

            {/* Duration Display */}
            {editingSession.startTime && editingSession.endTime && (
              <div className="text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                Thời lượng: <strong>{editingSession.durationHours} giờ</strong>
              </div>
            )}

            {/* Price & Max Students */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" />
                  Học phí/buổi (VNĐ) *
                </Label>
                <Input
                  type="number"
                  value={editingSession.pricePerSession}
                  onChange={(e) => {
                    setEditingSession({
                      ...editingSession,
                      pricePerSession: parseInt(e.target.value) || 0,
                    });
                  }}
                  placeholder="300,000"
                  min="0"
                  step="10000"
                />
                <p className="text-xs text-muted-foreground">
                  Gợi ý: {(defaultHourlyRate * editingSession.durationHours).toLocaleString('vi-VN')}đ 
                  ({defaultHourlyRate.toLocaleString('vi-VN')}đ/giờ × {editingSession.durationHours}h)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  Số học sinh tối đa
                </Label>
                <Input
                  type="number"
                  value={editingSession.maxStudents}
                  onChange={(e) => {
                    setEditingSession({
                      ...editingSession,
                      maxStudents: parseInt(e.target.value) || 1,
                    });
                  }}
                  min="1"
                  max="10"
                />
                <p className="text-xs text-muted-foreground">
                  1 = dạy kèm, nhiều hơn = dạy nhóm
                </p>
              </div>
            </div>

            {/* Start & End Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ngày bắt đầu *</Label>
                <Input
                  type="date"
                  value={editingSession.startDate}
                  onChange={(e) => {
                    setEditingSession({
                      ...editingSession,
                      startDate: e.target.value,
                    });
                  }}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label>Ngày kết thúc (tùy chọn)</Label>
                <Input
                  type="date"
                  value={editingSession.endDate || ''}
                  onChange={(e) => {
                    setEditingSession({
                      ...editingSession,
                      endDate: e.target.value,
                    });
                  }}
                  min={editingSession.startDate}
                />
                <p className="text-xs text-muted-foreground">
                  Để trống nếu ca dạy không giới hạn thời gian
                </p>
              </div>
            </div>

            {/* Optional: Title */}
            <div className="space-y-2">
              <Label>Tên ca dạy (tùy chọn)</Label>
              <Input
                value={editingSession.title || ''}
                onChange={(e) => {
                  setEditingSession({
                    ...editingSession,
                    title: e.target.value,
                  });
                }}
                placeholder={`VD: ${getSubjectName(editingSession.subjectId)} nâng cao`}
                maxLength={255}
              />
            </div>

            {/* Optional: Description */}
            <div className="space-y-2">
              <Label>Mô tả (tùy chọn)</Label>
              <Textarea
                value={editingSession.description || ''}
                onChange={(e) => {
                  setEditingSession({
                    ...editingSession,
                    description: e.target.value,
                  });
                }}
                placeholder="Mô tả ngắn gọn về ca dạy này..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleSaveSession}
                className="flex-1"
              >
                {isCreating ? 'Thêm ca dạy' : 'Lưu thay đổi'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Button */}
      {!editingSession && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleCreateSession}
          disabled={subjects.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tạo ca dạy mới
        </Button>
      )}

      {/* Empty State */}
      {value.length === 0 && !editingSession && (
        <Alert>
          <AlertDescription>
            Bạn chưa tạo ca dạy nào. Click "Tạo ca dạy mới" để bắt đầu.
            <br />
            <strong>Lưu ý:</strong> Bạn cần tạo ít nhất 1 ca dạy để học sinh có thể đăng ký.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
