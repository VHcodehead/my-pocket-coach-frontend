// Home - Simplified Dashboard
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../src/services/supabase';
import { foodLogAPI, trainingAPI, quoteAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyFoodLog, UserProfile } from '../../src/types';
import { useUser } from '../../src/contexts/UserContext';
import { getGreeting } from '../../src/utils/coachFeedback';
import { generate7DayCalendar, calculateCurrentStreak, CalendarDay } from '../../src/utils/streakCalendar';
import { getContextualActions, QuickAction } from '../../src/utils/contextualActions';

// Import SVG icons
import FireIcon from '../../assets/icons/fire-icon.svg';
import HistoryIcon from '../../assets/icons/history-icon.svg';
import TodaysWorkoutIcon from '../../assets/icons/todays-workout-icon.svg';
import ClipboardIcon from '../../assets/icons/clipboard-icon.svg';
import CameraIcon from '../../assets/icons/camera-icon.svg';
import FutureProgressIcon from '../../assets/icons/future-progress-icon.svg';
import MoodIcon from '../../assets/icons/mood-icon.svg';
import NutritionIcon from '../../assets/icons/nutrition-icon.svg';
import WaterDropletIcon from '../../assets/icons/water-droplet-icon.svg';
import ScanIcon from '../../assets/icons/scan-icon.svg';
import CoachIcon from '../../assets/icons/coach-icon.svg';
import LightBulbIcon from '../../assets/icons/light-bulb-icon.svg';
import BicepIcon from '../../assets/icons/bicep-icon.svg';

