// Contextual quick actions based on user state
import { DailyFoodLog } from '../types';

export interface QuickAction {
  id: string;
  label: string;
  emoji: string;
  route: string;
  priority: number; // Higher = more important
  reason?: string; // Why this action is suggested
}

/**
 * Gets contextual quick actions based on user's current state
 */
export function getContextualActions(
  todayLog: DailyFoodLog | null,
  currentStreak: number
): QuickAction[] {
  const actions: QuickAction[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  // Always available core actions
  actions.push({
    id: 'log-food',
    label: 'Log Food',
    emoji: '🍽️',
    route: '/food-search',
    priority: 100,
  });

  // Time-sensitive actions
  if (currentHour >= 6 && currentHour < 11 && !hasBreakfast(todayLog)) {
    actions.push({
      id: 'log-breakfast',
      label: 'Log Breakfast',
      emoji: '🥞',
      route: '/food-search?mealType=breakfast',
      priority: 95,
      reason: 'Morning meal time',
    });
  }

  if (currentHour >= 11 && currentHour < 15 && !hasLunch(todayLog)) {
    actions.push({
      id: 'log-lunch',
      label: 'Log Lunch',
      emoji: '🥗',
      route: '/food-search?mealType=lunch',
      priority: 95,
      reason: 'Lunch time',
    });
  }

  if (currentHour >= 17 && currentHour < 22 && !hasDinner(todayLog)) {
    actions.push({
      id: 'log-dinner',
      label: 'Log Dinner',
      emoji: '🍝',
      route: '/food-search?mealType=dinner',
      priority: 95,
      reason: 'Dinner time',
    });
  }

  // Progress tracking actions
  if (shouldPromptProgressPhoto(todayLog, currentStreak)) {
    actions.push({
      id: 'progress-photo',
      label: 'Progress Photo',
      emoji: '📸',
      route: '/progress-photo-capture',
      priority: 85,
      reason: 'Track your progress',
    });
  }

  // Water tracking
  actions.push({
    id: 'water',
    label: 'Water Intake',
    emoji: '💧',
    route: '/water-tracker',
    priority: 70,
  });

  // Mood tracking
  actions.push({
    id: 'mood',
    label: 'Mood Check',
    emoji: '💭',
    route: '/mood-tracker',
    priority: 65,
  });

  // Barcode scanner
  actions.push({
    id: 'scan',
    label: 'Scan Barcode',
    emoji: '📱',
    route: '/barcode-scanner',
    priority: 60,
  });

  // Coach chat
  actions.push({
    id: 'coach',
    label: 'Ask Coach',
    emoji: '💬',
    route: '/coach-chat',
    priority: 55,
  });

  // Meal planning
  if (shouldPromptMealPlan(todayLog)) {
    actions.push({
      id: 'meal-plan',
      label: 'Meal Plan',
      emoji: '📋',
      route: '/meal-plan',
      priority: 80,
      reason: 'Plan ahead',
    });
  }

  // Photo timeline - show if user has progress photos
  actions.push({
    id: 'timeline',
    label: 'Progress Photos',
    emoji: '🖼️',
    route: '/photo-timeline',
    priority: 50,
  });

  // Sort by priority (highest first) and return top 6
  return actions.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

function hasBreakfast(log: DailyFoodLog | null): boolean {
  return log?.entries?.some(e => e.meal_type === 'breakfast') || false;
}

function hasLunch(log: DailyFoodLog | null): boolean {
  return log?.entries?.some(e => e.meal_type === 'lunch') || false;
}

function hasDinner(log: DailyFoodLog | null): boolean {
  return log?.entries?.some(e => e.meal_type === 'dinner') || false;
}

function shouldPromptProgressPhoto(log: DailyFoodLog | null, streak: number): boolean {
  // Prompt for progress photo on milestones (7, 14, 30, 60, 90 days)
  const milestones = [7, 14, 30, 60, 90];
  return milestones.includes(streak);
}

function shouldPromptMealPlan(log: DailyFoodLog | null): boolean {
  // Prompt meal planning if no meals logged yet today
  return !log?.entries || log.entries.length === 0;
}
