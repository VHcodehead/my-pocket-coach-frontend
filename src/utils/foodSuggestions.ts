// Smart food suggestions based on macro deficits
import { DailyFoodLog } from '../types';

export interface FoodSuggestion {
  foodName: string;
  reason: string;
  emoji: string;
  macroType: 'protein' | 'carbs' | 'fat';
  amount: string; // e.g., "30g protein", "50g carbs"
}

/**
 * Suggests specific foods when user is significantly below macro targets
 */
export function getFoodSuggestions(todayLog: DailyFoodLog | null): FoodSuggestion[] {
  if (!todayLog) return [];

  const suggestions: FoodSuggestion[] = [];

  // Calculate deficits
  const proteinDeficit = todayLog.targets.protein - todayLog.totals.protein;
  const carbsDeficit = todayLog.targets.carbs - todayLog.totals.carbs;
  const fatDeficit = todayLog.targets.fat - todayLog.totals.fat;
  const caloriesDeficit = todayLog.targets.calories - todayLog.totals.calories;

  // Only suggest if there's a significant deficit (>20% remaining)
  const proteinPercentRemaining = (proteinDeficit / todayLog.targets.protein) * 100;
  const carbsPercentRemaining = (carbsDeficit / todayLog.targets.carbs) * 100;
  const fatPercentRemaining = (fatDeficit / todayLog.targets.fat) * 100;

  // Protein suggestions (if >20% remaining and >15g deficit)
  if (proteinPercentRemaining > 20 && proteinDeficit > 15) {
    const proteinSuggestions = getProteinFoodSuggestions(proteinDeficit);
    suggestions.push(...proteinSuggestions);
  }

  // Carbs suggestions (if >20% remaining and >30g deficit)
  if (carbsPercentRemaining > 20 && carbsDeficit > 30) {
    const carbsSuggestions = getCarbsFoodSuggestions(carbsDeficit);
    suggestions.push(...carbsSuggestions);
  }

  // Fat suggestions (if >20% remaining and >10g deficit)
  if (fatPercentRemaining > 20 && fatDeficit > 10) {
    const fatSuggestions = getFatFoodSuggestions(fatDeficit);
    suggestions.push(...fatSuggestions);
  }

  // Limit to top 2 suggestions (prioritize protein, then carbs, then fat)
  return suggestions.slice(0, 2);
}

function getProteinFoodSuggestions(deficit: number): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];

  if (deficit >= 40) {
    suggestions.push({
      foodName: 'Grilled chicken breast',
      reason: `You need ${Math.round(deficit)}g more protein today`,
      emoji: '🍗',
      macroType: 'protein',
      amount: '~40g protein',
    });
  } else if (deficit >= 25) {
    suggestions.push({
      foodName: 'Greek yogurt (1 cup)',
      reason: `You need ${Math.round(deficit)}g more protein today`,
      emoji: '🥛',
      macroType: 'protein',
      amount: '~25g protein',
    });
  } else if (deficit >= 15) {
    suggestions.push({
      foodName: 'Protein shake',
      reason: `You need ${Math.round(deficit)}g more protein today`,
      emoji: '🥤',
      macroType: 'protein',
      amount: '~20g protein',
    });
  }

  return suggestions;
}

function getCarbsFoodSuggestions(deficit: number): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];

  if (deficit >= 60) {
    suggestions.push({
      foodName: 'Brown rice (1 cup)',
      reason: `You need ${Math.round(deficit)}g more carbs today`,
      emoji: '🍚',
      macroType: 'carbs',
      amount: '~45g carbs',
    });
  } else if (deficit >= 40) {
    suggestions.push({
      foodName: 'Sweet potato (medium)',
      reason: `You need ${Math.round(deficit)}g more carbs today`,
      emoji: '🍠',
      macroType: 'carbs',
      amount: '~25g carbs',
    });
  } else if (deficit >= 25) {
    suggestions.push({
      foodName: 'Banana',
      reason: `You need ${Math.round(deficit)}g more carbs today`,
      emoji: '🍌',
      macroType: 'carbs',
      amount: '~27g carbs',
    });
  }

  return suggestions;
}

function getFatFoodSuggestions(deficit: number): FoodSuggestion[] {
  const suggestions: FoodSuggestion[] = [];

  if (deficit >= 20) {
    suggestions.push({
      foodName: 'Avocado (1/2)',
      reason: `You need ${Math.round(deficit)}g more healthy fats today`,
      emoji: '🥑',
      macroType: 'fat',
      amount: '~15g fat',
    });
  } else if (deficit >= 12) {
    suggestions.push({
      foodName: 'Almonds (1 oz)',
      reason: `You need ${Math.round(deficit)}g more healthy fats today`,
      emoji: '🥜',
      macroType: 'fat',
      amount: '~14g fat',
    });
  } else if (deficit >= 8) {
    suggestions.push({
      foodName: 'Olive oil (1 tbsp)',
      reason: `You need ${Math.round(deficit)}g more healthy fats today`,
      emoji: '🫒',
      macroType: 'fat',
      amount: '~14g fat',
    });
  }

  return suggestions;
}
