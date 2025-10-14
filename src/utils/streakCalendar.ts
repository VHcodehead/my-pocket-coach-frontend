// 7-day streak visualization calendar with recovery windows
import { DailyFoodLog } from '../types';

export interface CalendarDay {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  hasEntries: boolean;
  entriesCount: number;
  isToday: boolean;
  isGracePeriod?: boolean; // Within 12-hour grace window
  isStreakFreeze?: boolean; // User used a streak freeze
}

export interface StreakStatus {
  currentStreak: number;
  isInGracePeriod: boolean;
  graceExpiresAt: Date | null;
  streakFreezesAvailable: number;
  streakFreezesUsedThisMonth: number;
}

/**
 * Generates a 7-day calendar view showing which days have logs
 */
export function generate7DayCalendar(weekLogs: DailyFoodLog[]): CalendarDay[] {
  const calendar: CalendarDay[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Generate last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Find the log for this date
    const log = weekLogs.find(l => l.date === dateStr);
    const hasEntries = log && log.entries && log.entries.length > 0;
    const entriesCount = log?.entries?.length || 0;

    calendar.push({
      date: dateStr,
      dayOfWeek: getDayOfWeekShort(date),
      dayNumber: date.getDate(),
      hasEntries: hasEntries || false,
      entriesCount,
      isToday: dateStr === todayStr,
    });
  }

  return calendar;
}

/**
 * Calculate current streak with grace period logic
 * Grace period: 12 hours after midnight on a missed day
 */
export function calculateCurrentStreak(calendar: CalendarDay[]): number {
  let streak = 0;

  // Count backwards from today
  for (let i = calendar.length - 1; i >= 0; i--) {
    if (calendar[i].hasEntries || calendar[i].isGracePeriod || calendar[i].isStreakFreeze) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}

/**
 * Check if user is in grace period for streak
 * Grace period: If last log was yesterday after 6pm, give until noon today
 */
export function checkGracePeriod(weekLogs: DailyFoodLog[]): {
  isInGrace: boolean;
  expiresAt: Date | null;
} {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Find yesterday's log
  const yesterdayLog = weekLogs.find(log => log.date === yesterdayStr);
  const todayLog = weekLogs.find(log => log.date === today);

  // If already logged today, no grace needed
  if (todayLog && todayLog.entries && todayLog.entries.length > 0) {
    return { isInGrace: false, expiresAt: null };
  }

  // If no entries yesterday, no grace
  if (!yesterdayLog || !yesterdayLog.entries || yesterdayLog.entries.length === 0) {
    return { isInGrace: false, expiresAt: null };
  }

  // Check if last entry was after 6pm yesterday
  const lastEntry = yesterdayLog.entries[yesterdayLog.entries.length - 1];
  const lastLogTime = new Date(lastEntry.logged_at);
  const lastLogHour = lastLogTime.getHours();

  if (lastLogHour >= 18) {
    // Give grace until noon today
    const graceExpires = new Date(today);
    graceExpires.setHours(12, 0, 0, 0);

    if (now < graceExpires) {
      return { isInGrace: true, expiresAt: graceExpires };
    }
  }

  return { isInGrace: false, expiresAt: null };
}

/**
 * Calculate streak freezes available
 * Earn 1 freeze for every 7-day streak, max 2 per month
 */
export function calculateStreakFreezesAvailable(
  currentStreak: number,
  freezesUsedThisMonth: number
): number {
  const maxFreezesPerMonth = 2;
  const freezesEarned = Math.floor(currentStreak / 7);
  const available = Math.min(freezesEarned, maxFreezesPerMonth) - freezesUsedThisMonth;
  return Math.max(0, available);
}

/**
 * Get streak status message
 */
export function getStreakMessage(streak: number, calendar: CalendarDay[]): string {
  if (streak === 0) {
    return "Start your streak today! 🌟";
  } else if (streak === 1) {
    return "Great start! Keep it going tomorrow! 💪";
  } else if (streak === calendar.length) {
    return `Perfect week! ${streak} days straight! 🔥`;
  } else if (streak >= 3) {
    return `${streak} days in a row! You're on fire! 🔥`;
  } else {
    return `${streak} day streak! Don't break the chain! ⛓️`;
  }
}

function getDayOfWeekShort(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}
