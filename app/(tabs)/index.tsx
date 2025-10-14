// Dashboard - Human-centered coaching interface
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../src/services/supabase';
import { foodLogAPI, trainingAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { DailyFoodLog, UserProfile } from '../../src/types';
import config from '../../src/config';
import { useUser } from '../../src/contexts/UserContext';
import {
  getGreeting,
  getMacroFeedback,
  getOverallFeedback,
  getStreakFeedback,
  getMealTimingFeedback,
  getRandomEncouragement,
  getSmartMacroSuggestion,
  getMicroWinCelebration,
  getTimeOfDayContext,
  getAdaptiveTargetMessage,
  CoachMessage,
} from '../../src/utils/coachFeedback';
import { getQuickLogSuggestions, getRelevantQuickLog, QuickLogSuggestion } from '../../src/utils/quickLog';
import { analyzeWeeklyProgress, WeeklyTrend } from '../../src/utils/weeklyProgress';
import { getYesterdaySummary, formatYesterdayDate, YesterdaySummary } from '../../src/utils/yesterdaySummary';
import { detectMilestones, calculateTotalMealsLogged, Milestone } from '../../src/utils/milestones';
import { getFoodSuggestions, FoodSuggestion } from '../../src/utils/foodSuggestions';
import { generate7DayCalendar, calculateCurrentStreak, getStreakMessage, CalendarDay } from '../../src/utils/streakCalendar';
import { getTimeBasedPrompt, TimeBasedPrompt } from '../../src/utils/timeBasedPrompts';
import { checkInactivity, InactivityStatus } from '../../src/utils/inactivityCheck';
import { compareMealToPlans, getMealPlanSummary, getDefaultMealPlan, MealPlanComparison } from '../../src/utils/mealPlanContext';
import { detectMealPrompt, getMissedMealMessage, MealPrompt } from '../../src/utils/mealDetection';
import { getContextualActions, QuickAction } from '../../src/utils/contextualActions';
import { HamburgerMenu } from '../../src/components/HamburgerMenu';

// Coach Message Card Component
function CoachMessageCard({ message }: { message: CoachMessage }) {
  const bgColor = message.tone === 'celebrating' ? theme.colors.encouragement + '15' :
                  message.tone === 'motivating' ? theme.colors.motivation + '15' :
                  theme.colors.coachMessage;

  const borderColor = message.tone === 'celebrating' ? theme.colors.encouragement :
                     message.tone === 'motivating' ? theme.colors.motivation :
                     theme.colors.coachAccent;

  return (
    <View style={[styles.coachCard, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.coachHeader}>
        {/* Coach Avatar */}
        <View style={styles.coachAvatar}>
          <Text style={styles.coachAvatarEmoji}>💬</Text>
        </View>
        <View style={styles.coachHeaderText}>
          <Text style={styles.coachLabel}>Your Coach</Text>
          <Text style={styles.coachEmoji}>{message.emoji}</Text>
        </View>
      </View>
      <Text style={styles.coachText}>{message.text}</Text>
    </View>
  );
}

// Circular Progress Ring Component with Pulse Animation
interface CircularProgressProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

function CircularProgress({ label, current, target, unit, color }: CircularProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Pulse animation for when percentage is high
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (percentage >= 80) {
      // Pulse animation for high completion
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [percentage]);

  return (
    <View style={styles.circularProgressContainer}>
      <Animated.View style={[styles.circularProgressWrapper, { transform: [{ scale: pulseAnim }] }]}>
        {/* Background Circle */}
        <View style={[styles.circleBackground, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: theme.colors.borderLight }]} />

        {/* Progress Circle (simulated with overlays) */}
        <View style={[styles.circleProgress, {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: percentage >= 100 ? color : `${color}80`,
          borderTopColor: color,
          borderRightColor: percentage >= 50 ? color : 'transparent',
          borderBottomColor: percentage >= 75 ? color : 'transparent',
          borderLeftColor: percentage >= 25 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }]} />

        {/* Percentage Text */}
        <View style={styles.circleTextContainer}>
          <Text style={[styles.circlePercentage, { color }]}>{Math.round(percentage)}%</Text>
        </View>
      </Animated.View>

      {/* Label and Values */}
      <Text style={styles.circleLabel}>{label}</Text>
      <Text style={styles.circleValues}>
        <Text style={[styles.circleCurrent, { color }]}>{Math.round(current)}</Text>
        <Text style={styles.circleTarget}> / {Math.round(target)}{unit}</Text>
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile: globalProfile } = useUser(); // Get profile from global context
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [yesterdayLog, setYesterdayLog] = useState<DailyFoodLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyFoodLog[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [daysLogged, setDaysLogged] = useState(0);
  const [quickLogSuggestion, setQuickLogSuggestion] = useState<QuickLogSuggestion | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend | null>(null);
  const [yesterdaySummary, setYesterdaySummary] = useState<YesterdaySummary | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [foodSuggestions, setFoodSuggestions] = useState<FoodSuggestion[]>([]);
  const [streakCalendar, setStreakCalendar] = useState<CalendarDay[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [mealPrompt, setMealPrompt] = useState<MealPrompt | null>(null);
  const [contextualActions, setContextualActions] = useState<QuickAction[]>([]);
  const [showTargetExplanation, setShowTargetExplanation] = useState(false);
  const [inactivityStatus, setInactivityStatus] = useState<InactivityStatus | null>(null);
  const [mealPlanComparisons, setMealPlanComparisons] = useState<MealPlanComparison[]>([]);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [trainingStreak, setTrainingStreak] = useState<number>(0);

  useEffect(() => {
    loadData();
    checkIfShouldShowTargetExplanation();
  }, []);

  // Refresh when screen comes into focus (after logging food on other tabs)
  useFocusEffect(
    useCallback(() => {
      console.log('[DASHBOARD] Screen focused - refreshing data');
      fetchTodayLog();
    }, [])
  );

  const checkIfShouldShowTargetExplanation = async () => {
    try {
      // Check if user has seen the explanation before
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('seen_target_explanation')
        .eq('id', user.id)
        .single();

      if (data && !data.seen_target_explanation) {
        // First time - show explanation after 2 seconds
        setTimeout(() => setShowTargetExplanation(true), 2000);
      }
    } catch (error) {
      console.error('[DASHBOARD] Error checking target explanation:', error);
    }
  };

  const markTargetExplanationSeen = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_profiles')
        .update({ seen_target_explanation: true })
        .eq('id', user.id);

      setShowTargetExplanation(false);
    } catch (error) {
      console.error('[DASHBOARD] Error marking explanation seen:', error);
    }
  };

  // Sync global profile to local state
  useEffect(() => {
    if (globalProfile) {
      setProfile(globalProfile);
    }
  }, [globalProfile]);

  const loadData = async () => {
    try {
      await Promise.all([fetchProfile(), fetchTodayLog(), fetchWeekLogs(), fetchRecipes(), fetchTrainingData()]);
    } catch (error) {
      console.error('[DASHBOARD] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update contextual actions when relevant state changes
  useEffect(() => {
    if (!loading && (todayLog || currentStreak >= 0)) {
      const actions = getContextualActions(todayLog, currentStreak);
      setContextualActions(actions);
    }
  }, [loading, todayLog, currentStreak]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('[DASHBOARD] Fetch profile exception:', error);
    }
  };

  const fetchTodayLog = async () => {
    try {
      const response = await foodLogAPI.getToday();
      console.log('[DASHBOARD] Today log response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('[DASHBOARD] Today log targets:', response.data.targets);
        console.log('[DASHBOARD] Calorie target value:', response.data.targets?.calories);
        setTodayLog(response.data);

        // Generate food suggestions based on macro deficits
        const suggestions = getFoodSuggestions(response.data);
        setFoodSuggestions(suggestions);

        // Compare to meal plan
        const mealPlan = getDefaultMealPlan(response.data.targets);
        const comparisons = compareMealToPlans(response.data, mealPlan);
        setMealPlanComparisons(comparisons);

        // Detect if we should prompt for a meal
        const prompt = detectMealPrompt(response.data);
        setMealPrompt(prompt);
      }
    } catch (error) {
      console.error('[DASHBOARD] Fetch log exception:', error);
    }
  };

  const fetchWeekLogs = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data && Array.isArray(response.data)) {
        setWeekLogs(response.data);

        // Find yesterday's log for adaptive target detection and summary
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const foundYesterday = response.data.find(log => log.date === yesterdayStr);
        if (foundYesterday) {
          setYesterdayLog(foundYesterday);

          // Generate yesterday's summary
          const summary = getYesterdaySummary(foundYesterday);
          setYesterdaySummary(summary);
        }

        // Analyze for quick log suggestions
        const suggestions = getQuickLogSuggestions(response.data);
        const relevant = getRelevantQuickLog(suggestions);
        setQuickLogSuggestion(relevant);

        // Analyze weekly progress trend
        const trend = analyzeWeeklyProgress(response.data);
        setWeeklyTrend(trend);

        // Generate 7-day streak calendar
        const calendar = generate7DayCalendar(response.data);
        setStreakCalendar(calendar);
        const streak = calculateCurrentStreak(calendar);
        setCurrentStreak(streak);

        // Calculate total meals and detect milestones
        const totalMeals = calculateTotalMealsLogged(response.data);
        const detectedMilestones = detectMilestones(todayLog, response.data, totalMeals, streak);
        setMilestones(detectedMilestones);

        // Check for inactivity (must happen after todayLog is loaded)
        const inactivity = checkInactivity(todayLog, response.data);
        setInactivityStatus(inactivity);
      } else {
        // If no data or invalid structure, set empty array
        console.log('[DASHBOARD] No week logs data available');
        setWeekLogs([]);
      }
    } catch (error) {
      console.error('[DASHBOARD] Fetch week logs exception:', error);
      setWeekLogs([]); // Set empty array on error
    }
  };

  const fetchRecipes = async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/supabase-recipes`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.data) {
        setRecipes(data.data); // Show all recipes in horizontal scroll
      }
    } catch (error) {
      console.log('[DASHBOARD] Recipes not available');
    }
  };

  const fetchTrainingData = async () => {
    try {
      // Fetch current training plan
      const planResponse = await trainingAPI.getCurrentPlan();
      if (planResponse.success && planResponse.data) {
        setTrainingPlan(planResponse.data.plan);
      }

      // Fetch today's workout
      const workoutResponse = await trainingAPI.getTodayWorkout();
      if (workoutResponse.success && workoutResponse.data) {
        setTodayWorkout(workoutResponse.data);
      }

      // Calculate training streak (placeholder - can be enhanced)
      // For now, just set to 0
      setTrainingStreak(0);
    } catch (error) {
      console.log('[DASHBOARD] Training data not available');
    }
  };

  const handleQuickLog = async (suggestion: QuickLogSuggestion) => {
    try {
      console.log('[DASHBOARD] Quick logging:', suggestion.food_name);

      await foodLogAPI.createEntry({
        food_name: suggestion.food_name,
        meal_type: suggestion.meal_type,
        serving_size: 1,
        serving_unit: 'serving',
        calories: suggestion.avgCalories,
        protein: suggestion.avgProtein,
        carbs: suggestion.avgCarbs,
        fat: suggestion.avgFat,
      });

      console.log('[DASHBOARD] Quick log success');
      // Refresh today's log to show the new entry
      await fetchTodayLog();
      setQuickLogSuggestion(null); // Hide suggestion after logging
    } catch (error) {
      console.error('[DASHBOARD] Quick log error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </View>
    );
  }

  const overallFeedback = getOverallFeedback(todayLog, profile);
  const streakFeedback = getStreakFeedback(daysLogged);
  const microWinCelebration = getMicroWinCelebration(todayLog);
  const timeOfDayContext = getTimeOfDayContext(todayLog, profile);
  const randomEncouragement = getRandomEncouragement();
  const timeBasedPrompt = getTimeBasedPrompt(todayLog, profile);

  // Get last meal time for timing feedback
  const lastMealTime = todayLog?.entries?.length
    ? new Date(todayLog.entries[todayLog.entries.length - 1].logged_at)
    : null;
  const mealTimingFeedback = getMealTimingFeedback(lastMealTime, profile?.meals_per_day || 3);

  // Get smart macro suggestions when off-target
  const proteinSuggestion = todayLog
    ? getSmartMacroSuggestion(todayLog.totals.protein, todayLog.targets.protein, 'protein')
    : null;
  const carbsSuggestion = todayLog
    ? getSmartMacroSuggestion(todayLog.totals.carbs, todayLog.targets.carbs, 'carbs')
    : null;
  const fatSuggestion = todayLog
    ? getSmartMacroSuggestion(todayLog.totals.fat, todayLog.targets.fat, 'fat')
    : null;
  const caloriesSuggestion = todayLog
    ? getSmartMacroSuggestion(todayLog.totals.calories, todayLog.targets.calories, 'calories')
    : null;

  // Check for adaptive target adjustments
  const adaptiveTargetMessage = getAdaptiveTargetMessage(todayLog, yesterdayLog);

  const userName = profile?.fullName?.split(' ')[0] || 'Champion';

  // Detect first-time user (no entries ever logged)
  const isFirstTimeUser = !weekLogs || weekLogs.length === 0 || weekLogs.every(log => !log.entries || log.entries.length === 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      {/* ==================== HERO SECTION ==================== */}
      <View style={styles.header}>
        <HamburgerMenu style={styles.menuButton} />
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}, {userName}! 👋</Text>
          <Text style={styles.subGreeting}>
            {isFirstTimeUser ? "Welcome to your coaching journey!" : "Let's make today count"}
          </Text>
        </View>
      </View>

      {/* Sunday Check-In Banner */}
      {!isFirstTimeUser && new Date().getDay() === 0 && (
        <TouchableOpacity
          style={styles.sundayBanner}
          onPress={() => router.push('/weekly-checkin')}
          activeOpacity={0.9}
        >
          <View style={styles.sundayBannerGlow} />
          <View style={styles.sundayBannerContent}>
            <Text style={styles.sundayBannerEmoji}>📸</Text>
            <View style={styles.sundayBannerText}>
              <Text style={styles.sundayBannerTitle}>It's Check-In Sunday!</Text>
              <Text style={styles.sundayBannerSubtitle}>Time to track your progress and update your targets</Text>
            </View>
            <Text style={styles.sundayBannerArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* First-Time User Onboarding */}
      {isFirstTimeUser && (
        <View style={styles.onboardingCard}>
          <Text style={styles.onboardingEmoji}>🌟</Text>
          <Text style={styles.onboardingTitle}>Let's Get Started Together!</Text>
          <Text style={styles.onboardingText}>
            I'm your personal nutrition coach, and I'm here to help you reach your goals. Here's how we'll work together:
          </Text>
          <View style={styles.onboardingSteps}>
            <View style={styles.onboardingStep}>
              <Text style={styles.stepNumber}>1️⃣</Text>
              <Text style={styles.stepText}>Log your meals throughout the day</Text>
            </View>
            <View style={styles.onboardingStep}>
              <Text style={styles.stepNumber}>2️⃣</Text>
              <Text style={styles.stepText}>I'll analyze your progress and adapt your plan</Text>
            </View>
            <View style={styles.onboardingStep}>
              <Text style={styles.stepNumber}>3️⃣</Text>
              <Text style={styles.stepText}>Stay consistent and watch your transformation!</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={() => router.push('/(tabs)/food-log')}
          >
            <Text style={styles.onboardingButtonText}>Log Your First Meal! 🚀</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ==================== TODAY'S FOCUS ==================== */}
      {!isFirstTimeUser && (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderEmoji}>🎯</Text>
          <Text style={styles.sectionHeaderTitle}>Today's Focus</Text>
        </View>
      )}

      {/* Today's Macro Targets */}
      {!isFirstTimeUser && todayLog && todayLog.targets && (
        <View style={styles.macroTargetsCard}>
          <View style={styles.macroTargetsHeader}>
            <Text style={styles.macroTargetsTitle}>🎯 Today's Targets</Text>
          </View>
          <View style={styles.macroTargetsGrid}>
            <View style={styles.macroTargetItem}>
              <Text style={styles.macroTargetLabel}>Calories</Text>
              <Text style={[styles.macroTargetValue, { color: theme.colors.calories }]}>
                {Math.round(todayLog.totals.calories || 0)}
              </Text>
              <Text style={styles.macroTargetTarget}>
                / {todayLog.targets.calories ? Math.round(todayLog.targets.calories) : '---'}
              </Text>
            </View>
            <View style={styles.macroTargetItem}>
              <Text style={styles.macroTargetLabel}>Protein</Text>
              <Text style={[styles.macroTargetValue, { color: theme.colors.protein }]}>
                {Math.round(todayLog.totals.protein || 0)}g
              </Text>
              <Text style={styles.macroTargetTarget}>
                / {todayLog.targets.protein ? Math.round(todayLog.targets.protein) : '---'}g
              </Text>
            </View>
            <View style={styles.macroTargetItem}>
              <Text style={styles.macroTargetLabel}>Carbs</Text>
              <Text style={[styles.macroTargetValue, { color: theme.colors.carbs }]}>
                {Math.round(todayLog.totals.carbs || 0)}g
              </Text>
              <Text style={styles.macroTargetTarget}>
                / {todayLog.targets.carbs ? Math.round(todayLog.targets.carbs) : '---'}g
              </Text>
            </View>
            <View style={styles.macroTargetItem}>
              <Text style={styles.macroTargetLabel}>Fat</Text>
              <Text style={[styles.macroTargetValue, { color: theme.colors.fat }]}>
                {Math.round(todayLog.totals.fat || 0)}g
              </Text>
              <Text style={styles.macroTargetTarget}>
                / {todayLog.targets.fat ? Math.round(todayLog.targets.fat) : '---'}g
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Today's Progress Rings */}
      {!isFirstTimeUser && todayLog && (
        <View style={styles.section}>
          <View style={styles.circularProgressGrid}>
            <CircularProgress
              label="Calories"
              current={todayLog.totals.calories}
              target={todayLog.targets.calories}
              unit=""
              color={theme.colors.calories}
            />
            <CircularProgress
              label="Protein"
              current={todayLog.totals.protein}
              target={todayLog.targets.protein}
              unit="g"
              color={theme.colors.protein}
            />
            <CircularProgress
              label="Carbs"
              current={todayLog.totals.carbs}
              target={todayLog.targets.carbs}
              unit="g"
              color={theme.colors.carbs}
            />
            <CircularProgress
              label="Fat"
              current={todayLog.totals.fat}
              target={todayLog.targets.fat}
              unit="g"
              color={theme.colors.fat}
            />
          </View>
        </View>
      )}

      {/* Quick Actions */}
      {!isFirstTimeUser && contextualActions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            {contextualActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={() => router.push(action.route as any)}
              >
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                {action.reason && (
                  <Text style={styles.actionReason}>{action.reason}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ==================== TRAINING ==================== */}
      {!isFirstTimeUser && trainingPlan && (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderEmoji}>💪</Text>
          <Text style={styles.sectionHeaderTitle}>Training</Text>
        </View>
      )}

      {/* Today's Workout Card */}
      {!isFirstTimeUser && trainingPlan && todayWorkout && (
        <TouchableOpacity
          style={styles.trainingWorkoutCard}
          onPress={() => router.push('/workout-logger')}
          activeOpacity={0.9}
        >
          <View style={styles.trainingWorkoutHeader}>
            <Text style={styles.trainingWorkoutEmoji}>🏋️</Text>
            <View style={styles.trainingWorkoutInfo}>
              <Text style={styles.trainingWorkoutLabel}>Today's Workout</Text>
              <Text style={styles.trainingWorkoutName}>{todayWorkout.workout_name}</Text>
              <Text style={styles.trainingWorkoutMeta}>
                {todayWorkout.total_exercises} exercises • ~{todayWorkout.estimated_duration_minutes} min
              </Text>
            </View>
            <Text style={styles.trainingWorkoutArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* No Workout Today (Rest Day) */}
      {!isFirstTimeUser && trainingPlan && !todayWorkout && (
        <View style={styles.trainingRestCard}>
          <Text style={styles.trainingRestEmoji}>😌</Text>
          <Text style={styles.trainingRestText}>Rest Day</Text>
          <Text style={styles.trainingRestSubtext}>Recovery is part of the plan!</Text>
        </View>
      )}

      {/* Training Quick Link */}
      {!isFirstTimeUser && trainingPlan && (
        <TouchableOpacity
          style={styles.trainingViewLink}
          onPress={() => router.push('/(tabs)/training')}
        >
          <Text style={styles.trainingViewLinkText}>View Full Training Plan →</Text>
        </TouchableOpacity>
      )}

      {/* ==================== COACH CORNER ==================== */}
      {!isFirstTimeUser && (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderEmoji}>💬</Text>
          <Text style={styles.sectionHeaderTitle}>Coach Corner</Text>
        </View>
      )}

      {/* Weekly Target Adjustment Notification */}
      {!isFirstTimeUser && todayLog && todayLog.adjustmentMessage && (
        <View style={styles.adjustmentCard}>
          <View style={styles.adjustmentHeader}>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarEmoji}>📊</Text>
            </View>
            <Text style={styles.adjustmentTitle}>Weekly Adjustment</Text>
          </View>
          <Text style={styles.adjustmentMessage}>{todayLog.adjustmentMessage}</Text>
        </View>
      )}

      {/* Overall Coach Feedback Card */}
      {!isFirstTimeUser && <CoachMessageCard message={overallFeedback} />}

      {/* Adaptive Target Adjustment Notification */}
      {adaptiveTargetMessage && <CoachMessageCard message={adaptiveTargetMessage} />}

      {/* Inactivity Check-In */}
      {!isFirstTimeUser && inactivityStatus?.shouldShowCheckIn && (
        <View style={styles.inactivityCheckIn}>
          <View style={styles.coachAvatar}>
            <Text style={styles.coachAvatarEmoji}>💬</Text>
          </View>
          <View style={styles.inactivityContent}>
            <Text style={styles.inactivityTitle}>Check-In Time 💙</Text>
            <Text style={styles.inactivityMessage}>{inactivityStatus.message}</Text>
            <TouchableOpacity
              style={styles.inactivityButton}
              onPress={() => router.push('/(tabs)/coach')}
            >
              <Text style={styles.inactivityButtonText}>Let's Talk 💬</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Micro-Win Celebrations */}
      {microWinCelebration && <CoachMessageCard message={microWinCelebration} />}

      {/* Time-of-Day Contextual Guidance */}
      {timeOfDayContext && <CoachMessageCard message={timeOfDayContext} />}

      {/* Meal Timing Reminder */}
      {mealTimingFeedback && <CoachMessageCard message={mealTimingFeedback} />}

      {/* Time-Based Proactive Prompts */}
      {timeBasedPrompt && (
        <View style={styles.timeBasedPromptCard}>
          <Text style={styles.timeBasedPromptEmoji}>{timeBasedPrompt.emoji}</Text>
          <Text style={styles.timeBasedPromptMessage}>{timeBasedPrompt.message}</Text>
          {timeBasedPrompt.actionText && timeBasedPrompt.actionRoute && (
            <TouchableOpacity
              style={styles.timeBasedPromptButton}
              onPress={() => router.push(timeBasedPrompt.actionRoute as any)}
            >
              <Text style={styles.timeBasedPromptButtonText}>{timeBasedPrompt.actionText}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Smart Macro Suggestions */}
      {(proteinSuggestion || carbsSuggestion || fatSuggestion || caloriesSuggestion) && (
        <View style={styles.coachSubsection}>
          {proteinSuggestion && <CoachMessageCard message={proteinSuggestion} />}
          {carbsSuggestion && <CoachMessageCard message={carbsSuggestion} />}
          {fatSuggestion && <CoachMessageCard message={fatSuggestion} />}
          {caloriesSuggestion && <CoachMessageCard message={caloriesSuggestion} />}
        </View>
      )}

      {/* Smart Meal Prompt */}
      {mealPrompt && mealPrompt.shouldPrompt && mealPrompt.confidence !== 'low' && (
        <TouchableOpacity
          style={styles.mealPromptCard}
          onPress={() => router.push(`/food-search?mealType=${mealPrompt.mealType}`)}
        >
          <Text style={styles.mealPromptEmoji}>{mealPrompt.emoji}</Text>
          <View style={styles.mealPromptContent}>
            <Text style={styles.mealPromptMessage}>{mealPrompt.message}</Text>
            <Text style={styles.mealPromptAction}>Tap to log {mealPrompt.mealType} →</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Missed Meal Warning */}
      {getMissedMealMessage(todayLog) && (
        <View style={styles.missedMealCard}>
          <Text style={styles.missedMealIcon}>⏰</Text>
          <Text style={styles.missedMealText}>{getMissedMealMessage(todayLog)}</Text>
        </View>
      )}

      {/* ==================== PROGRESS & STREAKS ==================== */}
      {!isFirstTimeUser && (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderEmoji}>📈</Text>
          <Text style={styles.sectionHeaderTitle}>Progress & Streaks</Text>
        </View>
      )}

      {/* Streak Celebration */}
      {streakFeedback && <CoachMessageCard message={streakFeedback} />}

      {/* 7-Day Streak Calendar */}
      {streakCalendar.length > 0 && !isFirstTimeUser && (
        <View style={styles.streakCalendarCard}>
          <View style={styles.streakCalendarHeader}>
            <Text style={styles.streakCalendarTitle}>Your 7-Day Streak</Text>
            <Text style={styles.streakCount}>{currentStreak} 🔥</Text>
          </View>
          <View style={styles.calendarGrid}>
            {streakCalendar.map((day, index) => (
              <View key={index} style={styles.calendarDayContainer}>
                <Text style={styles.calendarDayLabel}>{day.dayOfWeek}</Text>
                <View style={[
                  styles.calendarDay,
                  day.hasEntries && styles.calendarDayLogged,
                  day.isToday && styles.calendarDayToday,
                  !day.hasEntries && styles.calendarDayEmpty,
                ]}>
                  <Text style={[
                    styles.calendarDayNumber,
                    day.hasEntries && styles.calendarDayNumberLogged,
                    day.isToday && styles.calendarDayNumberToday,
                  ]}>
                    {day.hasEntries ? '✓' : day.dayNumber}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.streakMessage}>{getStreakMessage(currentStreak, streakCalendar)}</Text>
        </View>
      )}

      {/* Weekly Progress Trend */}
      {weeklyTrend && (
        <View style={styles.weeklyProgressCard}>
          <View style={styles.weeklyProgressHeader}>
            <Text style={styles.weeklyProgressEmoji}>{weeklyTrend.emoji}</Text>
            <Text style={styles.weeklyProgressTitle}>This Week's Progress</Text>
          </View>

          {/* Days Logged Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${weeklyTrend.adherenceRate}%` }
                ]}
              />
            </View>
            <Text style={styles.progressBarText}>
              {weeklyTrend.daysLogged}/{weeklyTrend.totalDays} days logged
            </Text>
          </View>

          {/* Coach Analysis */}
          <Text style={styles.weeklyProgressMessage}>{weeklyTrend.coachMessage}</Text>

          {/* Best Day Badge */}
          {weeklyTrend.bestDay && (
            <View style={styles.bestDayBadge}>
              <Text style={styles.bestDayLabel}>Best Day: {weeklyTrend.bestDay.date.split('-')[2]}</Text>
              <Text style={styles.bestDayValue}>{Math.round(weeklyTrend.bestDay.adherence)}% adherence 🏆</Text>
            </View>
          )}

          {/* Weekly Summary Link */}
          <TouchableOpacity
            style={styles.weeklySummaryLink}
            onPress={() => router.push('/weekly-summary')}
          >
            <Text style={styles.weeklySummaryLinkText}>📊 View Full Weekly Summary →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Milestone Achievements */}
      {milestones.map(milestone => (
        <View key={milestone.id} style={styles.milestoneCard}>
          <Text style={styles.milestoneEmoji}>{milestone.emoji}</Text>
          <Text style={styles.milestoneTitle}>{milestone.title}</Text>
          <Text style={styles.milestoneDescription}>{milestone.description}</Text>
        </View>
      ))}

      {/* Yesterday's Summary */}
      {yesterdaySummary && !isFirstTimeUser && (
        <View style={styles.yesterdayCard}>
          <View style={styles.yesterdayHeader}>
            <Text style={styles.yesterdayEmoji}>{yesterdaySummary.emoji}</Text>
            <Text style={styles.yesterdayTitle}>How Yesterday Went</Text>
          </View>
          <Text style={styles.yesterdayMessage}>{yesterdaySummary.message}</Text>
          <View style={styles.yesterdayHighlight}>
            <Text style={styles.yesterdayHighlightText}>{yesterdaySummary.highlight}</Text>
          </View>
        </View>
      )}

      {/* ==================== MEAL PLANNING ==================== */}
      {!isFirstTimeUser && (foodSuggestions.length > 0 || quickLogSuggestion || mealPlanComparisons.length > 0 || recipes.length > 0) && (
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeaderEmoji}>🍽️</Text>
          <Text style={styles.sectionHeaderTitle}>Meal Planning</Text>
        </View>
      )}

      {/* Quick Log Suggestion */}
      {quickLogSuggestion && (
        <View style={styles.quickLogCard}>
          <View style={styles.quickLogHeader}>
            <Text style={styles.quickLogEmoji}>⚡</Text>
            <Text style={styles.quickLogTitle}>Quick Log</Text>
          </View>
          <Text style={styles.quickLogSubtitle}>
            I noticed you love this meal! Want to log it again?
          </Text>
          <View style={styles.quickLogContent}>
            <View style={styles.quickLogInfo}>
              <Text style={styles.quickLogFood}>{quickLogSuggestion.food_name}</Text>
              <Text style={styles.quickLogMeta}>
                Logged {quickLogSuggestion.count}x this week • {Math.round(quickLogSuggestion.avgCalories)} cal
              </Text>
            </View>
            <TouchableOpacity style={styles.quickLogButton} onPress={() => handleQuickLog(quickLogSuggestion)}>
              <Text style={styles.quickLogButtonText}>Log It! 🎯</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Smart Food Suggestions */}
      {foodSuggestions.length > 0 && (
        <View style={styles.section}>
          {foodSuggestions.map((suggestion, index) => (
            <View key={index} style={styles.foodSuggestionCard}>
              <Text style={styles.foodSuggestionEmoji}>{suggestion.emoji}</Text>
              <View style={styles.foodSuggestionContent}>
                <Text style={styles.foodSuggestionName}>{suggestion.foodName}</Text>
                <Text style={styles.foodSuggestionReason}>{suggestion.reason}</Text>
                <Text style={styles.foodSuggestionAmount}>{suggestion.amount}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Meal Plan Comparison */}
      {!isFirstTimeUser && mealPlanComparisons.length > 0 && (() => {
        const summary = getMealPlanSummary(mealPlanComparisons);
        const relevantComparisons = mealPlanComparisons.filter(c => c.planned !== null || c.actual !== null);

        return relevantComparisons.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Meal Plan Progress</Text>
            <View style={styles.mealPlanSummary}>
              <Text style={styles.mealPlanSummaryEmoji}>{summary.overallEmoji}</Text>
              <Text style={styles.mealPlanSummaryText}>{summary.overallMessage}</Text>
            </View>

            {relevantComparisons.map((comparison, index) => {
              if (comparison.status === 'not_planned' && !comparison.actual) return null;

              return (
                <View key={index} style={styles.mealPlanCard}>
                  <View style={styles.mealPlanHeader}>
                    <Text style={styles.mealPlanMealType}>
                      {comparison.mealType.charAt(0).toUpperCase() + comparison.mealType.slice(1)}
                    </Text>
                    <Text style={styles.mealPlanStatus}>{comparison.emoji}</Text>
                  </View>
                  <Text style={styles.mealPlanMessage}>{comparison.message}</Text>

                  {comparison.planned && comparison.actual && (
                    <View style={styles.mealPlanComparison}>
                      <View style={styles.mealPlanColumn}>
                        <Text style={styles.mealPlanColumnLabel}>Planned</Text>
                        <Text style={styles.mealPlanColumnValue}>{Math.round(comparison.planned.calories)} cal</Text>
                      </View>
                      <View style={styles.mealPlanColumn}>
                        <Text style={styles.mealPlanColumnLabel}>Actual</Text>
                        <Text style={styles.mealPlanColumnValue}>{Math.round(comparison.actual.calories)} cal</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : null;
      })()}

      {/* Recommended Recipes */}
      {recipes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Coach's recipe picks for you</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recipesScroll}>
            {recipes.map((recipe, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recipeCard}
                onPress={() => router.push(`/recipe-detail?id=${recipe.id}&slug=${recipe.slug}`)}
              >
                {recipe.image && (
                  <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                )}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
                  <View style={styles.recipeMacros}>
                    <Text style={styles.recipeCalories}>{Math.round(recipe.calories)} cal</Text>
                    <Text style={styles.recipeMacro}>P: {Math.round(recipe.protein)}g</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ==================== MOTIVATION ==================== */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeaderEmoji}>✨</Text>
        <Text style={styles.sectionHeaderTitle}>Daily Motivation</Text>
      </View>

      {/* Daily Encouragement */}
      <View style={styles.encouragementCard}>
        <Text style={styles.encouragementEmoji}>{randomEncouragement.emoji}</Text>
        <Text style={styles.encouragementText}>{randomEncouragement.text}</Text>
      </View>

      <View style={{ height: 40 }} />

      {/* Macro Target Explanation Modal */}
      <Modal
        visible={showTargetExplanation && todayLog !== null}
        transparent
        animationType="fade"
        onRequestClose={markTargetExplanationSeen}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>🎯</Text>
            <Text style={styles.modalTitle}>Your Personalized Targets</Text>
            <Text style={styles.modalText}>
              I've set your daily targets based on your goals and profile:
            </Text>

            {todayLog && (
              <View style={styles.targetsList}>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>🔥 Calories:</Text>
                  <Text style={styles.targetValue}>{Math.round(todayLog.targets.calories)} kcal</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>💪 Protein:</Text>
                  <Text style={styles.targetValue}>{Math.round(todayLog.targets.protein)}g</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>🍞 Carbs:</Text>
                  <Text style={styles.targetValue}>{Math.round(todayLog.targets.carbs)}g</Text>
                </View>
                <View style={styles.targetItem}>
                  <Text style={styles.targetLabel}>🥑 Fat:</Text>
                  <Text style={styles.targetValue}>{Math.round(todayLog.targets.fat)}g</Text>
                </View>
              </View>
            )}

            <Text style={styles.modalFooter}>
              These targets are designed to help you reach your goals sustainably. I'll adapt them as we learn what works best for you! 💪
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={markTargetExplanationSeen}
            >
              <Text style={styles.modalButtonText}>Got It! Let's Go 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.xl,
    paddingTop: 60,
    gap: theme.spacing.md,
  },
  menuButton: {
    marginTop: 4,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subGreeting: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  coachCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    ...theme.shadows.md,
  },
  mealPromptCard: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mealPromptEmoji: {
    fontSize: 48,
  },
  mealPromptContent: {
    flex: 1,
  },
  mealPromptMessage: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  mealPromptAction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  missedMealCard: {
    backgroundColor: theme.colors.warning + '15',
    borderWidth: 2,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  missedMealIcon: {
    fontSize: 32,
  },
  missedMealText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
    ...theme.shadows.sm,
  },
  coachAvatarEmoji: {
    fontSize: 24,
  },
  coachHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachEmoji: {
    fontSize: 20,
  },
  coachLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.coachAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    lineHeight: 24,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  circularProgressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    width: '45%',
  },
  circularProgressWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  circleBackground: {
    position: 'absolute',
  },
  circleProgress: {
    position: 'relative',
  },
  circleTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlePercentage: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  circleLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  circleValues: {
    fontSize: theme.fontSize.sm,
  },
  circleCurrent: {
    fontWeight: theme.fontWeight.bold,
  },
  circleTarget: {
    color: theme.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  actionReason: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  encouragementCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primaryLight + '20',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    alignItems: 'center',
  },
  encouragementEmoji: {
    fontSize: 28,
    marginBottom: theme.spacing.sm,
  },
  encouragementText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recipesScroll: {
    marginTop: theme.spacing.md,
  },
  recipeCard: {
    width: 200,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.borderLight,
  },
  recipeInfo: {
    padding: theme.spacing.md,
  },
  recipeTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipeMacros: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  recipeCalories: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.calories,
    fontWeight: theme.fontWeight.medium,
  },
  recipeMacro: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  quickLogCard: {
    backgroundColor: theme.colors.encouragement + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  quickLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  quickLogEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  quickLogTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  quickLogSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  quickLogContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickLogInfo: {
    flex: 1,
  },
  quickLogFood: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  quickLogMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  quickLogButton: {
    backgroundColor: theme.colors.encouragement,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  quickLogButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  weeklyProgressCard: {
    backgroundColor: theme.colors.motivation + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.motivation,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  weeklyProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  weeklyProgressEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  weeklyProgressTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  progressBarContainer: {
    marginBottom: theme.spacing.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.motivation,
    borderRadius: theme.borderRadius.md,
  },
  progressBarText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  weeklyProgressMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  bestDayBadge: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.motivation,
    marginTop: theme.spacing.sm,
  },
  bestDayLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  bestDayValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.motivation,
    fontWeight: theme.fontWeight.bold,
  },
  onboardingCard: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  onboardingEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  onboardingTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  onboardingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  onboardingSteps: {
    marginBottom: theme.spacing.lg,
  },
  onboardingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  stepNumber: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  stepText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
    paddingTop: 4,
  },
  onboardingButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  onboardingButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  yesterdayCard: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  yesterdayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  yesterdayEmoji: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  yesterdayTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  yesterdayMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  yesterdayHighlight: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  yesterdayHighlightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.secondary,
    fontWeight: theme.fontWeight.semibold,
  },
  milestoneCard: {
    backgroundColor: theme.colors.encouragement + '20',
    borderWidth: 2,
    borderColor: theme.colors.encouragement,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  milestoneEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  milestoneTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  milestoneDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  foodSuggestionCard: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  foodSuggestionEmoji: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  foodSuggestionContent: {
    flex: 1,
  },
  foodSuggestionName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  foodSuggestionReason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  foodSuggestionAmount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  streakCalendarCard: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  streakCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  streakCalendarTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  streakCount: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.encouragement,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  calendarDayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarDayLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.fontWeight.medium,
  },
  calendarDay: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
  },
  calendarDayLogged: {
    backgroundColor: theme.colors.encouragement + '20',
    borderColor: theme.colors.encouragement,
  },
  calendarDayToday: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  calendarDayEmpty: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.borderLight,
  },
  calendarDayNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  calendarDayNumberLogged: {
    color: theme.colors.encouragement,
    fontSize: theme.fontSize.lg,
  },
  calendarDayNumberToday: {
    color: theme.colors.primary,
  },
  streakMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeBasedPromptCard: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  timeBasedPromptEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  timeBasedPromptMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  timeBasedPromptButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  timeBasedPromptButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  modalEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  modalText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  targetsList: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  targetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  targetLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  targetValue: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  modalFooter: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  modalButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  inactivityCheckIn: {
    backgroundColor: theme.colors.motivation + '15',
    borderWidth: 2,
    borderColor: theme.colors.motivation,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...theme.shadows.md,
  },
  inactivityContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  inactivityTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inactivityMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  inactivityButton: {
    backgroundColor: theme.colors.motivation,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    ...theme.shadows.sm,
  },
  inactivityButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  mealPlanSummary: {
    backgroundColor: theme.colors.secondary + '15',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  mealPlanSummaryEmoji: {
    fontSize: 36,
    marginBottom: theme.spacing.sm,
  },
  mealPlanSummaryText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  mealPlanCard: {
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.secondary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  mealPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mealPlanMealType: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  mealPlanStatus: {
    fontSize: 24,
  },
  mealPlanMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  mealPlanComparison: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  mealPlanColumn: {
    flex: 1,
    alignItems: 'center',
  },
  mealPlanColumnLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  mealPlanColumnValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.secondary,
  },
  weeklySummaryLink: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  weeklySummaryLinkText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  macroTargetsCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
    ...theme.shadows.md,
  },
  macroTargetsHeader: {
    marginBottom: theme.spacing.md,
  },
  macroTargetsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  macroTargetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  macroTargetItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  macroTargetLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    fontWeight: theme.fontWeight.semibold,
  },
  macroTargetValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
  },
  macroTargetTarget: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  adjustmentCard: {
    backgroundColor: theme.colors.encouragement + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  adjustmentTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  adjustmentMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  sundayBanner: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.neon,
  },
  sundayBannerGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 150,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
    borderRadius: 200,
  },
  sundayBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sundayBannerEmoji: {
    fontSize: 48,
  },
  sundayBannerText: {
    flex: 1,
  },
  sundayBannerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  sundayBannerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 18,
  },
  sundayBannerArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary + '40',
  },
  sectionHeaderEmoji: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  coachSubsection: {
    marginHorizontal: theme.spacing.xl,
  },
  // Training Section Styles
  trainingWorkoutCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.secondary + '20',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  trainingWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainingWorkoutEmoji: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  trainingWorkoutInfo: {
    flex: 1,
  },
  trainingWorkoutLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  trainingWorkoutName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  trainingWorkoutMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  trainingWorkoutArrow: {
    fontSize: 28,
    color: theme.colors.secondary,
    fontWeight: theme.fontWeight.bold,
  },
  trainingRestCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  trainingRestEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  trainingRestText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  trainingRestSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  trainingViewLink: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  trainingViewLinkText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
});
