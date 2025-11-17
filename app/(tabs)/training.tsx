// Training Tab - Dashboard for training program
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { trainingAPI } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import { TrainingPlan } from '../../src/types';
import { captureError } from '../../src/utils/sentry';

// Import SVG icons
import BicepIcon from '../../assets/icons/bicep-icon.svg';
import TodaysWorkoutIcon from '../../assets/icons/todays-workout-icon.svg';
import FireIcon from '../../assets/icons/fire-icon.svg';
import HistoryIcon from '../../assets/icons/history-icon.svg';
import ClipboardIcon from '../../assets/icons/clipboard-icon.svg';
import GenerateNewTrainingPlanIcon from '../../assets/icons/generate-new-training-plan-icon.svg';
import SleepIcon from '../../assets/icons/sleep-icon.svg';
import PRIcon from '../../assets/icons/pr-icon.svg';
import ProgressIcon from '../../assets/icons/progress-icon.svg';

export default function TrainingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[TRAINING] Screen focused - refreshing data');
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      await Promise.all([
        fetchCurrentPlan(),
        fetchTodayWorkout(),
        fetchRecentPRs(),
      ]);
    } catch (error) {
      console.error('[TRAINING] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleGenerateNewPlan = () => {
    Alert.alert(
      'Generate New Training Plan?',
      'This will deactivate your current plan and create a brand new program from scratch. Your workout history will be preserved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate New Plan',
          style: 'destructive',
          onPress: async () => {
            try {
              // Deactivate current plan
              await trainingAPI.deactivatePlan();
              // Navigate to onboarding to create new plan
              router.push('/training-onboarding');
            } catch (error) {
              console.error('[TRAINING] Error deactivating plan:', error);
              Alert.alert('Error', 'Failed to deactivate current plan. Please try again.');
            }
          },
        },
      ]
    );
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await trainingAPI.getCurrentPlan();
      if (response.success && response.data) {
        setTrainingPlan(response.data);
      } else if (response.success && !response.data) {
        // No active plan - guide user to create one
        console.log('[TRAINING] No active training plan:', response.message);
        setTrainingPlan(null);
        Alert.alert(
          'No Training Plan Yet',
          'You haven\'t created your training plan yet. Tap "Generate New Training Plan" below to create your personalized program!',
          [{ text: 'Got it!' }]
        );
      } else {
        // Actual error from backend
        const errorMsg = `Failed to load plan: ${response.error || 'Unknown error'}\n\nFull response: ${JSON.stringify(response, null, 2)}`;
        Alert.alert('Training Plan Error', errorMsg);
        console.error('[TRAINING] Fetch plan failed:', response);
        captureError(new Error(errorMsg), { feature: 'training', action: 'fetch_plan', extra: response });
      }
    } catch (error) {
      // Network or unexpected error
      const errorDetails = error instanceof Error
        ? `${error.message}\n\nStack: ${error.stack}\n\nDetails: ${JSON.stringify((error as any).details || {}, null, 2)}`
        : String(error);
      Alert.alert('Training Plan Error', `Error: ${errorDetails}`);
      console.error('[TRAINING] Fetch plan error:', error);
      if (error instanceof Error) {
        captureError(error, { feature: 'training', action: 'fetch_plan', extra: { fullError: error, stack: error.stack } });
      }
    }
  };

  const fetchTodayWorkout = async () => {
    try {
      const response = await trainingAPI.getTodayWorkout();
      if (response.success && response.data) {
        setTodayWorkout(response.data);
      }
    } catch (error) {
      console.log('[TRAINING] No workout today or error:', error);
    }
  };

  const fetchRecentPRs = async () => {
    try {
      const response = await trainingAPI.getPersonalRecords();
      if (response.success && response.data) {
        // Show last 5 PRs
        setRecentPRs(response.data.slice(0, 5));
      }
    } catch (error) {
      console.log('[TRAINING] Fetch PRs error:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your training...</Text>
        </View>
      </View>
    );
  }

  // No active plan - show onboarding prompt
  if (!trainingPlan) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.greeting}>Ready to Train?</Text>
              <BicepIcon width={28} height={28} fill={theme.colors.primary} />
            </View>
            <Text style={styles.subGreeting}>Let's build your personalized program</Text>
          </View>

          <View style={styles.onboardingCard}>
            <TodaysWorkoutIcon width={64} height={64} fill={theme.colors.primary} />
            <Text style={styles.onboardingTitle}>Start Your Training Journey</Text>
            <Text style={styles.onboardingText}>
              I'll create a personalized training program based on your experience, goals, and available equipment.
            </Text>
            <View style={styles.onboardingSteps}>
              <View style={styles.onboardingStep}>
                <Text style={styles.stepNumber}>1️⃣</Text>
                <Text style={styles.stepText}>Tell me about your training experience</Text>
              </View>
              <View style={styles.onboardingStep}>
                <Text style={styles.stepNumber}>2️⃣</Text>
                <Text style={styles.stepText}>I'll generate your 12-16 week program</Text>
              </View>
              <View style={styles.onboardingStep}>
                <Text style={styles.stepNumber}>3️⃣</Text>
                <Text style={styles.stepText}>Follow workouts, track progress, set PRs!</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={() => router.push('/training-onboarding')}
            >
              <Text style={styles.onboardingButtonText}>Create My Program 🚀</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Has active plan - show dashboard
  const weekProgress = Math.round((trainingPlan.current_week / trainingPlan.duration_weeks) * 100);

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.greeting}>Training</Text>
            <BicepIcon width={28} height={28} fill={theme.colors.primary} />
          </View>
          <Text style={styles.subGreeting}>{trainingPlan.name}</Text>
        </View>

        {/* Program Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View>
                <Text style={styles.statusWeek}>Week {trainingPlan.current_week} / {trainingPlan.duration_weeks}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {trainingPlan.current_block === 'strength' ? (
                    <FireIcon width={16} height={16} fill={theme.colors.text} />
                  ) : (
                    <BicepIcon width={16} height={16} fill={theme.colors.text} />
                  )}
                  <Text style={styles.statusBlock}>{trainingPlan.current_block} phase</Text>
                </View>
              </View>
            </View>
            <Text style={styles.statusProgress}>{weekProgress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${weekProgress}%` }]} />
          </View>
        </View>

        {/* Today's Workout Card */}
        {todayWorkout ? (
          <TouchableOpacity
            style={styles.workoutCard}
            onPress={() => router.push('/workout-logger')}
            activeOpacity={0.9}
          >
            <View style={styles.workoutHeader}>
              <TodaysWorkoutIcon width={48} height={48} fill={theme.colors.primary} />
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutLabel}>Today's Workout</Text>
                <Text style={styles.workoutName}>{todayWorkout.workout_name}</Text>
                <Text style={styles.workoutMeta}>
                  {todayWorkout.total_exercises} exercises • ~{todayWorkout.estimated_duration_minutes} min
                </Text>
              </View>
              <Text style={styles.workoutArrow}>→</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.restDayCard}>
            <SleepIcon width={48} height={48} fill={theme.colors.textMuted} />
            <Text style={styles.restTitle}>Rest Day</Text>
            <Text style={styles.restMessage}>Recovery is just as important as training!</Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <FireIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <PRIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.statValue}>{recentPRs.length}</Text>
              <Text style={styles.statLabel}>PRs</Text>
            </View>
            <View style={styles.statCard}>
              <BicepIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Volume (lbs)</Text>
            </View>
          </View>
        </View>

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>Recent PRs</Text>
              <PRIcon width={20} height={20} fill={theme.colors.primary} />
            </View>
            {recentPRs.map((pr, index) => (
              <View key={index} style={styles.prCard}>
                <View style={styles.prInfo}>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prDate}>{new Date(pr.achieved_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.prWeight}>{pr.weight} lbs × {pr.reps}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/training-progress')}
            >
              <ProgressIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.actionLabel}>Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/training-history')}
            >
              <HistoryIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.actionLabel}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/training-program')}
            >
              <ClipboardIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.actionLabel}>Full Program</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/training-exercises')}
            >
              <BicepIcon width={32} height={32} fill={theme.colors.primary} />
              <Text style={styles.actionLabel}>Exercises</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Generate New Plan Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleGenerateNewPlan}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <GenerateNewTrainingPlanIcon width={20} height={20} fill={theme.colors.text} />
              <Text style={styles.resetButtonText}>Generate New Training Plan</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.resetButtonHint}>
            Start fresh with a new program tailored to your current goals
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  onboardingCard: {
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
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
  statusCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  statusWeek: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statusBlock: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusProgress: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  workoutCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  workoutName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  workoutMeta: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  workoutArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  restDayCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  restEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  restTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  restMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  statsSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  prCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  prInfo: {
    flex: 1,
  },
  prExercise: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  prDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  prWeight: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
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
  resetButton: {
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 2,
    borderColor: theme.colors.warning,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  resetButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  resetButtonHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
