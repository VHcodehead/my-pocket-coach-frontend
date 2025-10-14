// Recent foods utility for quick re-logging
import { DailyFoodLog, FoodLogEntry } from '../types';

export interface RecentFood {
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  last_logged: string;
  times_logged: number;
}

/**
 * Get recent foods from last 7 days, deduplicated and sorted by frequency
 */
export function getRecentFoods(weekLogs: DailyFoodLog[]): RecentFood[] {
  const foodMap = new Map<string, RecentFood>();

  // Guard against undefined or non-array input
  if (!weekLogs || !Array.isArray(weekLogs)) {
    return [];
  }

  // Collect all entries from week
  weekLogs.forEach(log => {
    if (!log.entries) return;

    log.entries.forEach(entry => {
      const key = entry.food_name.toLowerCase().trim();

      if (foodMap.has(key)) {
        const existing = foodMap.get(key)!;
        existing.times_logged++;
        // Update to most recent
        if (new Date(entry.logged_at) > new Date(existing.last_logged)) {
          existing.last_logged = entry.logged_at;
        }
      } else {
        foodMap.set(key, {
          food_name: entry.food_name,
          serving_size: entry.serving_size,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          last_logged: entry.logged_at,
          times_logged: 1,
        });
      }
    });
  });

  // Convert to array and sort by times logged (most frequent first)
  const recentFoods = Array.from(foodMap.values())
    .sort((a, b) => b.times_logged - a.times_logged);

  // Return top 5
  return recentFoods.slice(0, 5);
}
