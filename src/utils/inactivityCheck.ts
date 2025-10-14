// Inactivity detection and coach check-in logic
import { DailyFoodLog } from '../services/api';

export interface InactivityStatus {
  isInactive: boolean;
  daysSinceLastLog: number;
  shouldShowCheckIn: boolean;
  message: string;
}

export function checkInactivity(
  todayLog: DailyFoodLog | null,
  recentLogs: DailyFoodLog[]
): InactivityStatus {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Check if user has logged anything today
  const hasLoggedToday = todayLog && todayLog.entries && todayLog.entries.length > 0;

  if (hasLoggedToday) {
    return {
      isInactive: false,
      daysSinceLastLog: 0,
      shouldShowCheckIn: false,
      message: '',
    };
  }

  // Find last day with entries
  let lastLogDate: string | null = null;
  for (const log of recentLogs) {
    if (log.entries && log.entries.length > 0) {
      lastLogDate = log.date;
      break;
    }
  }

  if (!lastLogDate) {
    // No logs in recent history
    return {
      isInactive: true,
      daysSinceLastLog: 7, // Assume 7+ days
      shouldShowCheckIn: true,
      message: "I noticed you haven't logged any meals recently. How have you been doing? I'm here to help get you back on track! 💪",
    };
  }

  // Calculate days since last log
  const lastLog = new Date(lastLogDate);
  const diffTime = now.getTime() - lastLog.getTime();
  const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Trigger check-in after 2+ days of inactivity
  if (daysSince >= 2) {
    const messages = [
      {
        days: 2,
        text: "Hey! I noticed you haven't logged meals in 2 days. Everything okay? Let's keep that momentum going! 🔥",
      },
      {
        days: 3,
        text: "It's been 3 days since your last log. Life gets busy - I get it! Want to catch up on what you've been eating? 😊",
      },
      {
        days: 5,
        text: "I haven't seen you in 5 days! 🥺 Remember, consistency is key. Even logging one meal helps. How can I support you?",
      },
      {
        days: 7,
        text: "It's been a week! I miss working with you. 💙 No judgment - let's start fresh today. What's your first meal?",
      },
    ];

    // Find appropriate message
    const message = messages.reverse().find(m => daysSince >= m.days)?.text ||
      "Welcome back! Let's get started again. What have you been eating today?";

    return {
      isInactive: true,
      daysSinceLastLog: daysSince,
      shouldShowCheckIn: true,
      message,
    };
  }

  // Only 1 day inactive - don't trigger yet
  return {
    isInactive: true,
    daysSinceLastLog: daysSince,
    shouldShowCheckIn: false,
    message: '',
  };
}
