import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Trash2, Edit2, Plus, AlertCircle, DollarSign, TrendingUp, X, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';

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
  hourlyRate: number; // VNĐ/giờ từ form
}

// Constants
const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // T2->CN

const SESSION_TYPES = [
  { 
    value: 'morning', 
    label: '🌅 Sáng', 
    timeRange: '06:00 - 12:00', 
    defaultStart: '08:00', 
    defaultEnd: '10:00', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    minHour: 6,
    maxHour: 11
  },
  { 
    value: 'afternoon', 
    label: '☀️ Chiều', 
    timeRange: '12:00 - 18:00', 
    defaultStart: '14:00', 
    defaultEnd: '16:00', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    minHour: 12,
    maxHour: 17
  },
  { 
    value: 'evening', 
    label: '🌙 Tối', 
    timeRange: '18:00 - 22:00', 
    defaultStart: '19:00', 
    defaultEnd: '21:00', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    minHour: 18,
    maxHour: 21
  },
];

// Duration options (in minutes) - extended to 6 hours
const DURATION_OPTIONS = [
  { value: 30, label: '30 phút' },
  { value: 60, label: '1 giờ' },
  { value: 90, label: '1 giờ 30 phút' },
  { value: 120, label: '2 giờ' },
  { value: 150, label: '2 giờ 30 phút' },
  { value: 180, label: '3 giờ' },
  { value: 210, label: '3 giờ 30 phút' },
  { value: 240, label: '4 giờ' },
  { value: 270, label: '4 giờ 30 phút' },
  { value: 300, label: '5 giờ' },
  { value: 330, label: '5 giờ 30 phút' },
  { value: 360, label: '6 giờ' },
];

