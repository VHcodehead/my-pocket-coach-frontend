// Smart Quick Log detection for repeated meals
import { DailyFoodLog, FoodLogEntry } from '../types';

export interface QuickLogSuggestion {
  food_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  count: number;
  lastLogged: Date;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

/**
 * Analyzes past food logs to detect frequently logged meals
 * Returns suggestions for foods logged 3+ times in the same meal category
 */
export function getQuickLogSuggestions(
  weekLogs: DailyFoodLog[]
): QuickLogSuggestion[] {
  if (!weekLogs || weekLogs.length === 0) return [];

  // Flatten all entries from the week
  const allEntries: FoodLogEntry[] = [];
  weekLogs.forEach(log => {
    if (log.entries) {
      allEntries.push(...log.entries);
    }
  });

  // Group by food_name + meal_type combination
  const mealCounts: Map<string, FoodLogEntry[]> = new Map();

  allEntries.forEach(entry => {
    const key = `${entry.food_name.toLowerCase().trim()}::${entry.meal_type}`;
    if (!mealCounts.has(key)) {
      mealCounts.set(key, []);
    }
    mealCounts.get(key)!.push(entry);
  });

  // Filter for foods logged 3+ times and calculate averages
  const suggestions: QuickLogSuggestion[] = [];

  mealCounts.forEach((entries, key) => {
    if (entries.length >= 3) {
      const [foodName, mealType] = key.split('::');

      // Calculate averages
      const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
      const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
      const totalCarbs = entries.reduce((sum, e) => sum + e.carbs, 0);
      const totalFat = entries.reduce((sum, e) => sum + e.fat, 0);
      const count = entries.length;

      // Get most recent log date
      const lastLogged = new Date(
        Math.max(...entries.map(e => new Date(e.logged_at).getTime()))
      );

      suggestions.push({
        food_name: entries[0].food_name, // Use original casing from first entry
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        count,
        lastLogged,
        avgCalories: totalCalories / count,
        avgProtein: totalProtein / count,
        avgCarbs: totalCarbs / count,
        avgFat: totalFat / count,
      });
    }
  });

  // Sort by frequency (most logged first), then by recency
  suggestions.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.lastLogged.getTime() - a.lastLogged.getTime();
  });

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

/**
 * Get current meal type based on time of day
 */
export function getCurrentMealType(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  return 'dinner';
}

/**
 * Get the most relevant quick log suggestion for the current time
 */
export function getRelevantQuickLog(
  suggestions: QuickLogSuggestion[]
): QuickLogSuggestion | null {
  if (suggestions.length === 0) return null;

  const currentMealType = getCurrentMealType();

  // Find suggestion matching current meal type
  const relevantSuggestion = suggestions.find(s => s.meal_type === currentMealType);

  // If found, return it. Otherwise return most frequent meal
  return relevantSuggestion || suggestions[0];
}
