// Milestone detection and celebration system
import { DailyFoodLog } from '../types';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  type: 'meals_logged' | 'streak' | 'adherence' | 'special';
}

/**
 * Detects milestones based on user's food log history
 */
export function detectMilestones(
  todayLog: DailyFoodLog | null,
  weekLogs: DailyFoodLog[],
  totalMealsLogged: number,
  currentStreak: number
): Milestone[] {
  const milestones: Milestone[] = [];

  // Meal count milestones
  if (totalMealsLogged === 1) {
    milestones.push({
      id: 'first_meal',
      title: 'First Meal Logged! 🌟',
      description: 'You took the first step! Every journey starts here.',
      emoji: '🌟',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 10) {
    milestones.push({
      id: '10_meals',
      title: '10 Meals Logged! 📝',
      description: 'You\'re building the habit! Keep the momentum going.',
      emoji: '📝',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 50) {
    milestones.push({
      id: '50_meals',
      title: '50 Meals Logged! 🎯',
      description: 'This is serious commitment! You\'re tracking like a pro.',
      emoji: '🎯',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 100) {
    milestones.push({
      id: '100_meals',
      title: '100 Meals Logged! 💯',
      description: 'CENTURY! You\'ve logged 100 meals - that\'s dedication!',
      emoji: '💯',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 250) {
    milestones.push({
      id: '250_meals',
      title: '250 Meals Logged! 🏆',
      description: 'Quarter thousand! You\'re a tracking champion!',
      emoji: '🏆',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 500) {
    milestones.push({
      id: '500_meals',
      title: '500 Meals Logged! 🔥',
      description: 'HALF THOUSAND! This is elite-level consistency!',
      emoji: '🔥',
      type: 'meals_logged',
    });
  } else if (totalMealsLogged === 1000) {
    milestones.push({
      id: '1000_meals',
      title: '1,000 Meals Logged! 👑',
      description: 'LEGENDARY! You\'ve mastered the art of tracking!',
      emoji: '👑',
      type: 'meals_logged',
    });
  }

  // Streak milestones
  if (currentStreak === 3) {
    milestones.push({
      id: '3_day_streak',
      title: '3 Day Streak! 🔥',
      description: 'Three days in a row! The habit is forming.',
      emoji: '🔥',
      type: 'streak',
    });
  } else if (currentStreak === 7) {
    milestones.push({
      id: '7_day_streak',
      title: 'Full Week Streak! 📅',
      description: 'Seven days straight! You\'re on fire!',
      emoji: '📅',
      type: 'streak',
    });
  } else if (currentStreak === 14) {
    milestones.push({
      id: '14_day_streak',
      title: '2 Week Streak! ⚡',
      description: 'Two weeks of consistency! This is a real habit now.',
      emoji: '⚡',
      type: 'streak',
    });
  } else if (currentStreak === 30) {
    milestones.push({
      id: '30_day_streak',
      title: '30 Day Streak! 🏅',
      description: 'One month straight! You\'re unstoppable!',
      emoji: '🏅',
      type: 'streak',
    });
  } else if (currentStreak === 50) {
    milestones.push({
      id: '50_day_streak',
      title: '50 Day Streak! 💪',
      description: 'Fifty days! This is dedication at its finest!',
      emoji: '💪',
      type: 'streak',
    });
  } else if (currentStreak === 100) {
    milestones.push({
      id: '100_day_streak',
      title: '100 Day Streak! 🌟',
      description: 'CENTURY STREAK! You\'re in the top 1% of users!',
      emoji: '🌟',
      type: 'streak',
    });
  }

  // Perfect week milestone
  const thisWeekLogs = weekLogs.filter(log => log.entries && log.entries.length > 0);
  if (thisWeekLogs.length === 7) {
    // Check if this is their first perfect week
    const todayIsLastDayOfWeek = new Date().getDay() === 0; // Sunday
    if (todayIsLastDayOfWeek) {
      milestones.push({
        id: 'perfect_week',
        title: 'Perfect Week! 🎊',
        description: 'You logged every single day this week! Incredible!',
        emoji: '🎊',
        type: 'special',
      });
    }
  }

  // Perfect adherence day
  if (todayLog && todayLog.entries && todayLog.entries.length > 0) {
    const caloriesAdherence = (todayLog.totals.calories / todayLog.targets.calories) * 100;
    const proteinAdherence = (todayLog.totals.protein / todayLog.targets.protein) * 100;
    const carbsAdherence = (todayLog.totals.carbs / todayLog.targets.carbs) * 100;
    const fatAdherence = (todayLog.totals.fat / todayLog.targets.fat) * 100;

    // Perfect day: all macros within 5% of target
    if (
      caloriesAdherence >= 95 && caloriesAdherence <= 105 &&
      proteinAdherence >= 95 && proteinAdherence <= 105 &&
      carbsAdherence >= 95 && carbsAdherence <= 105 &&
      fatAdherence >= 95 && fatAdherence <= 105
    ) {
      milestones.push({
        id: 'perfect_day',
        title: 'Perfect Day! 🎯',
        description: 'All macros within 5% of target! This is precision!',
        emoji: '🎯',
        type: 'adherence',
      });
    }
  }

  return milestones;
}

/**
 * Calculate total meals logged across all time
 */
export function calculateTotalMealsLogged(weekLogs: DailyFoodLog[]): number {
  let total = 0;
  weekLogs.forEach(log => {
    if (log.entries) {
      total += log.entries.length;
    }
  });
  return total;
}
