// Utility for copying meals to multiple days
import { foodLogAPI } from '../services/api';

export interface CopyMealOptions {
  foodName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  servingSize: number;
  servingUnit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Copies a meal to multiple future dates
 */
export async function copyMealToMultipleDays(
  meal: CopyMealOptions,
  targetDates: string[] // ISO date strings (YYYY-MM-DD)
): Promise<{ success: number; failed: number; errors: string[] }> {
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const date of targetDates) {
    try {
      const response = await foodLogAPI.createEntry({
        food_name: meal.foodName,
        meal_type: meal.mealType,
        serving_size: meal.servingSize,
        serving_unit: meal.servingUnit || 'serving',
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        logged_at: `${date}T12:00:00Z`, // Noon on target date
      });

      if (response.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(`Failed to copy to ${date}`);
      }
    } catch (error) {
      failedCount++;
      errors.push(`Error copying to ${date}: ${error}`);
    }
  }

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Generates an array of future dates (next N days)
 */
export function getNextNDays(count: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();

  for (let i = 1; i <= count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Formats date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Gets friendly date label (e.g., "Tomorrow", "Mon Nov 13", etc.)
 */
export function getFriendlyDateLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // Reset time parts for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return 'Tomorrow';
  }

  // Day of week + short date
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return `${dayNames[date.getDay()]} ${monthNames[date.getMonth()]} ${date.getDate()}`;
}
