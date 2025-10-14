// Smart meal completion suggestions
import { DailyFoodLog } from '../types';

export interface MealSuggestion {
  food: string;
  reason: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  priority: number;
}

/**
 * Suggests foods to complete the current meal based on macro needs
 */
export function getMealCompletionSuggestions(
  todayLog: DailyFoodLog | null,
  currentMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): MealSuggestion[] {
  if (!todayLog) return [];

  const { totals, targets } = todayLog;

  // Calculate remaining macros
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
  };

  const suggestions: MealSuggestion[] = [];

  // Protein deficit suggestions
  if (remaining.protein > 30) {
    suggestions.push({
      food: 'Grilled Chicken Breast',
      reason: `Add ${Math.round(remaining.protein)}g protein to hit your target`,
      macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      priority: 95,
    });
    suggestions.push({
      food: 'Greek Yogurt (plain, nonfat)',
      reason: 'High protein, low fat snack',
      macros: { calories: 100, protein: 17, carbs: 6, fat: 0 },
      priority: 90,
    });
    suggestions.push({
      food: 'Protein Shake',
      reason: 'Quick protein boost',
      macros: { calories: 120, protein: 24, carbs: 3, fat: 2 },
      priority: 85,
    });
  }

  // Carb deficit suggestions
  if (remaining.carbs > 40) {
    suggestions.push({
      food: 'Brown Rice (1 cup)',
      reason: `Need ${Math.round(remaining.carbs)}g carbs for energy`,
      macros: { calories: 216, protein: 5, carbs: 45, fat: 1.8 },
      priority: 90,
    });
    suggestions.push({
      food: 'Sweet Potato (medium)',
      reason: 'Complex carbs with vitamins',
      macros: { calories: 103, protein: 2, carbs: 24, fat: 0.2 },
      priority: 85,
    });
    suggestions.push({
      food: 'Oatmeal (1 cup)',
      reason: 'Slow-release energy',
      macros: { calories: 150, protein: 6, carbs: 27, fat: 3 },
      priority: 80,
    });
  }

  // Healthy fats suggestions
  if (remaining.fat > 15) {
    suggestions.push({
      food: 'Avocado (half)',
      reason: `Add ${Math.round(remaining.fat)}g healthy fats`,
      macros: { calories: 120, protein: 1.5, carbs: 6, fat: 11 },
      priority: 85,
    });
    suggestions.push({
      food: 'Almonds (handful, ~23)',
      reason: 'Healthy fats + protein',
      macros: { calories: 160, protein: 6, carbs: 6, fat: 14 },
      priority: 80,
    });
  }

  // Balanced meal suggestions (when multiple macros needed)
  if (remaining.protein > 20 && remaining.carbs > 30) {
    suggestions.push({
      food: 'Salmon with Quinoa',
      reason: 'Balanced protein, carbs, and omega-3s',
      macros: { calories: 350, protein: 30, carbs: 35, fat: 12 },
      priority: 100,
    });
  }

  // Meal-specific suggestions
  if (currentMealType === 'breakfast') {
    suggestions.push({
      food: 'Eggs & Whole Wheat Toast',
      reason: 'Complete breakfast with protein and carbs',
      macros: { calories: 250, protein: 18, carbs: 24, fat: 10 },
      priority: 92,
    });
  }

  if (currentMealType === 'snack' && remaining.calories < 200) {
    suggestions.push({
      food: 'Apple with Peanut Butter',
      reason: 'Perfect snack size',
      macros: { calories: 180, protein: 4, carbs: 22, fat: 8 },
      priority: 88,
    });
  }

  // Vegetable additions (always good)
  suggestions.push({
    food: 'Mixed Green Salad',
    reason: 'Add micronutrients and fiber',
    macros: { calories: 50, protein: 2, carbs: 8, fat: 2 },
    priority: 70,
  });

  // Sort by priority and return top 3
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

/**
 * Checks if meal looks incomplete (too few calories/macros for meal type)
 */
export function isMealIncomplete(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  calories: number
): boolean {
  const minimums = {
    breakfast: 300,
    lunch: 400,
    dinner: 400,
    snack: 100,
  };

  return calories < minimums[mealType];
}

/**
 * Gets a friendly message about meal completion
 */
export function getMealCompletionMessage(
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  calories: number
): string | null {
  if (!isMealIncomplete(mealType, calories)) return null;

  const messages = {
    breakfast: `This ${mealType} seems light. Want to add something else?`,
    lunch: `This ${mealType} might leave you hungry. Consider adding a side?`,
    dinner: `This ${mealType} is pretty light. Maybe add a protein or veggie?`,
    snack: `Perfect snack size! You can add more if you're still hungry.`,
  };

  return messages[mealType];
}
