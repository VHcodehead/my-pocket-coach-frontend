// Training Review - End-of-program celebration and summary
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { trainingAPI } from '../src/services/api';
import { theme } from '../src/theme';

interface ProgramStats {
  programName: string;
  duration: string;
  completedWorkouts: number;
  totalWorkouts: number;
  totalVolume: number;
  totalSets: number;
  personalRecords: number;
  avgRpe: number;
  startDate: string;
  endDate: string;
  achievements: string[];
  coachFeedback?: string;
}

export default function TrainingReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const planId = params.planId ? Number(params.planId) : null;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProgramStats | null>(null);

  useEffect(() => {
    loadProgramReview();
  }, []);

  const loadProgramReview = async () => {
    try {
      setLoading(true);

      // Fetch program stats, history, and PRs
      const [progressRes, historyRes, prsRes] = await Promise.all([
        trainingAPI.getProgress(),
        trainingAPI.getHistory(),
        trainingAPI.getPersonalRecords(),
      ]);

      // Calculate stats
      const workoutHistory = historyRes.data || [];
      const personalRecords = prsRes.data || [];

      const totalVolume = workoutHistory.reduce(
        (sum: number, log: any) =>
          sum + (log.actual_weight || 0) * (log.actual_reps || 0),
        0
      );

      const totalSets = workoutHistory.length;

      const rpeValues = workoutHistory
        .filter((log: any) => log.rpe)
        .map((log: any) => log.rpe);
      const avgRpe =
        rpeValues.length > 0
          ? rpeValues.reduce((sum: number, rpe: number) => sum + rpe, 0) /
            rpeValues.length
          : 0;

      // Generate achievements
      const achievements = [];
      if (totalSets >= 100) achievements.push('Century Club - 100+ sets logged');
      if (totalVolume >= 100000)
        achievements.push('Heavy Lifter - 100k+ lbs moved');
      if (personalRecords.length >= 5)
        achievements.push('Record Breaker - 5+ PRs');
      if (avgRpe <= 7) achievements.push('Perfect Form - Maintained RPE ≤7');
      achievements.push('Program Complete - Finished all 12 weeks!');

      setStats({
        programName: progressRes.data?.programName || 'Training Program',
        duration: '12 weeks',
        completedWorkouts: workoutHistory.length,
        totalWorkouts: 36, // Typical 12-week program with 3 workouts/week
        totalVolume,
        totalSets,
        personalRecords: personalRecords.length,
        avgRpe: Math.round(avgRpe * 10) / 10,
        startDate: progressRes.data?.startDate || new Date().toISOString(),
        endDate: new Date().toISOString(),
        achievements,
        coachFeedback:
          "Outstanding work completing this program! You've shown incredible consistency and dedication. Your progressive overload was well-managed, and the PRs you've set are a testament to your hard work. You're ready to take on a new challenge - let's build on this momentum!",
      });
    } catch (error) {
      console.error('[TRAINING_REVIEW] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewProgram = () => {
    router.push('/training-onboarding');
  };

  const handleViewProgress = () => {
    router.push('/training-progress');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your results...</Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>No program data available</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const completionRate = Math.round(
    (stats.completedWorkouts / stats.totalWorkouts) * 100
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Program Complete!</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Celebration Banner */}
        <View style={styles.celebrationBanner}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Congratulations!</Text>
          <Text style={styles.celebrationSubtitle}>
            You completed {stats.programName}
          </Text>
          <View style={styles.dateRange}>
            <Text style={styles.dateText}>
              {new Date(stats.startDate).toLocaleDateString()} -{' '}
              {new Date(stats.endDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Key Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
            <Text style={styles.statSubtext}>
              {stats.completedWorkouts}/{stats.totalWorkouts} workouts
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {(stats.totalVolume / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.statLabel}>Total Volume</Text>
            <Text style={styles.statSubtext}>lbs lifted</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>Sets Logged</Text>
            <Text style={styles.statSubtext}>across {stats.duration}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.personalRecords}</Text>
            <Text style={styles.statLabel}>Personal Records</Text>
            <Text style={styles.statSubtext}>new PRs achieved</Text>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Achievements</Text>
          {stats.achievements.map((achievement, idx) => (
            <View key={idx} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Text style={styles.achievementIconText}>✓</Text>
              </View>
              <Text style={styles.achievementText}>{achievement}</Text>
            </View>
          ))}
        </View>

        {/* Coach Feedback */}
        {stats.coachFeedback && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Coach's Feedback</Text>
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{stats.coachFeedback}</Text>
            </View>
          </View>
        )}

        {/* Performance Highlights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Performance Highlights</Text>
          <View style={styles.highlightCard}>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Average RPE:</Text>
              <Text style={styles.highlightValue}>{stats.avgRpe}/10</Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Workout Frequency:</Text>
              <Text style={styles.highlightValue}>
                {Math.round(stats.completedWorkouts / 12)} per week
              </Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Consistency:</Text>
              <Text style={styles.highlightValue}>
                {completionRate >= 90
                  ? 'Excellent'
                  : completionRate >= 75
                  ? 'Great'
                  : 'Good'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartNewProgram}
          >
            <Text style={styles.primaryButtonText}>Start New Program</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewProgress}
          >
            <Text style={styles.secondaryButtonText}>View Detailed Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/training-history')}
          >
            <Text style={styles.secondaryButtonText}>View Training History</Text>
          </TouchableOpacity>
        </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: theme.colors.text,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  celebrationBanner: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  celebrationSubtitle: {
    fontSize: theme.fontSize.lg,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  dateRange: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  achievementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  achievementIconText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
  },
  achievementText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  feedbackCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  feedbackText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  highlightCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  highlightLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  highlightValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  actionsSection: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
});
