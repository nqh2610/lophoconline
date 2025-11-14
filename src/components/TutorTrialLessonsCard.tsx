"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, BookOpen, GraduationCap, MessageSquare, Lightbulb, CalendarClock, CalendarCheck, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface TrialLesson {
  id: number;
  tutorId: number;
  studentId: number;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  tutorConfirmed: number;
  studentConfirmed: number;
  meetingLink?: string;
  createdAt: string;
  studentName?: string;
  studentEmail?: string;
  gradeLevel?: string;
  gradeLevelId?: number;
  availability?: {
    id: number;
    recurringDays: number[];
    shiftType: string;
    startTime: string;
    endTime: string;
  };
  suggestedDate?: string;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
}

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const SHIFT_NAMES: Record<string, string> = {
  'morning': 'Sáng',
  'afternoon': 'Chiều',
  'evening': 'Tối',
};

export function TutorTrialLessonsCard() {
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingLesson, setConfirmingLesson] = useState<number | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<number>>(new Set());
  const [scheduleData, setScheduleData] = useState<{ [key: number]: { date: string; startTime: string; endTime: string } }>({});
  const [dateError, setDateError] = useState<{ [key: number]: string }>({});
  const { toast } = useToast();

  const toggleExpanded = (lessonId: number) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchTrialLessons();
  }, []);

  const fetchTrialLessons = async () => {
    try {
      const response = await fetch('/api/lessons/trial?role=tutor');
      if (response.ok) {
        const data = await response.json();
        setTrialLessons(data.lessons || []);

        // Auto-fill suggested dates for pending lessons
        const suggestions: typeof scheduleData = {};
        for (const lesson of data.lessons || []) {
          if (lesson.status === 'pending' && lesson.suggestedDate) {
            suggestions[lesson.id] = {
              date: lesson.suggestedDate,
              startTime: lesson.suggestedStartTime || lesson.availability?.startTime || '',
              endTime: lesson.suggestedEndTime || lesson.availability?.endTime || '',
            };
          }
        }
        setScheduleData(suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch trial lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick confirm with suggested date/time
  const handleQuickConfirm = async (lesson: TrialLesson) => {
    if (!lesson.suggestedDate || !lesson.suggestedStartTime || !lesson.suggestedEndTime) {
      toast({
        title: "Lỗi",
        description: "Không có gợi ý lịch học. Vui lòng chọn lịch thủ công.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/lessons/${lesson.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: lesson.suggestedDate,
          startTime: lesson.suggestedStartTime,
          endTime: lesson.suggestedEndTime,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Xác nhận thành công!",
          description: `Buổi học thử đã được lên lịch vào ${new Date(lesson.suggestedDate).toLocaleDateString('vi-VN')}`,
        });
        fetchTrialLessons();
      } else {
        const error = await response.json();
        toast({
          title: "Lỗi",
          description: error.error || "Không thể xác nhận buổi học",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  // Custom confirm with user-selected date/time
  const handleCustomConfirm = async (lessonId: number) => {
    const schedule = scheduleData[lessonId];
    if (!schedule || !schedule.date || !schedule.startTime || !schedule.endTime) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày và giờ học",
        variant: "destructive",
      });
      return;
    }

    // Validate date is in recurring days
    const lesson = trialLessons.find(l => l.id === lessonId);
    if (lesson?.availability) {
      const selectedDate = new Date(schedule.date);
      const dayOfWeek = selectedDate.getDay();

      if (!lesson.availability.recurringDays.includes(dayOfWeek)) {
        toast({
          title: "Lỗi",
          description: `Ngày ${DAY_NAMES[dayOfWeek]} không nằm trong ca học đã đăng ký (${lesson.availability.recurringDays.map(d => DAY_NAMES[d]).join(', ')})`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const response = await fetch(`/api/lessons/${lessonId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      if (response.ok) {
        toast({
          title: "✅ Xác nhận thành công!",
          description: `Buổi học thử đã được lên lịch vào ${new Date(schedule.date).toLocaleDateString('vi-VN')}`,
        });
        fetchTrialLessons();
        setConfirmingLesson(null);
        setDateError({});
      } else {
        const error = await response.json();
        toast({
          title: "Lỗi",
          description: error.error || "Không thể xác nhận buổi học",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const updateSchedule = (lessonId: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    setScheduleData(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [field]: value,
      },
    }));

    // Validate date if date field is being updated
    if (field === 'date') {
      const lesson = trialLessons.find(l => l.id === lessonId);
      if (lesson?.availability && value) {
        const selectedDate = new Date(value);
        const dayOfWeek = selectedDate.getDay();

        if (!lesson.availability.recurringDays.includes(dayOfWeek)) {
          setDateError(prev => ({
            ...prev,
            [lessonId]: `Vui lòng chọn ngày: ${lesson.availability?.recurringDays.map(d => DAY_NAMES[d]).join(', ') || ''}`,
          }));
        } else {
          setDateError(prev => {
            const newErrors = { ...prev };
            delete newErrors[lessonId];
            return newErrors;
          });
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><AlertCircle className="w-3 h-3 mr-1" />Chờ xác nhận</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-50"><CheckCircle className="w-3 h-3 mr-1" />Đã xác nhận</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50"><XCircle className="w-3 h-3 mr-1" />Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate next few valid dates for helper text
  const getNextValidDates = (recurringDays: number[], count: number = 3): string => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 1; i <= 21 && dates.length < count; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dayOfWeek = checkDate.getDay();

      if (recurringDays.includes(dayOfWeek)) {
        dates.push(`${checkDate.getDate()}/${checkDate.getMonth() + 1} (${DAY_NAMES[dayOfWeek]})`);
      }
    }

    return dates.join(', ');
  };

  // Calculate upcoming valid date objects for clickable selection
  const getUpcomingValidDates = (
    recurringDays: number[],
    startTime: string,
    endTime: string,
    count: number = 4,
    skipFirst: boolean = true // Skip the first one since it's already shown as suggested
  ): Array<{ date: string; startTime: string; endTime: string; displayText: string }> => {
    const dates: Array<{ date: string; startTime: string; endTime: string; displayText: string }> = [];
    const today = new Date();
    let found = 0;

    for (let i = 1; i <= 28 && dates.length < count; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dayOfWeek = checkDate.getDay();

      if (recurringDays.includes(dayOfWeek)) {
        found++;
        // Skip first match if it's already shown as suggested date
        if (skipFirst && found === 1) continue;

        const dateStr = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const displayDate = checkDate.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        dates.push({
          date: dateStr,
          startTime,
          endTime,
          displayText: `${displayDate} (${DAY_NAMES[dayOfWeek]})`,
        });
      }
    }

    return dates;
  };

  // Handle selection of a specific date option
  const handleDateSelection = async (lessonId: number, date: string, startTime: string, endTime: string) => {
    try {
      const response = await fetch(`/api/lessons/${lessonId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          startTime,
          endTime,
        }),
      });

      if (response.ok) {
        toast({
          title: "✅ Xác nhận thành công!",
          description: `Buổi học thử đã được lên lịch vào ${new Date(date).toLocaleDateString('vi-VN')}`,
        });
        fetchTrialLessons();
      } else {
        const error = await response.json();
        toast({
          title: "Lỗi",
          description: error.error || "Không thể xác nhận buổi học",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Đã có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const pendingLessons = trialLessons.filter(l => l.status === 'pending');
  const confirmedLessons = trialLessons.filter(l => l.status === 'confirmed');
  const completedLessons = trialLessons.filter(l => l.status === 'completed');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu học thử</CardTitle>
          <CardDescription>Đang tải...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Yêu cầu học thử
              {pendingLessons.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingLessons.length} mới
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {pendingLessons.length > 0 
                ? `${pendingLessons.length} yêu cầu chờ xác nhận`
                : 'Không có yêu cầu mới'}
            </CardDescription>
          </div>
          {trialLessons.length > 0 && (
            <div className="text-right text-sm text-gray-500">
              <div>✅ {confirmedLessons.length} đã lên lịch</div>
              <div>🎓 {completedLessons.length} hoàn thành</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pending Lessons - Compact & Action-Focused */}
          {pendingLessons.length > 0 && (
            <div className="space-y-3">
              {pendingLessons.map((lesson) => {
                const isCustomizing = confirmingLesson === lesson.id;

                return (
                  <div 
                    key={lesson.id} 
                    className="border-2 border-yellow-300 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 space-y-3">
                      {/* Compact Header: Student + Subject in one line */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-bold text-gray-900 truncate">
                                {lesson.studentName || 'Học sinh'}
                              </span>
                            </div>
                            {lesson.gradeLevel && (
                              <>
                                <span className="text-gray-300">•</span>
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {lesson.gradeLevel}
                                </Badge>
                              </>
                            )}
                            <span className="text-gray-300">•</span>
                            <div className="flex items-center gap-1 text-blue-700 font-medium">
                              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{lesson.subject}</span>
                            </div>
                          </div>
                          {lesson.studentEmail && (
                            <p className="text-xs text-gray-500 truncate">✉️ {lesson.studentEmail}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-400 whitespace-nowrap flex-shrink-0">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Chờ xác nhận
                        </Badge>
                      </div>

                      {/* Schedule Info - Ultra Compact */}
                      {lesson.availability && (
                        <div className="flex items-center gap-3 text-xs bg-white/60 rounded px-2.5 py-1.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-gray-600">Ca {SHIFT_NAMES[lesson.availability.shiftType]}:</span>
                            <span className="font-semibold">{lesson.availability.startTime}-{lesson.availability.endTime}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-green-600" />
                            <span className="font-semibold text-green-700">
                              {lesson.availability.recurringDays.map(d => DAY_NAMES[d]).join(', ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Student Notes - Prominent if exists */}
                      {lesson.notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                          <div className="flex gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-blue-700 mb-0.5">Yêu cầu:</p>
                              <p className="text-sm text-gray-800 leading-snug">{lesson.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Section */}
                      {isCustomizing ? (
                        /* Custom Schedule Form - Compact */
                        <div className="space-y-2.5 p-3 bg-white rounded-lg border-2 border-blue-300">
                          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs border border-blue-200">
                            <Lightbulb className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-blue-700 font-medium">
                                💡 Chọn ngày: <strong>{lesson.availability?.recurringDays.map(d => DAY_NAMES[d]).join(', ')}</strong>
                              </p>
                              {lesson.availability && (
                                <p className="text-gray-500 mt-0.5">
                                  VD: {getNextValidDates(lesson.availability.recurringDays)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-3 sm:col-span-1">
                              <Label htmlFor={`date-${lesson.id}`} className="text-xs font-medium">
                                Ngày học *
                              </Label>
                              <Input
                                id={`date-${lesson.id}`}
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={scheduleData[lesson.id]?.date || ''}
                                onChange={(e) => updateSchedule(lesson.id, 'date', e.target.value)}
                                className={`mt-1 h-9 text-sm ${dateError[lesson.id] ? 'border-red-500' : ''}`}
                              />
                              {dateError[lesson.id] && (
                                <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {dateError[lesson.id]}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor={`start-${lesson.id}`} className="text-xs font-medium">Bắt đầu *</Label>
                              <Input
                                id={`start-${lesson.id}`}
                                type="time"
                                value={scheduleData[lesson.id]?.startTime || ''}
                                onChange={(e) => updateSchedule(lesson.id, 'startTime', e.target.value)}
                                className="mt-1 h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`end-${lesson.id}`} className="text-xs font-medium">Kết thúc *</Label>
                              <Input
                                id={`end-${lesson.id}`}
                                type="time"
                                value={scheduleData[lesson.id]?.endTime || ''}
                                onChange={(e) => updateSchedule(lesson.id, 'endTime', e.target.value)}
                                className="mt-1 h-9 text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleCustomConfirm(lesson.id)}
                              size="sm"
                              className="flex-1 h-8"
                              disabled={!!dateError[lesson.id]}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Xác nhận
                            </Button>
                            <Button 
                              onClick={() => {
                                setConfirmingLesson(null);
                                setDateError(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[lesson.id];
                                  return newErrors;
                                });
                              }} 
                              variant="outline" 
                              size="sm"
                              className="h-8"
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Quick Actions - 1-Click Options */
                        <div className="space-y-2">
                          {/* Primary Action: Quick Confirm with Suggested Date */}
                          {lesson.suggestedDate && (
                            <Button
                              onClick={() => handleQuickConfirm(lesson)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm h-10"
                            >
                              <CalendarCheck className="w-4 h-4 mr-2" />
                              <span className="font-semibold">
                                Xác nhận: {new Date(lesson.suggestedDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                {' '}({DAY_NAMES[new Date(lesson.suggestedDate).getDay()]})
                                {' • '}{lesson.suggestedStartTime}-{lesson.suggestedEndTime}
                              </span>
                            </Button>
                          )}

                          {/* Alternative Dates - Compact Pills */}
                          {lesson.availability && lesson.suggestedStartTime && lesson.suggestedEndTime && (
                            (() => {
                              const upcomingDates = getUpcomingValidDates(
                                lesson.availability.recurringDays,
                                lesson.suggestedStartTime,
                                lesson.suggestedEndTime,
                                3, // Show 3 alternatives
                                true
                              );

                              return upcomingDates.length > 0 ? (
                                <div className="space-y-1.5">
                                  <p className="text-xs text-gray-600 font-medium">
                                    Hoặc chọn ngày khác (Ca {SHIFT_NAMES[lesson.availability.shiftType]}: {lesson.availability.startTime}-{lesson.availability.endTime}):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                    {upcomingDates.map((dateOption, index) => {
                                      const dayOfWeek = new Date(dateOption.date).getDay();
                                      return (
                                        <button
                                          key={index}
                                          onClick={() => handleDateSelection(
                                            lesson.id,
                                            dateOption.date,
                                            dateOption.startTime,
                                            dateOption.endTime
                                          )}
                                          className="px-2.5 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-all text-left group"
                                        >
                                          <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                              <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                              <span className="text-xs font-semibold text-gray-800">
                                                {dateOption.displayText.split(' ')[0]}
                                              </span>
                                              <span className="text-xs text-blue-600 ml-auto">→</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-600 pl-5">
                                              <span>{DAY_NAMES[dayOfWeek]}</span>
                                              <span className="text-gray-400">•</span>
                                              <span>{dateOption.startTime}-{dateOption.endTime}</span>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null;
                            })()
                          )}

                          {/* Custom Date Picker */}
                          <Button
                            onClick={() => setConfirmingLesson(lesson.id)}
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs"
                          >
                            <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
                            Chọn ngày và giờ tùy chỉnh
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirmed Lessons - Ultra Compact */}
          {confirmedLessons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-blue-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Đã lên lịch ({confirmedLessons.length})
              </h3>
              <div className="space-y-2">
                {confirmedLessons.map((lesson) => (
                  <div key={lesson.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 hover:bg-blue-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">{lesson.studentName}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm text-blue-700 truncate">{lesson.subject}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(lesson.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.startTime}-{lesson.endTime}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                        Đã lên lịch
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Lessons - Minimal */}
          {completedLessons.length > 0 && (
            <details className="group">
              <summary className="text-sm font-semibold text-green-700 flex items-center gap-1.5 cursor-pointer hover:text-green-800">
                <CheckCircle className="w-4 h-4" />
                Đã hoàn thành ({completedLessons.length})
                <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform ml-auto" />
              </summary>
              <div className="mt-2 space-y-2">
                {completedLessons.map((lesson) => (
                  <div key={lesson.id} className="border border-green-200 rounded p-2.5 bg-green-50/30 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{lesson.studentName}</span>
                      <span className="text-xs text-gray-600">{lesson.subject}</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {trialLessons.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <GraduationCap className="w-16 h-16 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">Chưa có yêu cầu học thử</p>
              <p className="text-sm mt-1">Yêu cầu sẽ hiển thị khi học sinh đăng ký</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
