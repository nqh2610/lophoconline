import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Trash2, Edit2, Plus, AlertCircle } from 'lucide-react';

// Định nghĩa interface
interface TeachingSessionData {
  id: string;
  recurringDays: number[]; // 1=T2, 2=T3, ..., 6=T7, 0=CN
  startTime: string;
  endTime: string;
  sessionType?: 'morning' | 'afternoon' | 'evening';
}

interface Props {
  sessions: TeachingSessionData[];
  onChange: (sessions: TeachingSessionData[]) => void;
}

// Constants
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // T2->CN

const SESSION_TYPES = [
  { value: 'morning', label: '🌅 Sáng', timeRange: '06:00 - 12:00', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'afternoon', label: '☀️ Chiều', timeRange: '12:00 - 18:00', color: 'bg-orange-100 text-orange-800' },
  { value: 'evening', label: '🌙 Tối', timeRange: '18:00 - 22:00', color: 'bg-blue-100 text-blue-800' },
];

export default function TeachingSessionManager({ sessions, onChange }: Props) {
  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [sessionType, setSessionType] = useState<'morning' | 'afternoon' | 'evening' | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Validation helpers
  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatDuration = (start: string, end: string): string => {
    const minutes = parseTime(end) - parseTime(start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}p` : `${hours}h`;
  };

  // Kiểm tra 2 khoảng thời gian có trùng không
  const isTimeOverlap = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean => {
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);
    return (s1 < e2 && e1 > s2);
  };

  // Validate form
  const validateForm = (): string[] => {
    const errs: string[] = [];

    if (selectedDays.length === 0) {
      errs.push('Vui lòng chọn ít nhất 1 ngày');
    }

    if (!startTime) {
      errs.push('Vui lòng chọn giờ bắt đầu');
    }

    if (!endTime) {
      errs.push('Vui lòng chọn giờ kết thúc');
    }

    if (startTime && endTime) {
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      const duration = end - start;

      if (start >= end) {
        errs.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      } else if (duration < 60) {
        errs.push('Ca dạy phải dài ít nhất 1 tiếng');
      }

      // Kiểm tra trùng lặp
      for (const session of sessions) {
        if (editingId && session.id === editingId) continue;

        // Kiểm tra có ngày trùng không
        const hasCommonDay = session.recurringDays.some(day => selectedDays.includes(day));
        
        if (hasCommonDay && isTimeOverlap(startTime, endTime, session.startTime, session.endTime)) {
          const commonDays = session.recurringDays
            .filter(day => selectedDays.includes(day))
            .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
            .map(day => DAY_NAMES[day])
            .join(', ');

          errs.push(
            `Ca dạy bị trùng thời gian với ca hiện có (${commonDays}: ${session.startTime} - ${session.endTime})`
          );
          break;
        }
      }
    }

    return errs;
  };

  // Handle add/update
  const handleSave = () => {
    const errs = validateForm();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    const newSession: TeachingSessionData = {
      id: editingId || Date.now().toString(),
      recurringDays: [...selectedDays],
      startTime,
      endTime,
      sessionType: sessionType || undefined,
    };

    if (editingId) {
      onChange(sessions.map(s => s.id === editingId ? newSession : s));
    } else {
      onChange([...sessions, newSession]);
    }

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setSelectedDays([]);
    setStartTime('');
    setEndTime('');
    setSessionType('');
    setEditingId(null);
    setErrors([]);
  };

  const handleEdit = (session: TeachingSessionData) => {
    setSelectedDays(session.recurringDays);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setSessionType(session.sessionType || '');
    setEditingId(session.id);
    setErrors([]);
  };

  const handleDelete = (id: string) => {
    onChange(sessions.filter(s => s.id !== id));
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Gợi ý thời gian theo buổi
  const handleSessionTypeChange = (type: 'morning' | 'afternoon' | 'evening') => {
    setSessionType(type);
    
    // Gợi ý thời gian mặc định
    if (!startTime || !endTime) {
      switch (type) {
        case 'morning':
          setStartTime('08:00');
          setEndTime('10:00');
          break;
        case 'afternoon':
          setStartTime('14:00');
          setEndTime('16:00');
          break;
        case 'evening':
          setStartTime('18:00');
          setEndTime('20:00');
          break;
      }
    }
  };

  // Sắp xếp sessions theo thứ và giờ
  const sortedSessions = [...sessions].sort((a, b) => {
    const firstDayA = Math.min(...a.recurringDays.map(d => DAY_ORDER.indexOf(d)));
    const firstDayB = Math.min(...b.recurringDays.map(d => DAY_ORDER.indexOf(d)));
    
    if (firstDayA !== firstDayB) return firstDayA - firstDayB;
    return parseTime(a.startTime) - parseTime(b.startTime);
  });

  // Render days sorted
  const getSortedDays = (days: number[]): number[] => {
    return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Session Type */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Chọn buổi (tùy chọn)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {SESSION_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSessionTypeChange(type.value as any)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${sessionType === type.value 
                      ? `${type.color} border-current font-semibold` 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-sm font-medium">{type.label}</div>
                  <div className="text-xs opacity-70 mt-1">{type.timeRange}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Ngày trong tuần <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {DAY_ORDER.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`
                    px-4 py-2 rounded-lg border-2 font-medium transition-all
                    ${selectedDays.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  {DAY_NAMES[day]}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime" className="font-semibold">
                Giờ bắt đầu <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="font-semibold">
                Giờ kết thúc <span className="text-red-500">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Duration Preview */}
          {startTime && endTime && parseTime(startTime) < parseTime(endTime) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>Thời lượng: <strong>{formatDuration(startTime, endTime)}</strong></span>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={handleSave} className="flex-1">
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Cập nhật
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm ca dạy
                </>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Hủy
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {sortedSessions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Ca dạy đã tạo ({sortedSessions.length})
          </h3>
          <div className="space-y-2">
            {sortedSessions.map(session => {
              const sortedDays = getSortedDays(session.recurringDays);
              const sessionTypeInfo = SESSION_TYPES.find(t => t.value === session.sessionType);
              
              return (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Days */}
                        <div className="flex gap-1.5 mb-2 flex-wrap">
                          {sortedDays.map(day => (
                            <Badge key={day} variant="secondary" className="font-semibold">
                              {DAY_NAMES[day]}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Time */}
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <Clock className="w-5 h-5 text-primary" />
                          <span>{session.startTime} - {session.endTime}</span>
                          <span className="text-sm text-muted-foreground font-normal">
                            ({formatDuration(session.startTime, session.endTime)})
                          </span>
                        </div>

                        {/* Session Type Badge */}
                        {sessionTypeInfo && (
                          <div className="mt-2">
                            <Badge className={sessionTypeInfo.color}>
                              {sessionTypeInfo.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(session)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(session.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {sortedSessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Chưa có ca dạy nào. Hãy thêm ca dạy đầu tiên của bạn!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
