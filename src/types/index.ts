// TypeScript types for the application

export interface User {
  id: string;
  email: string;
  fullName?: string; // Changed from full_name to match backend
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string; // Changed from full_name to match backend
  weight?: number;
  height_cm?: number;
  age?: number;
  sex?: 'male' | 'female';
  bodyfat?: number;
  goal?: 'cut' | 'recomp' | 'bulk';
  activity?: number;
  meals_per_day?: number;
  diet_type?: string;
  allergens?: string[];
  dislikes?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface FoodLogEntry {
  id: number;
  user_id: string;
  food_name: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  created_at?: string;
}

export interface DailyFoodLog {
  date: string;
  entries: FoodLogEntry[];
  totals: MacroTotals;
  targets: MacroTotals;
  baseTargets?: MacroTotals; // Original targets before weekly adjustment
  dailyAdjustment?: {
    protein: number;
    carbs: number;
    fat: number;
  }; // Daily adjustment amounts (can be positive or negative)
  adjustmentMessage?: string; // Encouraging message explaining the adjustment
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Checkin {
  id: number;
  user_id: string;
  weight: number;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'tired' | 'stressed';
  energy?: number; // 1-5
  checked_at: string;
  created_at?: string;
}

export interface WeeklyCheckinResponse {
  success: boolean;
  data: {
    checkin: Checkin;
    weightChange: {
      previous: number;
      current: number;
      change: number;
    };
    newTargets: {
      protein: number;
      carbs: number;
      fat: number;
      tdee: number;
      bmr: number;
    };
    coachMessage: string;
    nextSteps: string[];
  };
}

export interface Recipe {
  id: number;
  title: string;
  slug: string;
  description?: string;
  image_url?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  ingredients?: string[];
  instructions?: string[];
  tags?: string[];
  created_at?: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  plan_data: {
    days: MealPlanDay[];
    weeklyTotals: MacroTotals;
  };
  created_at: string;
}

export interface MealPlanDay {
  day: string;
  meals: Meal[];
  totals: MacroTotals;
}

export interface Meal {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  foods: FoodItem[];
  totals: MacroTotals;
}

export interface FoodItem {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    token: string;
  };
  error?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

// ============================================
// TRAINING TYPES
// ============================================

export interface Exercise {
  id: number;
  name: string;
  category: 'compound' | 'isolation';
  muscle_groups: string[];
  equipment_needed: string[];
  movement_pattern: 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core' | 'isolation';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  video_url?: string;
  form_cues?: string[];
  common_mistakes?: string[];
}

export interface TrainingPlan {
  id: number;
  user_id: string;
  name: string;
  duration_weeks: number;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  primary_goal: 'strength' | 'hypertrophy' | 'hybrid';
  training_days_per_week: number;
  current_week: number;
  current_block: 'hypertrophy' | 'strength' | 'power' | 'deload';
  equipment_available: string[];
  split_type?: string;
  program_structure?: any;
  started_at: string;
  completed_at?: string;
  is_active: boolean;
}

export interface WorkoutTemplate {
  id: number;
  training_plan_id: number;
  week_number: number;
  day_number: number;
  workout_name: string;
  workout_type: 'normal' | 'deload';
  exercises: WorkoutExercise[];
  total_exercises: number;
  estimated_duration_minutes: number;
}

export interface WorkoutExercise {
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: string | number; // Can be "8-10" or 10
  rpe?: number;
  restSeconds: number;
  notes?: string;
  supersetPair?: string; // "A", "B", etc.
  isDropSet?: boolean;
  videoUrl?: string;
  formCues?: string[];
}

export interface TrainingLog {
  id: number;
  user_id: string;
  training_plan_id?: number;
  workout_template_id?: number;
  exercise_id: number;
  exercise_name: string;
  set_number: number;
  set_type: 'normal' | 'warmup' | 'drop' | 'superset' | 'rest_pause';
  prescribed_reps?: number;
  prescribed_weight?: number;
  actual_reps: number;
  actual_weight: number;
  rpe?: number;
  notes?: string;
  logged_at: string;
}

export interface PersonalRecord {
  id: number;
  user_id: string;
  exercise_id: number;
  exercise_name: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
}

export interface TrainingPlanReview {
  id: number;
  training_plan_id: number;
  total_workouts_planned: number;
  total_workouts_completed: number;
  adherence_rate: number;
  total_weight_lifted: number;
  strength_gains: { [exerciseId: number]: { start: number; end: number; gainPercent: number } };
  prs_achieved: number;
  perfect_weeks: number;
  coach_feedback: string;
  user_rating?: number;
}

export interface WorkoutAdjustment {
  id: number;
  training_plan_id: number;
  workout_template_id?: number;
  adjustment_type: 'missed' | 'failed_reps' | 'deload_triggered' | 'form_breakdown' | 'injury' | 'fatigue';
  adjustment_data: any;
  coach_notes: string;
  resolved: boolean;
  created_at: string;
}

export interface TrainingOnboardingData {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal: 'strength' | 'hypertrophy' | 'hybrid';
  trainingDays: number; // 3-6
  timePerSession: number; // minutes
  equipment: string[];
  injuryHistory?: string[];
}

export interface WeightRecommendation {
  exerciseId: number;
  exerciseName: string;
  currentWeight: number;
  recommendedWeight: number;
  reasoning: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface DeloadRecommendation {
  needsDeload: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  triggerData?: any;
}