export default function HomeScreen() {
  const router = useRouter();
  const { profile: globalProfile } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyFoodLog[]>([]);
  const [streakCalendar, setStreakCalendar] = useState<CalendarDay[]>([]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [contextualActions, setContextualActions] = useState<QuickAction[]>([]);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [dailyQuote, setDailyQuote] = useState<{ quote: string; author: string } | null>(null);

  // Map action IDs to SVG icons
  const getActionIcon = (actionId: string) => {
    const iconProps = { width: 32, height: 32, fill: theme.colors.primary };
    switch (actionId) {
      case 'log-food':
      case 'log-breakfast':
      case 'log-lunch':
      case 'log-dinner':
        return <NutritionIcon {...iconProps} />;
      case 'water':
        return <WaterDropletIcon {...iconProps} />;
      case 'mood':
        return <MoodIcon {...iconProps} />;
      case 'scan':
        return <ScanIcon {...iconProps} />;
      case 'coach':
        return <CoachIcon {...iconProps} />;
      case 'progress-photo':
        return <CameraIcon {...iconProps} />;
      case 'meal-plan':
        return <ClipboardIcon {...iconProps} />;
      case 'timeline':
        return <CameraIcon {...iconProps} />;
      default:
        return <Text style={styles.actionEmoji}>{actionId}</Text>;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTodayLog();
    }, [])
  );

  // Sync global profile
  useEffect(() => {
    if (globalProfile) {
      setProfile(globalProfile);
    }
  }, [globalProfile]);

  // Update contextual actions when data changes
  useEffect(() => {
    if (!loading && (todayLog || currentStreak >= 0)) {
      const actions = getContextualActions(todayLog, currentStreak);
      setContextualActions(actions.slice(0, 3)); // Max 3 actions
    }
  }, [loading, todayLog, currentStreak]);

  const loadData = async () => {
    try {
      await Promise.all([fetchProfile(), fetchTodayLog(), fetchWeekLogs(), fetchTrainingData(), fetchDailyQuote()]);
    } catch (error) {
      console.error('[HOME] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('[HOME] Fetch profile error:', error);
    }
  };

  const fetchTodayLog = async () => {
    try {
      const response = await foodLogAPI.getToday();
      if (response.success && response.data) {
        setTodayLog(response.data);
      }
    } catch (error) {
      console.error('[HOME] Fetch log error:', error);
    }
  };

  const fetchWeekLogs = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data && Array.isArray(response.data)) {
        setWeekLogs(response.data);

        // Generate 7-day streak calendar
        const calendar = generate7DayCalendar(response.data);
        setStreakCalendar(calendar);
        const streak = calculateCurrentStreak(calendar);
        setCurrentStreak(streak);
      } else {
        setWeekLogs([]);
      }
    } catch (error) {
      console.error('[HOME] Fetch week logs error:', error);
      setWeekLogs([]);
    }
  };

  const fetchDailyQuote = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const cacheKey = `daily_quote_${today}`;

      // Check AsyncStorage cache first
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const cachedQuote = JSON.parse(cached);
        setDailyQuote(cachedQuote);
        console.log('[HOME] Using cached quote:', cachedQuote);
        return;
      }

      // Fetch from API
      const response = await quoteAPI.getDailyQuote();
      if (response.success && response.data) {
        setDailyQuote(response.data);
        // Cache for today
        await AsyncStorage.setItem(cacheKey, JSON.stringify(response.data));
        console.log('[HOME] Fetched and cached new quote:', response.data);
      }
    } catch (error) {
      console.error('[HOME] Fetch quote error:', error);
      // Set fallback quote
      setDailyQuote({
        quote: "Every day is a new opportunity to become stronger, healthier, and more resilient than yesterday.",
        author: "Coach"
      });
    }
  };

  const fetchTrainingData = async () => {
    try {
      const planResponse = await trainingAPI.getCurrentPlan();
      if (planResponse.success && planResponse.data) {
        setTrainingPlan(planResponse.data.plan);
      }

      const workoutResponse = await trainingAPI.getTodayWorkout();
      if (workoutResponse.success && workoutResponse.data) {
        setTodayWorkout(workoutResponse.data);
      }
    } catch (error) {
      console.log('[HOME] Training data not available');
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

  const userName = profile?.fullName?.split(' ')[0] || 'Champion';
  const isFirstTimeUser = !weekLogs || weekLogs.length === 0 || weekLogs.every(log => !log.entries || log.entries.length === 0);

  // Calculate macro percentages
  const caloriesPercent = todayLog ? Math.min((todayLog.totals.calories / todayLog.targets.calories) * 100, 100) : 0;
  const proteinPercent = todayLog ? Math.min((todayLog.totals.protein / todayLog.targets.protein) * 100, 100) : 0;
  const carbsPercent = todayLog ? Math.min((todayLog.totals.carbs / todayLog.targets.carbs) * 100, 100) : 0;
  const fatPercent = todayLog ? Math.min((todayLog.totals.fat / todayLog.targets.fat) * 100, 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}, {userName}!</Text>
          <Text style={styles.subGreeting}>
            {isFirstTimeUser ? "Welcome to your coaching journey!" : "Let's make today count"}
          </Text>
        </View>

        {/* Daily Motivational Quote */}
        {dailyQuote && (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{dailyQuote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
          </View>
        )}

        {/* Sunday Check-In Banner */}
        {!isFirstTimeUser && new Date().getDay() === 0 && (
          <TouchableOpacity
            style={styles.sundayBanner}
            onPress={() => router.push('/weekly-checkin')}
          >
            <CameraIcon width={40} height={40} fill={theme.colors.primary} />
            <View style={styles.sundayBannerText}>
              <Text style={styles.sundayBannerTitle}>It's Check-In Sunday!</Text>
              <Text style={styles.sundayBannerSubtitle}>Track progress & update targets</Text>
            </View>
            <Text style={styles.sundayBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* First-Time User Onboarding */}
        {isFirstTimeUser && (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingEmoji}>🌟</Text>
            <Text style={styles.onboardingTitle}>Let's Get Started!</Text>
            <Text style={styles.onboardingText}>
              Log your meals, and I'll provide personalized guidance to help you reach your goals.
            </Text>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={() => router.push('/(tabs)/nutrition')}
            >
              <Text style={styles.onboardingButtonText}>Log Your First Meal! 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Progress */}
        {!isFirstTimeUser && todayLog && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <View style={styles.macroGrid}>
              {/* Calories */}
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <Text style={[styles.macroPercent, { color: theme.colors.calories }]}>
                    {Math.round(caloriesPercent)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${caloriesPercent}%`, backgroundColor: theme.colors.calories }]} />
                </View>
                <Text style={styles.macroValues}>
                  {Math.round(todayLog.totals.calories)} / {Math.round(todayLog.targets.calories)}
                </Text>
              </View>

              {/* Protein */}
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={[styles.macroPercent, { color: theme.colors.protein }]}>
                    {Math.round(proteinPercent)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${proteinPercent}%`, backgroundColor: theme.colors.protein }]} />
                </View>
                <Text style={styles.macroValues}>
                  {Math.round(todayLog.totals.protein)}g / {Math.round(todayLog.targets.protein)}g
                </Text>
              </View>

              {/* Carbs */}
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={[styles.macroPercent, { color: theme.colors.carbs }]}>
                    {Math.round(carbsPercent)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${carbsPercent}%`, backgroundColor: theme.colors.carbs }]} />
                </View>
                <Text style={styles.macroValues}>
                  {Math.round(todayLog.totals.carbs)}g / {Math.round(todayLog.targets.carbs)}g
                </Text>
              </View>

              {/* Fat */}
              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={[styles.macroPercent, { color: theme.colors.fat }]}>
                    {Math.round(fatPercent)}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${fatPercent}%`, backgroundColor: theme.colors.fat }]} />
                </View>
                <Text style={styles.macroValues}>
                  {Math.round(todayLog.totals.fat)}g / {Math.round(todayLog.targets.fat)}g
                </Text>
              </View>
            </View>

            {/* Coach Explanation */}
            {todayLog?.adjustmentMessage && (
              <View style={styles.coachExplanation}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <LightBulbIcon width={16} height={16} fill={theme.colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.coachExplanationText, { flex: 1 }]}>
                    {todayLog.adjustmentMessage}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        {!isFirstTimeUser && contextualActions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {contextualActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionButton}
                  onPress={() => router.push(action.route as any)}
                >
                  {getActionIcon(action.id)}
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Streak Calendar */}
        {streakCalendar.length > 0 && !isFirstTimeUser && (
          <View style={styles.section}>
            <View style={styles.streakHeader}>
              <View>
                <Text style={styles.sectionTitle}>Logging Streak</Text>
                <Text style={styles.streakSubtitle}>Keep it going!</Text>
              </View>
              <View style={styles.streakHeaderRight}>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeText}>{currentStreak}</Text>
                  <FireIcon width={20} height={20} fill={theme.colors.primary} />
                </View>
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={() => router.push('/calendar-view')}
                >
                  <HistoryIcon width={22} height={22} fill={theme.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.calendarGrid}>
              {streakCalendar.map((day, index) => (
                <View key={index} style={styles.calendarDayContainer}>
                  <Text style={styles.calendarDayLabel}>{day.dayOfWeek}</Text>
                  <View style={[
                    styles.calendarDay,
                    day.hasEntries && styles.calendarDayLogged,
                    day.isToday && styles.calendarDayToday,
                  ]}>
                    <Text style={[
                      styles.calendarDayNumber,
                      day.hasEntries && styles.calendarDayNumberLogged,
                    ]}>
                      {day.hasEntries ? '✓' : day.dayNumber}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Today's Workout */}
        {!isFirstTimeUser && trainingPlan && todayWorkout && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Workout</Text>
            <TouchableOpacity
              style={styles.workoutCard}
              onPress={() => router.push('/workout-logger')}
            >
              <TodaysWorkoutIcon width={48} height={48} fill={theme.colors.primary} />
              <View style={styles.workoutContent}>
                <Text style={styles.workoutName}>{todayWorkout.workout_name}</Text>
                <Text style={styles.workoutMeta}>
                  {todayWorkout.total_exercises} exercises • {todayWorkout.estimated_duration_minutes} min
                </Text>
              </View>
              <Text style={styles.workoutArrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Meal Plan - FEATURED */}
        {!isFirstTimeUser && (
          <TouchableOpacity
            style={styles.mealPlanCTA}
            onPress={() => router.push('/meal-plan')}
          >
            <ClipboardIcon width={48} height={48} fill={theme.colors.primary} />
            <View style={styles.mealPlanCTAContent}>
              <Text style={styles.mealPlanCTATitle}>Your Meal Plan</Text>
              <Text style={styles.mealPlanCTAText}>
                Personalized weekly nutrition plan tailored to your goals
              </Text>
            </View>
            <Text style={styles.mealPlanCTAArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Coach CTA */}
        {!isFirstTimeUser && (
          <TouchableOpacity
            style={styles.coachCTA}
            onPress={() => router.push('/(tabs)/coach')}
          >
            <FutureProgressIcon width={48} height={48} fill={theme.colors.primary} />
            <View style={styles.coachCTAContent}>
              <Text style={styles.coachCTATitle}>See Your Future Progress</Text>
              <Text style={styles.coachCTAText}>
                AI predictions show where you'll be in 30, 60, and 90 days
              </Text>
            </View>
            <Text style={styles.coachCTAArrow}>→</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
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
    padding: theme.spacing.xl,
    paddingTop: 60,
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
  quoteCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  quoteText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  quoteAuthor: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'right',
  },
  sundayBanner: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  sundayBannerEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
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
  },
  sundayBannerArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  onboardingCard: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  onboardingEmoji: {
    fontSize: 48,
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
  onboardingButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  onboardingButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  coachExplanation: {
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  coachExplanationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  macroGrid: {
    gap: theme.spacing.md,
  },
  macroCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  macroLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  macroPercent: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.md,
  },
  macroValues: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
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
    textAlign: 'center',
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  streakSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  streakHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakBadgeText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.encouragement,
  },
  calendarButton: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
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
    backgroundColor: theme.colors.background,
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
  calendarDayNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  calendarDayNumberLogged: {
    color: theme.colors.encouragement,
    fontSize: theme.fontSize.lg,
  },
  workoutCard: {
    backgroundColor: theme.colors.secondary + '20',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutEmoji: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  workoutContent: {
    flex: 1,
  },
  workoutName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  workoutMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  workoutArrow: {
    fontSize: 28,
    color: theme.colors.secondary,
    fontWeight: theme.fontWeight.bold,
  },
  mealPlanCTA: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  mealPlanCTAEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  mealPlanCTAContent: {
    flex: 1,
  },
  mealPlanCTATitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  mealPlanCTAText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  mealPlanCTAArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  coachCTA: {
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  coachCTAEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  coachCTAContent: {
    flex: 1,
  },
  coachCTATitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  coachCTAText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  coachCTAArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
});
