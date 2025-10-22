// API service for Railway backend
import config from '../config';
import * as SecureStore from 'expo-secure-store';
import {
  AuthResponse,
  APIResponse,
  DailyFoodLog,
  FoodLogEntry,
  WeeklyCheckinResponse,
  Recipe,
  GoalDateValidationResult,
} from '../types';

const API_URL = config.API_URL;

// Get stored auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch (error) {
    console.error('[API] Error getting auth token:', error);
    return null;
  }
};

// Store auth token
const setAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('auth_token', token);
    console.log('[API] Auth token stored');
  } catch (error) {
    console.error('[API] Error storing auth token:', error);
  }
};

// Remove auth token
const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('auth_token');
    console.log('[API] Auth token removed');
  } catch (error) {
    console.error('[API] Error removing auth token:', error);
  }
};

// Generic fetch wrapper with auth
const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`[API] ${options.method || 'GET'} ${API_URL}${endpoint}`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      cache: 'no-store', // Force no caching
    });

    const data = await response.json();
    console.log(`[API] Response data:`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error(`[API] Error ${response.status}:`, data);
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error: any) {
    console.error(`[API] Request failed:`, error.message);
    throw error;
  }
};

// ============ AUTH ENDPOINTS ============

export const authAPI = {
  register: async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<AuthResponse> => {
    console.log('[API] Registering user:', email);
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });

    if (response.success && response.data?.token) {
      await setAuthToken(response.data.token);
    }

    return response;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    console.log('[API] Logging in user:', email);
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      await setAuthToken(response.data.token);
    }

    return response;
  },

  logout: async (): Promise<void> => {
    console.log('[API] Logging out user');
    await removeAuthToken();
  },

  me: async (): Promise<APIResponse> => {
    console.log('[API] Fetching current user');
    return apiFetch('/auth/me');
  },

  getProfile: async (): Promise<APIResponse> => {
    console.log('[API] Fetching user profile');
    return apiFetch('/auth/profile');
  },

  updateProfile: async (profileData: any): Promise<APIResponse> => {
    console.log('[API] Updating user profile');
    return apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
};

// ============ FOOD LOG ENDPOINTS ============

