// Yesterday's performance summary generator
import { DailyFoodLog } from '../types';

export interface YesterdaySummary {
  date: string;
  adherenceRate: number;
  overallTone: 'great' | 'good' | 'okay' | 'tough';
  message: string;
  emoji: string;
  highlight: string; // Best aspect of yesterday
}

/**
 * Analyzes yesterday's log and generates a summary
 */
export function getYesterdaySummary(yesterdayLog: DailyFoodLog | null): YesterdaySummary | null {
  if (!yesterdayLog || !yesterdayLog.entries || yesterdayLog.entries.length === 0) {
    return null; // No data from yesterday
  }

  const { totals, targets, entries } = yesterdayLog;

  // Calculate overall adherence
  const caloriesAdherence = (totals.calories / targets.calories) * 100;
  const proteinAdherence = (totals.protein / targets.protein) * 100;
  const carbsAdherence = (totals.carbs / targets.carbs) * 100;
  const fatAdherence = (totals.fat / targets.fat) * 100;

  const avgAdherence = (caloriesAdherence + proteinAdherence + carbsAdherence + fatAdherence) / 4;

  // Determine tone based on performance
  let overallTone: 'great' | 'good' | 'okay' | 'tough';
  let emoji: string;
  let message: string;
  let highlight: string = '';

  if (avgAdherence >= 90 && avgAdherence <= 110) {
    overallTone = 'great';
    emoji = '🔥';
    message = `Yesterday was incredible! You hit ${Math.round(avgAdherence)}% adherence - that's the kind of consistency that creates results!`;

    // Find best metric
    if (proteinAdherence >= 95 && proteinAdherence <= 105) {
      highlight = `Perfect protein: ${Math.round(totals.protein)}g 💪`;
    } else if (caloriesAdherence >= 95 && caloriesAdherence <= 105) {
      highlight = `Nailed your calories: ${Math.round(totals.calories)} kcal 🎯`;
    } else {
      highlight = `${entries.length} meals logged 📝`;
    }
  } else if (avgAdherence >= 75 && avgAdherence <= 120) {
    overallTone = 'good';
    emoji = '💪';
    message = `Solid day yesterday! ${Math.round(avgAdherence)}% adherence. A few tweaks and you'll be crushing it!`;

    if (entries.length >= 3) {
      highlight = `Logged ${entries.length} meals - great consistency! 📊`;
    } else if (proteinAdherence > 80) {
      highlight = `Good protein intake: ${Math.round(totals.protein)}g ✅`;
    } else {
      highlight = `You're on the right track! 🎯`;
    }
  } else if (avgAdherence >= 50) {
    overallTone = 'okay';
    emoji = '📈';
    message = `Yesterday was a bit off-target (${Math.round(avgAdherence)}% adherence), but that's okay! Today's a fresh start.`;

    if (entries.length >= 2) {
      highlight = `You logged ${entries.length} meals - that's progress! 🌟`;
    } else {
      highlight = `One meal logged is better than zero! 💫`;
    }
  } else {
    overallTone = 'tough';
    emoji = '🌅';
    message = `Yesterday was tough - you logged ${entries.length} ${entries.length === 1 ? 'meal' : 'meals'}. No worries, let's make today better!`;
    highlight = `New day, new opportunity! 🌟`;
  }

  return {
    date: yesterdayLog.date,
    adherenceRate: avgAdherence,
    overallTone,
    message,
    emoji,
    highlight,
  };
}

/**
 * Format date for display
 */
export function formatYesterdayDate(dateString: string): string {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
}
