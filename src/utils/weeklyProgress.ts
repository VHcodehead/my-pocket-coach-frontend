// Weekly progress analysis and trend detection
import { DailyFoodLog } from '../types';

export interface WeeklyTrend {
  daysLogged: number;
  totalDays: number;
  adherenceRate: number; // percentage
  trend: 'improving' | 'steady' | 'declining' | 'new';
  avgProteinAdherence: number;
  avgCaloriesAdherence: number;
  bestDay: { date: string; adherence: number } | null;
  coachMessage: string;
  emoji: string;
}

/**
 * Analyzes weekly food logs to detect trends and provide insights
 */
export function analyzeWeeklyProgress(weekLogs: DailyFoodLog[]): WeeklyTrend {
  if (!weekLogs || weekLogs.length === 0) {
    return {
      daysLogged: 0,
      totalDays: 7,
      adherenceRate: 0,
      trend: 'new',
      avgProteinAdherence: 0,
      avgCaloriesAdherence: 0,
      bestDay: null,
      coachMessage: "Let's start tracking! Every meal logged is progress 🌟",
      emoji: '🎯',
    };
  }

  const daysLogged = weekLogs.filter(log => log.entries && log.entries.length > 0).length;
  const adherenceRate = (daysLogged / 7) * 100;

  // Calculate average adherence rates
  let totalProteinAdherence = 0;
  let totalCaloriesAdherence = 0;
  let daysWithData = 0;
  let bestDay: { date: string; adherence: number } | null = null;

  weekLogs.forEach(log => {
    if (log.entries && log.entries.length > 0) {
      const proteinAdherence = (log.totals.protein / log.targets.protein) * 100;
      const caloriesAdherence = (log.totals.calories / log.targets.calories) * 100;

      // Overall adherence for the day (average of protein and calories)
      const dayAdherence = (proteinAdherence + caloriesAdherence) / 2;

      totalProteinAdherence += proteinAdherence;
      totalCaloriesAdherence += caloriesAdherence;
      daysWithData++;

      // Track best day
      if (!bestDay || dayAdherence > bestDay.adherence) {
        bestDay = {
          date: log.date,
          adherence: dayAdherence,
        };
      }
    }
  });

  const avgProteinAdherence = daysWithData > 0 ? totalProteinAdherence / daysWithData : 0;
  const avgCaloriesAdherence = daysWithData > 0 ? totalCaloriesAdherence / daysWithData : 0;

  // Determine trend by comparing first half vs second half of week
  let trend: 'improving' | 'steady' | 'declining' | 'new' = 'new';
  if (daysLogged >= 4) {
    const firstHalf = weekLogs.slice(0, 3);
    const secondHalf = weekLogs.slice(4, 7);

    const firstHalfLogged = firstHalf.filter(log => log.entries && log.entries.length > 0).length;
    const secondHalfLogged = secondHalf.filter(log => log.entries && log.entries.length > 0).length;

    if (secondHalfLogged > firstHalfLogged) {
      trend = 'improving';
    } else if (secondHalfLogged < firstHalfLogged) {
      trend = 'declining';
    } else {
      trend = 'steady';
    }
  } else if (daysLogged > 0) {
    trend = 'steady';
  }

  // Generate coach message based on performance
  let coachMessage = '';
  let emoji = '📊';

  if (adherenceRate === 100) {
    coachMessage = "PERFECT WEEK! You logged every single day! This is incredible dedication 🔥";
    emoji = '🔥';
  } else if (adherenceRate >= 85) {
    coachMessage = `Amazing week! You logged ${daysLogged} out of 7 days. You're crushing it! 💪`;
    emoji = '⭐';
  } else if (adherenceRate >= 70) {
    coachMessage = `Solid week! ${daysLogged} days logged. Let's aim for one more day next week!`;
    emoji = '💪';
  } else if (adherenceRate >= 50) {
    coachMessage = `Good progress with ${daysLogged} days logged. Let's build that consistency! 📈`;
    emoji = '📈';
  } else if (daysLogged > 0) {
    coachMessage = `You logged ${daysLogged} ${daysLogged === 1 ? 'day' : 'days'} - that's a start! Let's aim for more this week 🎯`;
    emoji = '🎯';
  } else {
    coachMessage = "Ready to start tracking? Your first log is just a tap away! 🌟";
    emoji = '🌟';
  }

  // Add trend-specific messaging
  if (trend === 'improving') {
    coachMessage += " Your consistency is improving - keep that momentum! 📈";
  } else if (trend === 'declining') {
    coachMessage = `${coachMessage.split('.')[0]}. I noticed tracking dropped off mid-week. Let's get back on track! 💪`;
  }

  return {
    daysLogged,
    totalDays: 7,
    adherenceRate,
    trend,
    avgProteinAdherence,
    avgCaloriesAdherence,
    bestDay,
    coachMessage,
    emoji,
  };
}

/**
 * Format date for display (e.g., "Monday, Jan 15")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}
