// Smart time-based prompts throughout the day
import { DailyFoodLog, UserProfile } from '../types';

export interface TimeBasedPrompt {
  message: string;
  emoji: string;
  actionText?: string;
  actionRoute?: string;
  tone: 'reminder' | 'encouragement' | 'suggestion';
}

/**
 * Generates contextual prompts based on time of day and user's logging behavior
 */
export function getTimeBasedPrompt(
  todayLog: DailyFoodLog | null,
  profile: UserProfile | null
): TimeBasedPrompt | null {
  const now = new Date();
  const hour = now.getHours();
  const lastEntryTime = todayLog?.entries?.length
    ? new Date(todayLog.entries[todayLog.entries.length - 1].logged_at)
    : null;
  const entriesCount = todayLog?.entries?.length || 0;

  // Morning prompts (6 AM - 10 AM)
  if (hour >= 6 && hour < 10) {
    if (entriesCount === 0) {
      return {
        message: "Good morning! Starting your day with a protein-rich breakfast sets you up for success. What are you having?",
        emoji: '🌅',
        actionText: 'Log Breakfast',
        actionRoute: '/food-search?mealType=breakfast',
        tone: 'suggestion',
      };
    }
  }

  // Mid-morning (10 AM - 12 PM)
  if (hour >= 10 && hour < 12) {
    if (entriesCount === 0) {
      return {
        message: "Hey! I haven't seen any meals logged today. Let's get back on track - log your breakfast or brunch now!",
        emoji: '⏰',
        actionText: 'Log Now',
        actionRoute: '/food-search',
        tone: 'reminder',
      };
    } else if (entriesCount === 1 && todayLog) {
      const proteinSoFar = todayLog.totals.protein;
      const proteinTarget = todayLog.targets.protein;
      if (proteinSoFar < proteinTarget * 0.3) {
        return {
          message: `You've logged ${Math.round(proteinSoFar)}g protein so far - aim for at least ${Math.round(proteinTarget * 0.3)}g by lunch to stay on track!`,
          emoji: '💪',
          tone: 'encouragement',
        };
      }
    }
  }

  // Lunch time (12 PM - 2 PM)
  if (hour >= 12 && hour < 14) {
    if (entriesCount === 0) {
      return {
        message: "It's lunch time! Don't skip meals - your body needs consistent fuel. Log your lunch now!",
        emoji: '🍽️',
        actionText: 'Log Lunch',
        actionRoute: '/food-search?mealType=lunch',
        tone: 'reminder',
      };
    } else if (entriesCount === 1) {
      return {
        message: "Great job logging breakfast! Now let's fuel your afternoon with a balanced lunch.",
        emoji: '🥗',
        actionText: 'Log Lunch',
        actionRoute: '/food-search?mealType=lunch',
        tone: 'encouragement',
      };
    }
  }

  // Mid-afternoon (2 PM - 5 PM)
  if (hour >= 14 && hour < 17) {
    if (lastEntryTime) {
      const hoursSinceLastMeal = (now.getTime() - lastEntryTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMeal >= 4 && entriesCount < 3) {
        return {
          message: `It's been ${Math.round(hoursSinceLastMeal)} hours since your last meal! Time for a snack or early dinner?`,
          emoji: '🍎',
          actionText: 'Log Snack',
          actionRoute: '/food-search?mealType=snack',
          tone: 'reminder',
        };
      }
    }
  }

  // Dinner time (5 PM - 8 PM)
  if (hour >= 17 && hour < 20) {
    if (entriesCount < 2) {
      return {
        message: "Dinner time! Make sure you're getting enough calories today - check your targets and log your meal.",
        emoji: '🌙',
        actionText: 'Log Dinner',
        actionRoute: '/food-search?mealType=dinner',
        tone: 'reminder',
      };
    } else if (todayLog && entriesCount >= 2) {
      const caloriesRemaining = todayLog.targets.calories - todayLog.totals.calories;
      const proteinRemaining = todayLog.targets.protein - todayLog.totals.protein;

      if (caloriesRemaining > 500 || proteinRemaining > 30) {
        return {
          message: `You have ${Math.round(caloriesRemaining)} calories and ${Math.round(proteinRemaining)}g protein left today. Make dinner count!`,
          emoji: '🎯',
          actionText: 'Log Dinner',
          actionRoute: '/food-search?mealType=dinner',
          tone: 'encouragement',
        };
      }
    }
  }

  // Evening (8 PM - 11 PM)
  if (hour >= 20 && hour < 23) {
    if (todayLog && entriesCount >= 2) {
      const caloriesAdherence = (todayLog.totals.calories / todayLog.targets.calories) * 100;

      if (caloriesAdherence < 80) {
        return {
          message: `You're at ${Math.round(caloriesAdherence)}% of your calorie target. Consider a healthy evening snack to hit your goals!`,
          emoji: '🌃',
          actionText: 'Log Snack',
          actionRoute: '/food-search?mealType=snack',
          tone: 'suggestion',
        };
      } else if (caloriesAdherence >= 90 && caloriesAdherence <= 110) {
        return {
          message: "Excellent day of tracking! You hit your targets. Rest well and let's do it again tomorrow! 💫",
          emoji: '🌟',
          tone: 'encouragement',
        };
      }
    }

    if (entriesCount === 0) {
      return {
        message: "Hey! I notice you haven't logged anything today. It's not too late - log what you ate and let's start fresh tomorrow!",
        emoji: '💙',
        actionText: 'Log Today',
        actionRoute: '/food-search',
        tone: 'reminder',
      };
    }
  }

  return null;
}

/**
 * Checks if enough time has passed to show another prompt (throttle)
 */
export function shouldShowPrompt(lastPromptTime: Date | null): boolean {
  if (!lastPromptTime) return true;

  const now = new Date();
  const hoursSinceLastPrompt = (now.getTime() - lastPromptTime.getTime()) / (1000 * 60 * 60);

  // Only show prompts max once every 2 hours
  return hoursSinceLastPrompt >= 2;
}