export const foodLogAPI = {
  getToday: async (): Promise<APIResponse<DailyFoodLog>> => {
    console.log('[API] Fetching today\'s food log');
    // Send user's local date to backend to fix timezone issues
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const userDate = `${year}-${month}-${day}`;
    // Use /current instead of /today to bypass caching issues
    return apiFetch(`/log/current?userDate=${userDate}&_t=${Date.now()}`);
  },

  getDate: async (date: string): Promise<APIResponse<DailyFoodLog>> => {
    console.log('[API] Fetching food log for date:', date);
    return apiFetch(`/log/date/${date}`);
  },

  getWeek: async (): Promise<APIResponse<DailyFoodLog[]>> => {
    console.log('[API] Fetching week\'s food logs');
    return apiFetch('/log/week');
  },

  createEntry: async (entry: Partial<FoodLogEntry>): Promise<APIResponse> => {
    console.log('[API] Creating food log entry:', entry.food_name);
    return apiFetch('/log/entry', {
      method: 'POST',
      body: JSON.stringify({
        foodName: entry.food_name,
        servingSize: entry.serving_size,
        servingUnit: entry.serving_unit,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        mealType: entry.meal_type,
        loggedAt: entry.logged_at,
      }),
    });
  },

  updateEntry: async (
    id: number,
    entry: Partial<FoodLogEntry>
  ): Promise<APIResponse> => {
    console.log('[API] Updating food log entry:', id);
    return apiFetch(`/log/entry/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        servingSize: entry.serving_size,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        mealType: entry.meal_type,
      }),
    });
  },

  deleteEntry: async (id: number): Promise<APIResponse> => {
    console.log('[API] Deleting food log entry:', id);
    return apiFetch(`/log/entry/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ WEEKLY CHECKIN ENDPOINTS ============

export const checkinAPI = {
  submitWeekly: async (data: {
    weight: number;
    mood?: string;
    energy?: number;
    notes?: string;
    photoFront?: string;
    photoSide1?: string;
    photoSide2?: string;
    photoBack?: string;
  }): Promise<WeeklyCheckinResponse> => {
    console.log('[API] Submitting weekly check-in:', {
      weight: data.weight,
      mood: data.mood,
      energy: data.energy,
      hasNotes: !!data.notes,
      photoFront: data.photoFront ? 'provided' : 'not provided',
      photoSide1: data.photoSide1 ? 'provided' : 'not provided',
      photoSide2: data.photoSide2 ? 'provided' : 'not provided',
      photoBack: data.photoBack ? 'provided' : 'not provided',
    });
    return apiFetch('/weekly-checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getHistory: async (): Promise<APIResponse> => {
    console.log('[API] Fetching check-in history');
    return apiFetch('/checkin/history');
  },

  getStreak: async (): Promise<APIResponse> => {
    console.log('[API] Fetching check-in streak');
    return apiFetch('/checkin/streak');
  },

  getToday: async (): Promise<APIResponse> => {
    console.log('[API] Fetching today\'s check-in');
    return apiFetch('/checkin/today');
  },

  getProgressPhotos: async (): Promise<APIResponse> => {
    console.log('[API] Fetching progress photos');
    return apiFetch('/weekly-checkin/progress-photos');
  },
};

// ============ RECIPE ENDPOINTS (Supabase) ============

export const recipeAPI = {
  getAll: async (): Promise<APIResponse<Recipe[]>> => {
    console.log('[API] Fetching all recipes');
    return apiFetch('/api/supabase-recipes');
  },

  getById: async (id: string): Promise<APIResponse<Recipe>> => {
    console.log('[API] Fetching recipe:', id);
    return apiFetch(`/api/supabase-recipes/${id}`);
  },

  search: async (query: string): Promise<APIResponse<Recipe[]>> => {
    console.log('[API] Searching recipes:', query);
    return apiFetch(`/api/supabase-recipes/search/${query}`);
  },

  getHighProtein: async (): Promise<APIResponse<Recipe[]>> => {
    console.log('[API] Fetching high protein recipes');
    return apiFetch('/api/supabase-recipes/filter/high-protein');
  },

  getLowCarb: async (): Promise<APIResponse<Recipe[]>> => {
    console.log('[API] Fetching low carb recipes');
    return apiFetch('/api/supabase-recipes/filter/low-carb');
  },

  getRandom: async (count: number = 5): Promise<APIResponse<Recipe[]>> => {
    console.log('[API] Fetching random recipes:', count);
    return apiFetch(`/api/supabase-recipes/random/${count}`);
  },
};

// ============ MEAL PLAN ENDPOINTS ============

export const mealPlanAPI = {
  generate: async (preferences: any): Promise<APIResponse> => {
    console.log('[API] Generating meal plan with preferences:', preferences);
    return apiFetch('/plan', {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  },

  getCurrent: async (): Promise<APIResponse> => {
    console.log('[API] Fetching current meal plan');
    return apiFetch('/weekly-checkin/meal-plan');
  },
};

// ============ COACH CHAT ENDPOINTS ============

export const coachAPI = {
  sendMessage: async (message: string, context?: any): Promise<APIResponse> => {
    console.log('[API] Sending message to coach:', message);
    return apiFetch('/coach/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        ctx: context,
        thread_id: 'default',
        user_id: 'user'
      }),
    });
  },

  getHistory: async (): Promise<APIResponse> => {
    console.log('[API] Fetching coach chat history');
    return apiFetch('/coach/history');
  },
};

// ============ TRAINING ENDPOINTS ============

export const trainingAPI = {
  // Onboarding & Plan Generation
  submitOnboarding: async (data: any): Promise<APIResponse> => {
    console.log('[API] Submitting training onboarding');
    return apiFetch('/training/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generatePlan: async (onboardingData: any): Promise<APIResponse> => {
    console.log('[API] Starting async training plan generation');
    // Returns immediately with jobId - no timeout needed
    return apiFetch('/training/plan/generate', {
      method: 'POST',
      body: JSON.stringify(onboardingData),
    });
  },

  checkPlanStatus: async (jobId: number): Promise<APIResponse> => {
    console.log('[API] Checking plan generation status:', jobId);
    return apiFetch(`/training/plan/status/${jobId}`);
  },

  // Plan Management
  getCurrentPlan: async (): Promise<APIResponse> => {
    console.log('[API] Fetching current training plan');
    return apiFetch('/training/plan/current');
  },

  getAllWorkouts: async (): Promise<APIResponse> => {
    console.log('[API] Fetching all workouts (12 weeks)');
    return apiFetch('/training/plan/all-workouts');
  },

  completePlan: async (planId: number): Promise<APIResponse> => {
    console.log('[API] Completing training plan:', planId);
    return apiFetch('/training/plan/complete', {
      method: 'POST',
      body: JSON.stringify({ trainingPlanId: planId }),
    });
  },

  deactivatePlan: async (): Promise<APIResponse> => {
    console.log('[API] Deactivating current training plan');
    return apiFetch('/training/plan/deactivate', {
      method: 'POST',
    });
  },

  // Workouts
  getTodayWorkout: async (): Promise<APIResponse> => {
    console.log('[API] Fetching today\'s workout');
    return apiFetch('/training/workout/today');
  },

  getWorkoutTemplate: async (templateId: number): Promise<APIResponse> => {
    console.log('[API] Fetching workout template:', templateId);
    return apiFetch(`/training/workout/template/${templateId}`);
  },

  // Logging
  logSet: async (data: {
    workoutTemplateId: number;
    exerciseId: number;
    setNumber: number;
    actualWeight: number;
    actualReps: number;
    rpe?: number;
    notes?: string;
  }): Promise<APIResponse> => {
    console.log('[API] Logging set:', data);
    return apiFetch('/training/log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSet: async (id: number, data: Partial<any>): Promise<APIResponse> => {
    console.log('[API] Updating set:', id);
    return apiFetch(`/training/log/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSet: async (id: number): Promise<APIResponse> => {
    console.log('[API] Deleting set:', id);
    return apiFetch(`/training/log/${id}`, {
      method: 'DELETE',
    });
  },

  // Progress & History
  getProgress: async (): Promise<APIResponse> => {
    console.log('[API] Fetching training progress');
    return apiFetch('/training/progress');
  },

  getHistory: async (filters?: any): Promise<APIResponse> => {
    console.log('[API] Fetching training history');
    const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return apiFetch(`/training/history${queryParams}`);
  },

  getPersonalRecords: async (): Promise<APIResponse> => {
    console.log('[API] Fetching personal records');
    return apiFetch('/training/personal-records');
  },

  // Exercises
  searchExercises: async (query?: string, filters?: any): Promise<APIResponse> => {
    console.log('[API] Searching exercises:', query);
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (filters?.muscleGroup) params.append('muscleGroup', filters.muscleGroup);
    if (filters?.equipment) params.append('equipment', filters.equipment);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    return apiFetch(`/training/exercises?${params.toString()}`);
  },

  getExercise: async (id: number): Promise<APIResponse> => {
    console.log('[API] Fetching exercise:', id);
    return apiFetch(`/training/exercises/${id}`);
  },

  getExerciseGif: async (id: number): Promise<APIResponse> => {
    console.log('[API] Fetching exercise GIF:', id);
    return apiFetch(`/api/exercise-gifs/${id}`);
  },

  // Adjustments
  reportMissedWorkout: async (templateId: number, reason: string): Promise<APIResponse> => {
    console.log('[API] Reporting missed workout:', templateId);
    return apiFetch('/training/workout/missed', {
      method: 'POST',
      body: JSON.stringify({ workoutTemplateId: templateId, reason }),
    });
  },

  reportFailedSet: async (data: {
    trainingLogId?: number;
    exerciseId: number;
    targetReps: number;
    actualReps: number;
  }): Promise<APIResponse> => {
    console.log('[API] Reporting failed set');
    return apiFetch('/training/set/failed', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Recommendations
  getNextWeights: async (workoutTemplateId: number): Promise<APIResponse> => {
    console.log('[API] Fetching next weight recommendations:', workoutTemplateId);
    return apiFetch(`/training/next-weights?workoutTemplateId=${workoutTemplateId}`);
  },

  respondToDeload: async (deloadId: number, accepted: boolean): Promise<APIResponse> => {
    console.log('[API] Responding to deload recommendation:', { deloadId, accepted });
    return apiFetch('/training/deload/respond', {
      method: 'POST',
      body: JSON.stringify({ deloadHistoryId: deloadId, accepted }),
    });
  },
};

// ============ PHOTO LOGGING ENDPOINTS ============

export const photoLogAPI = {
  analyzePhoto: async (base64Image: string, userId: string, description?: string): Promise<APIResponse> => {
    console.log('[API] Starting photo analysis (base64)', {
      imageSize: base64Image.length,
      userId,
      hasDescription: !!description
    });

    // Send as JSON instead of FormData (more reliable with React Native)
    return apiFetch('/api/bulletproof-photos/analyze-base64', {
      method: 'POST',
      body: JSON.stringify({
        image: base64Image,
        userId,
        description,
      }),
    });
  },

  submitClarifications: async (sessionId: string, clarifications: any): Promise<APIResponse> => {
    console.log('[API] Submitting clarifications for session:', sessionId);
    return apiFetch('/api/bulletproof-photos/clarify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, clarifications }),
    });
  },

  completeSession: async (sessionId: string): Promise<APIResponse> => {
    console.log('[API] Completing photo analysis session:', sessionId);
    return apiFetch(`/api/bulletproof-photos/complete/${sessionId}`, {
      method: 'POST',
    });
  },

  getGuidance: async (): Promise<APIResponse> => {
    console.log('[API] Fetching photo logging guidance');
    return apiFetch('/api/bulletproof-photos/guidance');
  },
};

// ============ AI PREDICTIONS ENDPOINTS ============

export const predictionsAPI = {
  // Get weight prediction (AI-powered)
  getWeightPrediction: async (): Promise<APIResponse> => {
    console.log('[API] Fetching AI weight prediction');
    return apiFetch('/api/predictions/weight');
  },

  // Get deload prediction (AI-powered)
  getDeloadPrediction: async (): Promise<APIResponse> => {
    console.log('[API] Fetching AI deload prediction');
    return apiFetch('/api/predictions/deload');
  },

  // Get goal timeline prediction
  getGoalPrediction: async (): Promise<APIResponse> => {
    console.log('[API] Fetching goal timeline prediction');
    return apiFetch('/api/predictions/goal');
  },

  // Get progression recommendation for specific exercise
  getProgressionRecommendation: async (exerciseName: string): Promise<APIResponse> => {
    console.log('[API] Fetching progression recommendation for', exerciseName);
    return apiFetch(`/api/predictions/progression/${encodeURIComponent(exerciseName)}`);
  },

  // Get all predictions at once
  getAllPredictions: async (): Promise<APIResponse> => {
    console.log('[API] Fetching all AI predictions');
    return apiFetch('/api/predictions/all');
  },

  // Get prediction history
  getPredictionHistory: async (limit: number = 10): Promise<APIResponse> => {
    console.log('[API] Fetching prediction history');
    return apiFetch(`/api/predictions/history?limit=${limit}`);
  },
};

// ============ GOAL DATE VALIDATION ENDPOINT ============

export const goalDateAPI = {
  // Validate goal date in real-time
  validateGoalDate: async (data: {
    currentWeight: number;
    goalWeight: number;
    goalDate: string; // ISO date string
    goal: 'cut' | 'bulk' | 'recomp';
    bodyfat?: number;
    height_cm?: number;
  }): Promise<APIResponse<GoalDateValidationResult>> => {
    console.log('[API] Validating goal date:', data);
    return apiFetch('/api/validate-goal-date', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============ MOTIVATIONAL QUOTE ENDPOINT ============

export const quoteAPI = {
  // Get daily motivational quote (cached by date)
  getDailyQuote: async (): Promise<APIResponse<{ quote: string; author: string }>> => {
    console.log('[API] Fetching daily motivational quote');
    return apiFetch('/api/quote/daily');
  },
};

console.log('[API] Service initialized with URL:', API_URL);
