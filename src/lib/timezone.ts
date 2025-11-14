/**
 * Timezone Utilities for Vietnam (UTC+7)
 *
 * IMPORTANT: Database stores all times in UTC.
 * User input/display uses Vietnam timezone (Asia/Ho_Chi_Minh).
 */

export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const VN_TIMEZONE_OFFSET = '+07:00';

/**
 * Parse date/time string as Vietnam timezone and return UTC Date object
 *
 * @example
 * parseVNDateTime('2025-11-04', '15:35')
 * // Returns Date object: 2025-11-04 08:35:00 UTC (which is 15:35 VN)
 */
export function parseVNDateTime(date: string, time: string): Date {
  // Ensure time has seconds
  const timeWithSeconds = time.includes(':') && time.split(':').length === 2
    ? `${time}:00`
    : time;

  return new Date(`${date}T${timeWithSeconds}${VN_TIMEZONE_OFFSET}`);
}

/**
 * Parse a complete datetime string as Vietnam timezone
 *
 * @example
 * parseVNDateTimeString('2025-11-04T15:35:00')
 * // Returns Date object in UTC
 */
export function parseVNDateTimeString(datetime: string): Date {
  // Check if already has timezone
  if (datetime.includes('+') || datetime.includes('Z')) {
    return new Date(datetime);
  }

  return new Date(`${datetime}${VN_TIMEZONE_OFFSET}`);
}

/**
 * Get current time in Vietnam timezone
 */
export function nowVN(): Date {
  return new Date();
}

/**
 * Format Date object to Vietnam date string (YYYY-MM-DD)
 */
export function formatVNDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: VN_TIMEZONE });
}

/**
 * Format Date object to Vietnam time string (HH:MM)
 */
export function formatVNTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VN_TIMEZONE,
  });
}

/**
 * Format Date object to Vietnam datetime string (YYYY-MM-DD HH:MM)
 */
export function formatVNDateTime(date: Date): string {
  const dateStr = formatVNDate(date);
  const timeStr = formatVNTime(date);
  return `${dateStr} ${timeStr}`;
}

/**
 * Format Date object for display in Vietnamese
 *
 * @example
 * formatVNDateTimeFull(new Date())
 * // "Thứ 3, 4 thg 11, 2025 lúc 15:35"
 */
export function formatVNDateTimeFull(date: Date): string {
  return date.toLocaleString('vi-VN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VN_TIMEZONE,
  });
}

/**
 * Check if a datetime is in the future (Vietnam timezone)
 */
export function isFutureVN(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Check if a datetime is in the past (Vietnam timezone)
 */
export function isPastVN(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Add hours to a Date object
 */
export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * Add days to a Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get difference in minutes between two dates
 */
export function diffInMinutes(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / 60000);
}

/**
 * Get difference in hours between two dates
 */
export function diffInHours(date1: Date, date2: Date): number {
  return Math.floor((date1.getTime() - date2.getTime()) / 3600000);
}

/**
 * Validate time string format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Compare two time strings (HH:MM)
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export function compareTimeStrings(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  if (h1 !== h2) return h1 < h2 ? -1 : 1;
  if (m1 !== m2) return m1 < m2 ? -1 : 1;
  return 0;
}

/**
 * Check if end time is after start time
 */
export function isEndTimeAfterStart(startTime: string, endTime: string): boolean {
  return compareTimeStrings(endTime, startTime) > 0;
}

/**
 * Get time until a datetime (human readable in Vietnamese)
 *
 * @example
 * getTimeUntil(futureDate)
 * // "15 phút nữa" | "2 giờ nữa" | "3 ngày nữa"
 */
export function getTimeUntilVN(targetDate: Date): string {
  const diffMs = targetDate.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 0) return 'Đã bắt đầu';
  if (diffMins < 1) return 'Ngay bây giờ';
  if (diffMins < 60) return `${diffMins} phút nữa`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ nữa`;
  return `${Math.floor(diffMins / 1440)} ngày nữa`;
}

/**
 * Create a date range validator for Vietnam timezone
 */
export function createDateRangeValidator(startDate: string, startTime: string, endDate: string, endTime: string) {
  const start = parseVNDateTime(startDate, startTime);
  const end = parseVNDateTime(endDate, endTime);

  return {
    start,
    end,
    isValid: end.getTime() > start.getTime(),
    durationMinutes: diffInMinutes(end, start),
    durationHours: diffInHours(end, start),
  };
}

/**
 * VALIDATION: Check if a date/time is valid for scheduling
 * (must be in the future, during business hours, etc.)
 */
export interface ScheduleValidation {
  isValid: boolean;
  errors: string[];
}

export function validateScheduleTime(
  date: string,
  startTime: string,
  endTime: string,
  options?: {
    minHoursInAdvance?: number;
    maxDaysInAdvance?: number;
    businessHoursOnly?: boolean;
  }
): ScheduleValidation {
  const errors: string[] = [];

  // Validate formats
  if (!isValidDateFormat(date)) {
    errors.push('Định dạng ngày không hợp lệ (phải là YYYY-MM-DD)');
  }
  if (!isValidTimeFormat(startTime)) {
    errors.push('Định dạng giờ bắt đầu không hợp lệ (phải là HH:MM)');
  }
  if (!isValidTimeFormat(endTime)) {
    errors.push('Định dạng giờ kết thúc không hợp lệ (phải là HH:MM)');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Parse times
  const startDateTime = parseVNDateTime(date, startTime);
  const endDateTime = parseVNDateTime(date, endTime);

  // Check end time after start time
  if (!isEndTimeAfterStart(startTime, endTime)) {
    errors.push('Giờ kết thúc phải sau giờ bắt đầu');
  }

  // Check if in future
  if (!isFutureVN(startDateTime)) {
    errors.push('Thời gian học phải là thời điểm trong tương lai');
  }

  // Check minimum advance notice
  if (options?.minHoursInAdvance) {
    const hoursUntil = diffInHours(startDateTime, new Date());
    if (hoursUntil < options.minHoursInAdvance) {
      errors.push(`Phải đặt lịch trước ít nhất ${options.minHoursInAdvance} giờ`);
    }
  }

  // Check maximum advance booking
  if (options?.maxDaysInAdvance) {
    const daysUntil = Math.floor(diffInHours(startDateTime, new Date()) / 24);
    if (daysUntil > options.maxDaysInAdvance) {
      errors.push(`Không thể đặt lịch quá ${options.maxDaysInAdvance} ngày`);
    }
  }

  // Check business hours (6:00 - 22:00)
  if (options?.businessHoursOnly) {
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);

    if (startHour < 6 || endHour > 22) {
      errors.push('Giờ học phải trong khoảng 6:00 - 22:00');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
