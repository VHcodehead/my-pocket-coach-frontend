// Meal plan context - compare actual meals vs planned meals
import { DailyFoodLog } from '../types';

export interface MealPlanItem {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanComparison {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  planned: {
    foods: string[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  actual: {
    foods: string[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  status: 'on_track' | 'deviation' | 'not_logged' | 'not_planned';
  message: string;
  emoji: string;
}

export function compareMealToPlans(
  todayLog: DailyFoodLog | null,
  mealPlans: MealPlanItem[]
): MealPlanComparison[] {
  const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const comparisons: MealPlanComparison[] = [];

  mealTypes.forEach(mealType => {
    // Get planned meals for this meal type
    const plannedMeals = mealPlans.filter(plan => plan.meal_type === mealType);

    // Get actual logged meals for this meal type
    const actualMeals = todayLog?.entries?.filter(entry => entry.meal_type === mealType) || [];

    const planned = plannedMeals.length > 0 ? {
      foods: plannedMeals.map(p => p.food_name),
      calories: plannedMeals.reduce((sum, p) => sum + p.calories, 0),
      protein: plannedMeals.reduce((sum, p) => sum + p.protein, 0),
      carbs: plannedMeals.reduce((sum, p) => sum + p.carbs, 0),
      fat: plannedMeals.reduce((sum, p) => sum + p.fat, 0),
    } : null;

    const actual = actualMeals.length > 0 ? {
      foods: actualMeals.map(e => e.food_name),
      calories: actualMeals.reduce((sum, e) => sum + e.calories, 0),
      protein: actualMeals.reduce((sum, e) => sum + e.protein, 0),
      carbs: actualMeals.reduce((sum, e) => sum + e.carbs, 0),
      fat: actualMeals.reduce((sum, e) => sum + e.fat, 0),
    } : null;

    // Determine status and message
    let status: MealPlanComparison['status'];
    let message: string;
    let emoji: string;

    if (!planned && !actual) {
      status = 'not_planned';
      message = `No ${mealType} planned or logged yet`;
      emoji = '➖';
    } else if (planned && !actual) {
      status = 'not_logged';
      message = `Haven't logged your ${mealType} yet. Planned: ${planned.foods.join(', ')}`;
      emoji = '⏰';
    } else if (!planned && actual) {
      status = 'not_planned';
      message = `Logged ${actual.foods.join(', ')} - no plan for comparison`;
      emoji = '📝';
    } else if (planned && actual) {
      // Compare calories - within 10% is considered on track
      const calorieDiff = Math.abs(actual.calories - planned.calories);
      const calorieThreshold = planned.calories * 0.10;

      if (calorieDiff <= calorieThreshold) {
        status = 'on_track';
        message = `Great! You're on track with your ${mealType} plan 🎯`;
        emoji = '✅';
      } else {
        status = 'deviation';
        const diff = actual.calories - planned.calories;
        if (diff > 0) {
          message = `Logged ${Math.round(diff)} more calories than planned for ${mealType}`;
          emoji = '📈';
        } else {
          message = `Logged ${Math.round(Math.abs(diff))} fewer calories than planned for ${mealType}`;
          emoji = '📉';
        }
      }
    } else {
      status = 'not_planned';
      message = '';
      emoji = '➖';
    }

    comparisons.push({
      mealType,
      planned,
      actual,
      status,
      message,
      emoji,
    });
  });

  return comparisons;
}

export function getMealPlanSummary(comparisons: MealPlanComparison[]): {
  onTrackCount: number;
  deviationCount: number;
  notLoggedCount: number;
  overallMessage: string;
  overallEmoji: string;
} {
  const onTrackCount = comparisons.filter(c => c.status === 'on_track').length;
  const deviationCount = comparisons.filter(c => c.status === 'deviation').length;
  const notLoggedCount = comparisons.filter(c => c.status === 'not_logged').length;

  let overallMessage: string;
  let overallEmoji: string;

  const plannedMeals = comparisons.filter(c => c.planned !== null).length;

  if (plannedMeals === 0) {
    overallMessage = "You don't have any meal plans set up yet. Want me to create a personalized plan?";
    overallEmoji = '🍽️';
  } else if (onTrackCount === plannedMeals) {
    overallMessage = "Perfect! You're 100% on track with your meal plan today! 🎉";
    overallEmoji = '🏆';
  } else if (onTrackCount >= plannedMeals * 0.75) {
    overallMessage = `You're doing great! ${onTrackCount}/${plannedMeals} meals on track.`;
    overallEmoji = '💪';
  } else if (notLoggedCount > 0) {
    overallMessage = `You have ${notLoggedCount} planned meal${notLoggedCount > 1 ? 's' : ''} left to log today.`;
    overallEmoji = '⏰';
  } else {
    overallMessage = "Some deviations from your plan, but that's okay! Let's adjust tomorrow.";
    overallEmoji = '🔄';
  }

  return {
    onTrackCount,
    deviationCount,
    notLoggedCount,
    overallMessage,
    overallEmoji,
  };
}

// Mock meal plan data - in a real app, this would come from AI generation or user input
export function getDefaultMealPlan(targets: { calories: number; protein: number; carbs: number; fat: number }): MealPlanItem[] {
  const caloriesPerMeal = targets.calories / 3; // Distribute across 3 main meals
  const proteinPerMeal = targets.protein / 3;
  const carbsPerMeal = targets.carbs / 3;
  const fatPerMeal = targets.fat / 3;

  return [
    {
      meal_type: 'breakfast',
      food_name: 'Oatmeal with berries and protein powder',
      serving_size: '1 serving',
      calories: Math.round(caloriesPerMeal),
      protein: Math.round(proteinPerMeal),
      carbs: Math.round(carbsPerMeal),
      fat: Math.round(fatPerMeal),
    },
    {
      meal_type: 'lunch',
      food_name: 'Grilled chicken breast with rice and vegetables',
      serving_size: '1 serving',
      calories: Math.round(caloriesPerMeal),
      protein: Math.round(proteinPerMeal),
      carbs: Math.round(carbsPerMeal),
      fat: Math.round(fatPerMeal),
    },
    {
      meal_type: 'dinner',
      food_name: 'Salmon with sweet potato and broccoli',
      serving_size: '1 serving',
      calories: Math.round(caloriesPerMeal),
      protein: Math.round(proteinPerMeal),
      carbs: Math.round(carbsPerMeal),
      fat: Math.round(fatPerMeal),
    },
  ];
}