export default function TeachingSessionManagerV3({ sessions, onChange, hourlyRate }: Props) {
  // Refs
  const formRef = useRef<HTMLDivElement>(null);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  
  // Collapsible state for sessions list - auto-collapse if more than 3 sessions
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(true);
  
  // Filter/Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSessionType, setFilterSessionType] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  
  // Auto-collapse when sessions exceed 3
  useEffect(() => {
    if (sessions.length > 3) {
      setIsSessionsExpanded(false);
    }
  }, [sessions.length]);

  // Form state
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startHour, setStartHour] = useState<string>(''); // Separate hour
  const [startMinute, setStartMinute] = useState<string>('00'); // Separate minute
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState<number>(60); // Default 1 hour
  const [endTime, setEndTime] = useState('');
  const [sessionType, setSessionType] = useState<'morning' | 'afternoon' | 'evening' | ''>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSessionContext, setEditingSessionContext] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Validation helpers
  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const formatTime24h = (time: string): string => {
    const [hour, minute] = time.split(':');
    const h = parseInt(hour);
    const m = minute || '00';
    return `${h}h${m !== '00' ? m : ''}`;
  };

  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const startMinutes = parseTime(start);
    const endMinutes = startMinutes + durationMinutes;
    return formatTime(endMinutes);
  };

  // Auto-calculate startTime from hour + minute
  useEffect(() => {
    if (startHour && startMinute !== '') {
      const minute = parseInt(startMinute) || 0;
      const paddedMinute = String(minute).padStart(2, '0');
      const time = `${startHour.padStart(2, '0')}:${paddedMinute}`;
      setStartTime(time);
    } else {
      setStartTime('');
    }
  }, [startHour, startMinute]);

  // Auto-calculate endTime when startTime or duration changes
  useEffect(() => {
    if (startTime && duration > 0) {
      const calculatedEndTime = calculateEndTime(startTime, duration);
      setEndTime(calculatedEndTime);
    }
  }, [startTime, duration]);

  const formatDuration = (start: string, end: string): string => {
    const minutes = parseTime(end) - parseTime(start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}p` : `${hours}h`;
  };

  const calculateDurationHours = (start: string, end: string): number => {
    const minutes = parseTime(end) - parseTime(start);
    return minutes / 60;
  };

  const calculatePricePerSession = (start: string, end: string): number => {
    const hours = calculateDurationHours(start, end);
    return Math.round(hourlyRate * hours);
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Tính tổng thu nhập dự kiến/tháng
  const calculateMonthlyEstimate = (): number => {
    let totalPerWeek = 0;
    
    sessions.forEach(session => {
      const pricePerSession = calculatePricePerSession(session.startTime, session.endTime);
      const numberOfDays = session.recurringDays.length;
      totalPerWeek += pricePerSession * numberOfDays;
    });

    // Trung bình 4 tuần/tháng
    return totalPerWeek * 4;
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

    if (!sessionType) {
      errs.push('Vui lòng chọn buổi học (Sáng/Chiều/Tối)');
    }

    if (selectedDays.length === 0) {
      errs.push('Vui lòng chọn ít nhất 1 ngày trong tuần');
    }

    if (!startHour) {
      errs.push('Vui lòng chọn giờ bắt đầu');
    }

    if (startMinute === '' || startMinute === null || startMinute === undefined) {
      errs.push('Vui lòng nhập phút bắt đầu (0-59)');
    }

    // Validate minute range
    const minute = parseInt(startMinute);
    if (isNaN(minute) || minute < 0 || minute > 59) {
      errs.push('Phút phải từ 0 đến 59');
    }

    if (!startTime) {
      errs.push('Thời gian bắt đầu không hợp lệ');
    }

    if (!endTime) {
      errs.push('Vui lòng chọn thời lượng');
    }

    // Validate hour and minute are within session type range
    if (startHour && startMinute !== '' && sessionType) {
      const hour = parseInt(startHour);
      const min = parseInt(startMinute) || 0;
      if (!isValidStartTime(hour, min)) {
        const sessionInfo = SESSION_TYPES.find(s => s.value === sessionType);
        errs.push(`Thời gian bắt đầu phải trong khoảng ${sessionInfo?.timeRange}`);
      }
    }

    if (startTime && endTime) {
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      const duration = end - start;

      if (start >= end) {
        errs.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      }

      if (duration < 30) {
        errs.push('Thời lượng tối thiểu là 30 phút');
      }

      if (duration > 360) {
        errs.push('Thời lượng tối đa là 6 giờ');
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
    setStartHour('');
    setStartMinute('00');
    setStartTime('');
    setEndTime('');
    setDuration(60); // Reset to 1 hour
    setSessionType('');
    setEditingId(null);
    setEditingSessionContext(null);
    setIsFormHighlighted(false);
    setErrors([]);
  };

  const handleEdit = (session: TeachingSessionData) => {
    // Build context string for display
    const sortedDays = getSortedDays(session.recurringDays);
    const daysStr = sortedDays.map(d => DAY_NAMES[d]).join(', ');
    const timeStr = `${session.startTime} - ${session.endTime}`;
    const contextStr = `${daysStr} • ${timeStr}`;

    setSelectedDays(session.recurringDays);
    // Parse hour and minute from startTime
    const [hour, minute] = session.startTime.split(':');
    setStartHour(hour);
    setStartMinute(minute);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    // Calculate duration from start and end time
    const durationMinutes = parseTime(session.endTime) - parseTime(session.startTime);
    setDuration(durationMinutes);
    setSessionType(session.sessionType || '');
    setEditingId(session.id);
    setEditingSessionContext(contextStr);
    setErrors([]);

    // Scroll to form with smooth animation
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Trigger highlight animation
      setIsFormHighlighted(true);
      setTimeout(() => setIsFormHighlighted(false), 2000);
    }, 100);
  };

  const handleDelete = (id: string) => {
    onChange(sessions.filter(s => s.id !== id));
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Generate hour options based on session type
  const getHourOptions = (): number[] => {
    if (!sessionType) return [];
    
    const sessionInfo = SESSION_TYPES.find(s => s.value === sessionType);
    if (!sessionInfo) return [];

    const hours: number[] = [];
    // Generate all hours in range
    for (let hour = sessionInfo.minHour; hour <= sessionInfo.maxHour; hour++) {
      hours.push(hour);
    }
    return hours;
  };

  // Validate start time is within session type range
  const isValidStartTime = (hour: number, minute: number): boolean => {
    if (!sessionType) return true;
    
    const sessionInfo = SESSION_TYPES.find(s => s.value === sessionType);
    if (!sessionInfo) return true;

    const totalMinutes = hour * 60 + minute;
    const minMinutes = sessionInfo.minHour * 60;
    const maxMinutes = sessionInfo.maxHour * 60 + 59; // Allow up to XX:59

    return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
  };

  // Gợi ý thời gian theo buổi
  const handleSessionTypeChange = (type: 'morning' | 'afternoon' | 'evening') => {
    setSessionType(type);
    
    const sessionInfo = SESSION_TYPES.find(s => s.value === type);
    if (sessionInfo) {
      // Set default hour from default start time
      const [defaultHour, defaultMinute] = sessionInfo.defaultStart.split(':');
      setStartHour(defaultHour);
      setStartMinute(defaultMinute);
      const defaultDuration = 120; // 2 hours
      setDuration(defaultDuration);
    }
  };

  // Sắp xếp sessions theo: ngày trong tuần -> buổi (sáng/chiều/tối) -> giờ bắt đầu
  const sortedSessions = [...sessions].sort((a, b) => {
    // 1. Sắp xếp theo ngày đầu tiên trong tuần (T2 -> CN)
    const firstDayA = Math.min(...a.recurringDays.map(d => DAY_ORDER.indexOf(d)));
    const firstDayB = Math.min(...b.recurringDays.map(d => DAY_ORDER.indexOf(d)));
    
    if (firstDayA !== firstDayB) return firstDayA - firstDayB;
    
    // 2. Sắp xếp theo buổi học (morning -> afternoon -> evening)
    const sessionTypePriority = { morning: 1, afternoon: 2, evening: 3 };
    const priorityA = sessionTypePriority[a.sessionType || 'morning'];
    const priorityB = sessionTypePriority[b.sessionType || 'morning'];
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // 3. Sắp xếp theo giờ bắt đầu
    return parseTime(a.startTime) - parseTime(b.startTime);
  });

  // Filter sessions based on search and filters
  const filteredSessions = sortedSessions.filter(session => {
    // Filter by session type
    if (filterSessionType !== 'all' && session.sessionType !== filterSessionType) {
      return false;
    }
    
    // Filter by day
    if (filterDay !== 'all' && !session.recurringDays.includes(filterDay)) {
      return false;
    }
    
    // Search by time or day names
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const daysText = session.recurringDays.map(d => DAY_NAMES[d].toLowerCase()).join(' ');
      const timeText = `${session.startTime} ${session.endTime}`.toLowerCase();
      const sessionTypeText = SESSION_TYPES.find(t => t.value === session.sessionType)?.label.toLowerCase() || '';
      
      return daysText.includes(query) || timeText.includes(query) || sessionTypeText.includes(query);
    }
    
    return true;
  });

  // Group sessions by session type for collapsed view
  const groupedBySessionType = {
    morning: filteredSessions.filter(s => s.sessionType === 'morning'),
    afternoon: filteredSessions.filter(s => s.sessionType === 'afternoon'),
    evening: filteredSessions.filter(s => s.sessionType === 'evening'),
  };

  // Render days sorted
  const getSortedDays = (days: number[]): number[] => {
    return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  };

  const monthlyEstimate = calculateMonthlyEstimate();

  return (
    <div className="space-y-6">
      {/* Monthly Estimate Banner */}
      {sessions.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dự kiến thu nhập/tháng</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatPrice(monthlyEstimate)} VNĐ
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({sessions.length} ca dạy × {sessions.reduce((sum, s) => sum + s.recurringDays.length, 0)} ngày/tuần × 4 tuần)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editing Context Banner */}
      {editingSessionContext && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900">Đang chỉnh sửa ca dạy</p>
                <p className="text-sm text-blue-700 font-medium">{editingSessionContext}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
            >
              <X className="w-4 h-4 mr-1" />
              Hủy
            </Button>
          </div>
        </div>
      )}

      {/* Form */}
      <Card
        ref={formRef}
        className={`transition-all duration-300 ${
          isFormHighlighted
            ? 'ring-4 ring-blue-400 ring-opacity-50 shadow-lg'
            : ''
        }`}
      >
        <CardContent className="pt-6 space-y-4">
          {/* Session Type */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Chọn buổi học
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {SESSION_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleSessionTypeChange(type.value as any)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all hover:shadow-md
                    ${sessionType === type.value 
                      ? `${type.color} border-current font-semibold shadow-sm` 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                  `}
                >
                  <div className="text-base font-medium mb-1">{type.label}</div>
                  <div className="text-xs opacity-75">{type.timeRange}</div>
                  {sessionType === type.value && startTime && endTime && (
                    <div className="mt-2 pt-2 border-t border-current/20">
                      <div className="text-xs font-semibold">
                        {formatDuration(startTime, endTime)} • {formatPrice(calculatePricePerSession(startTime, endTime))} VNĐ
                      </div>
                    </div>
                  )}
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
                    px-5 py-3 rounded-lg border-2 font-semibold transition-all hover:shadow-sm
                    ${selectedDays.includes(day)
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                    }
                  `}
                >
                  {DAY_NAMES[day]}
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Đã chọn: {selectedDays.length} ngày/tuần
              </p>
            )}
          </div>

          {/* Time and Duration */}
          <div className="space-y-4">
            {/* Start Time - Hour and Minute */}
            <div>
              <Label className="font-semibold mb-2 block">
                Giờ bắt đầu <span className="text-red-500">*</span>
              </Label>
              {sessionType ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* Hour Selector */}
                  <div>
                    <Label htmlFor="startHour" className="text-xs text-muted-foreground mb-1 block">
                      Giờ (24h)
                    </Label>
                    <select
                      id="startHour"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Chọn giờ</option>
                      {getHourOptions().map(hour => (
                        <option key={hour} value={String(hour).padStart(2, '0')}>
                          {hour}h
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minute Input */}
                  <div>
                    <Label htmlFor="startMinute" className="text-xs text-muted-foreground mb-1 block">
                      Phút (0-59)
                    </Label>
                    <input
                      type="number"
                      id="startMinute"
                      min="0"
                      max="59"
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      placeholder="00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-md border border-input bg-gray-50 px-3 py-3 text-sm text-muted-foreground">
                  ⚠️ Vui lòng chọn buổi học trước
                </div>
              )}
              {sessionType && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <span>⏰</span>
                  <span>Khung giờ {SESSION_TYPES.find(s => s.value === sessionType)?.label}: {SESSION_TYPES.find(s => s.value === sessionType)?.timeRange}</span>
                </p>
              )}
            </div>

            {/* Duration Selector */}
            <div>
              <Label htmlFor="duration" className="font-semibold">
                Thời lượng <span className="text-red-500">*</span>
              </Label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={!sessionType}
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-calculated End Time Display */}
          {startTime && endTime && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Giờ kết thúc: <span className="font-bold">{endTime}</span>
                </span>
                <span className="text-blue-700">•</span>
                <span className="text-blue-700">
                  {formatDuration(startTime, endTime)}
                </span>
                <span className="text-blue-700">•</span>
                <span className="font-semibold text-blue-900">
                  {formatPrice(calculatePricePerSession(startTime, endTime))} VNĐ
                </span>
              </div>
            </div>
          )}

          {/* Error Messages */}
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
        <Card className="border-2">
          <CardContent className="p-0">
            {/* Header - Always visible, clickable to toggle */}
            <button
              type="button"
              onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
              className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold">
                      Ca dạy đã tạo ({sortedSessions.length})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {sortedSessions.reduce((sum, s) => sum + s.recurringDays.length, 0)} buổi/tuần
                      {' • '}
                      {formatPrice(calculateMonthlyEstimate())} VNĐ/tháng
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {isSessionsExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                </Badge>
                {isSessionsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Collapsed View - Show grouped summary */}
            {!isSessionsExpanded && (
              <div className="border-t p-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="grid grid-cols-3 gap-3">
                  {SESSION_TYPES.map(type => {
                    const count = groupedBySessionType[type.value as keyof typeof groupedBySessionType].length;
                    if (count === 0) return null;
                    
                    return (
                      <div
                        key={type.value}
                        className={`${type.color} border rounded-lg p-3 text-center`}
                      >
                        <div className="text-lg font-bold mb-1">{type.label}</div>
                        <div className="text-2xl font-bold mb-1">{count}</div>
                        <div className="text-xs opacity-75">ca dạy</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expandable Content */}
            {isSessionsExpanded && (
              <div className="border-t">
                {/* Filter and Search Bar */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm ca dạy (VD: T2, 08:00, sáng...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white dark:bg-gray-950"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Filter className="w-4 h-4" />
                      <span>Lọc:</span>
                    </div>
                    
                    {/* Session Type Filter */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterSessionType('all')}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                          filterSessionType === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white dark:bg-gray-950 border hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        Tất cả
                      </button>
                      {SESSION_TYPES.map(type => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFilterSessionType(type.value as any)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            filterSessionType === type.value
                              ? type.color
                              : 'bg-white dark:bg-gray-950 border hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>

                    {/* Day Filter */}
                    <div className="h-5 w-px bg-gray-300 dark:bg-gray-700"></div>
                    <select
                      value={filterDay}
                      onChange={(e) => setFilterDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="px-3 py-1 rounded-md text-xs font-medium border bg-white dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <option value="all">Tất cả ngày</option>
                      {DAY_ORDER.map(day => (
                        <option key={day} value={day}>{DAY_NAMES[day]}</option>
                      ))}
                    </select>

                    {/* Clear Filters */}
                    {(filterSessionType !== 'all' || filterDay !== 'all' || searchQuery) && (
                      <>
                        <div className="h-5 w-px bg-gray-300 dark:bg-gray-700"></div>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterSessionType('all');
                            setFilterDay('all');
                            setSearchQuery('');
                          }}
                          className="px-3 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border border-red-300 dark:border-red-800"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          Xóa bộ lọc
                        </button>
                      </>
                    )}
                  </div>

                  {/* Filter results count */}
                  {filteredSessions.length !== sortedSessions.length && (
                    <div className="text-xs text-muted-foreground">
                      Hiển thị {filteredSessions.length}/{sortedSessions.length} ca dạy
                    </div>
                  )}
                </div>

                {/* Sessions List */}
                <div className="p-4 space-y-3">
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Không tìm thấy ca dạy nào</p>
                      <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                  ) : (
                    filteredSessions.map((session, index) => {
                      const sortedDays = getSortedDays(session.recurringDays);
                      const sessionTypeInfo = SESSION_TYPES.find(t => t.value === session.sessionType);
                      const pricePerSession = calculatePricePerSession(session.startTime, session.endTime);
                      const weeklyIncome = pricePerSession * session.recurringDays.length;
                      // Find original index in sortedSessions for numbering
                      const originalIndex = sortedSessions.findIndex(s => s.id === session.id);
                      
                      return (
                        <Card key={session.id} className="hover:shadow-md transition-shadow border-l-4" 
                          style={{ borderLeftColor: sessionTypeInfo?.value === 'morning' ? '#facc15' : sessionTypeInfo?.value === 'afternoon' ? '#fb923c' : '#818cf8' }}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                {/* Header with number and session type */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                    {originalIndex + 1}
                                  </div>
                                  {sessionTypeInfo && (
                                    <Badge className={`${sessionTypeInfo.color} border`}>
                                      {sessionTypeInfo.label}
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Days */}
                                <div className="flex gap-1.5 mb-2 flex-wrap">
                                  {sortedDays.map(day => (
                                    <Badge key={day} variant="secondary" className="font-semibold">
                                      {DAY_NAMES[day]}
                                    </Badge>
                                  ))}
                                </div>
                                
                                {/* Time */}
                                <div className="flex items-center gap-2 text-lg font-semibold mb-2">
                                  <Clock className="w-5 h-5 text-primary" />
                                  <span>{session.startTime} - {session.endTime}</span>
                                  <span className="text-sm text-muted-foreground font-normal">
                                    • {formatDuration(session.startTime, session.endTime)}
                                  </span>
                                </div>

                                {/* Price Info */}
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div className="text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                                    <p className="text-xs text-muted-foreground">Học phí/buổi</p>
                                    <p className="font-semibold text-green-700 dark:text-green-400">{formatPrice(pricePerSession)} VNĐ</p>
                                  </div>
                                  <div className="text-sm bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                                    <p className="text-xs text-muted-foreground">Thu nhập/tuần</p>
                                    <p className="font-semibold text-blue-700 dark:text-blue-400">{formatPrice(weeklyIncome)} VNĐ</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(session)}
                                  className="hover:bg-blue-50 dark:hover:bg-blue-950"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(session.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sortedSessions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium mb-1">Chưa có ca dạy nào</p>
            <p className="text-sm">Hãy thêm ca dạy đầu tiên để bắt đầu nhận học sinh!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
