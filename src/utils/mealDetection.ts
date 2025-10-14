// Smart meal detection - proactive time-based prompts
import { DailyFoodLog } from '../types';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface MealTimeWindow {
  type: MealType;
  startHour: number;
  endHour: number;
  message: string;
  emoji: string;
}

const MEAL_WINDOWS: MealTimeWindow[] = [
  {
    type: 'breakfast',
    startHour: 6,
    endHour: 10,
    message: "Good morning! Time to log breakfast? 🌅",
    emoji: '🥞',
  },
  {
    type: 'lunch',
    startHour: 11,
    endHour: 14,
    message: "Lunch time! What are you having? 🍽️",
    emoji: '🥗',
  },
  {
    type: 'snack',
    startHour: 15,
    endHour: 17,
    message: "Afternoon snack? Let's log it! 🍎",
    emoji: '🥨',
  },
  {
    type: 'dinner',
    startHour: 17,
    endHour: 21,
    message: "Dinner time! Ready to log your meal? 🌙",
    emoji: '🍝',
  },
];

export interface MealPrompt {
  shouldPrompt: boolean;
  mealType: MealType | null;
  message: string;
  emoji: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects if user should be prompted to log a meal based on:
 * - Current time of day
 * - What meals they've already logged today
 * - Historical eating patterns
 */
export function detectMealPrompt(todayLog: DailyFoodLog | null): MealPrompt {
  const now = new Date();
  const currentHour = now.getHours();

  // Find which meal window we're in
  const currentWindow = MEAL_WINDOWS.find(
    (window) => currentHour >= window.startHour && currentHour < window.endHour
  );

  if (!currentWindow) {
    return {
      shouldPrompt: false,
      mealType: null,
      message: '',
      emoji: '',
      confidence: 'low',
    };
  }

  // Check if this meal has already been logged
  const hasMealLogged = todayLog?.entries?.some(
    (entry) => entry.meal_type === currentWindow.type
  );

  if (hasMealLogged) {
    return {
      shouldPrompt: false,
      mealType: null,
      message: '',
      emoji: '',
      confidence: 'low',
    };
  }

  // Determine confidence based on time within window
  const windowDuration = currentWindow.endHour - currentWindow.startHour;
  const hoursIntoWindow = currentHour - currentWindow.startHour;
  const percentIntoWindow = hoursIntoWindow / windowDuration;

  let confidence: 'high' | 'medium' | 'low';
  if (percentIntoWindow < 0.3) {
    confidence = 'low'; // Early in window
  } else if (percentIntoWindow < 0.7) {
    confidence = 'high'; // Prime time
  } else {
    confidence = 'medium'; // Late in window
  }

  return {
    shouldPrompt: true,
    mealType: currentWindow.type,
    message: currentWindow.message,
    emoji: currentWindow.emoji,
    confidence,
  };
}

/**
 * Gets suggested meal type based on current time
 */
export function getSuggestedMealType(): MealType {
  const currentHour = new Date().getHours();

  if (currentHour >= 6 && currentHour < 11) return 'breakfast';
  if (currentHour >= 11 && currentHour < 15) return 'lunch';
  if (currentHour >= 15 && currentHour < 18) return 'snack';
  return 'dinner';
}

/**
 * Checks if it's been too long since last meal (4+ hours)
 */
export function checkForMissedMeal(todayLog: DailyFoodLog | null): boolean {
  if (!todayLog?.entries || todayLog.entries.length === 0) {
    return false; // Can't detect if no meals logged yet
  }

  // Get most recent meal timestamp
  const sortedEntries = [...todayLog.entries].sort((a, b) => {
    return new Date(b.logged_at || b.created_at).getTime() -
           new Date(a.logged_at || a.created_at).getTime();
  });

  const lastMeal = sortedEntries[0];
  const lastMealTime = new Date(lastMeal.logged_at || lastMeal.created_at);
  const now = new Date();
  const hoursSinceLastMeal = (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);

  return hoursSinceLastMeal >= 4;
}

/**
 * Gets a friendly reminder message based on time since last meal
 */
export function getMissedMealMessage(todayLog: DailyFoodLog | null): string | null {
  if (!todayLog?.entries || todayLog.entries.length === 0) return null;

  const sortedEntries = [...todayLog.entries].sort((a, b) => {
    return new Date(b.logged_at || b.created_at).getTime() -
           new Date(a.logged_at || a.created_at).getTime();
  });

  const lastMeal = sortedEntries[0];
  const lastMealTime = new Date(lastMeal.logged_at || lastMeal.created_at);
  const now = new Date();
  const hoursSinceLastMeal = (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastMeal >= 6) {
    return "It's been a while since your last meal! Make sure you're fueling your body 💪";
  } else if (hoursSinceLastMeal >= 4) {
    return "Haven't logged a meal in 4+ hours. Hungry? 🍴";
  }

  return null;
}
