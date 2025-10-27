// Stats & Gamification Screen
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { trainingAPI, foodLogAPI, gamificationAPI } from '../src/services/api';
import { calculateCurrentStreak, generate7DayCalendar } from '../src/utils/streakCalendar';

interface PersonalRecord {
  id: number;
  exercise_name: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
}

export default function StatsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Available data
  const [currentStreak, setCurrentStreak] = useState(0);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [workoutStreak, setWorkoutStreak] = useState(0);
  const [checkinStreak, setCheckinStreak] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [daysInProgram, setDaysInProgram] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch current food logging streak
      const logsResponse = await foodLogAPI.getWeek();
      if (logsResponse.success && logsResponse.data) {
        const calendar = generate7DayCalendar(logsResponse.data);
        const streak = calculateCurrentStreak(calendar);
        setCurrentStreak(streak);
      }

      // Fetch personal records
      const prsResponse = await trainingAPI.getPersonalRecords();
      if (prsResponse.success && prsResponse.data) {
        setPersonalRecords(prsResponse.data);
      }

      // Fetch workout and check-in streaks
      const streaksResponse = await gamificationAPI.getStreaks();
      if (streaksResponse.success && streaksResponse.data) {
        setWorkoutStreak(streaksResponse.data.workoutStreak || 0);
        setCheckinStreak(streaksResponse.data.checkinStreak || 0);
      }

      // Fetch all-time stats
      const statsResponse = await gamificationAPI.getAllTimeStats();
      if (statsResponse.success && statsResponse.data) {
        setTotalWorkouts(statsResponse.data.totalWorkouts || 0);
        setTotalVolume(statsResponse.data.totalVolume || 0);
        setDaysInProgram(statsResponse.data.daysInProgram || 0);
      }

    } catch (error) {
      console.error('[STATS] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Stats</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Stats</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Current Streaks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Active Streaks</Text>

          <View style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>Food Logging</Text>
              <Text style={styles.streakValue}>{currentStreak} days</Text>
            </View>
            {currentStreak >= 7 && (
              <Text style={styles.streakSubtext}>Perfect week! Keep it up! 🎉</Text>
            )}
          </View>

          {/* Workout Streak */}
          <View style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>Workout Streak</Text>
              <Text style={styles.streakValue}>{workoutStreak} days</Text>
            </View>
            <Text style={styles.streakSubtext}>Consecutive workout days</Text>
          </View>

          {/* Check-in Streak */}
          <View style={styles.streakCard}>
            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>Check-in Streak</Text>
              <Text style={styles.streakValue}>{checkinStreak} weeks</Text>
            </View>
            <Text style={styles.streakSubtext}>Consecutive weekly check-ins</Text>
          </View>
        </View>

        {/* Personal Records Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Personal Records</Text>

          {personalRecords.length > 0 ? (
            personalRecords.slice(0, 10).map((pr) => (
              <View key={pr.id} style={styles.prCard}>
                <View style={styles.prLeft}>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prDate}>
                    {new Date(pr.achieved_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.prRight}>
                  <Text style={styles.prWeight}>{pr.weight} lbs</Text>
                  <Text style={styles.prReps}>× {pr.reps} reps</Text>
                  <Text style={styles.pr1RM}>Est. 1RM: {Math.round(pr.estimated_1rm)} lbs</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No personal records yet</Text>
              <Text style={styles.emptySubtext}>
                Keep logging your workouts to track your PRs!
              </Text>
            </View>
          )}

          {personalRecords.length > 10 && (
            <Text style={styles.showMoreText}>
              + {personalRecords.length - 10} more records
            </Text>
          )}
        </View>

        {/* All-Time Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 All-Time Stats</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Total Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {totalVolume >= 1000000
                  ? `${(totalVolume / 1000000).toFixed(1)}M`
                  : totalVolume >= 1000
                    ? `${(totalVolume / 1000).toFixed(0)}K`
                    : totalVolume}
              </Text>
              <Text style={styles.statLabel}>Total Volume (lbs)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{daysInProgram}</Text>
              <Text style={styles.statLabel}>Days Training</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{personalRecords.length}</Text>
              <Text style={styles.statLabel}>PRs Set</Text>
            </View>
          </View>
        </View>

        {/* Achievements - Coming Soon */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎖️ Achievements</Text>

          <View style={[styles.achievementsContainer, styles.comingSoon]}>
            <Text style={styles.comingSoonMessage}>
              Achievement system coming soon! Track milestones like:
            </Text>
            <Text style={styles.achievementExample}>• First Workout Complete</Text>
            <Text style={styles.achievementExample}>• 7-Day Streak Champion</Text>
            <Text style={styles.achievementExample}>• 100 Workouts Club</Text>
            <Text style={styles.achievementExample}>• 1 Million Pounds Lifted</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingTop: theme.spacing.xl + 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.h3,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },

  // Streak Cards
  streakCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  streakValue: {
    fontSize: theme.fontSize.h2,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  streakSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  // Personal Records
  prCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  prLeft: {
    flex: 1,
  },
  prExercise: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  prDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  prRight: {
    alignItems: 'flex-end',
  },
  prWeight: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  prReps: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: 2,
  },
  pr1RM: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  showMoreText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },

  // Empty State
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // All-Time Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    width: '48%',
    marginBottom: theme.spacing.sm,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: theme.fontSize.h1,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Coming Soon Styling
  comingSoon: {
    opacity: 0.6,
  },
  comingSoonBadge: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  comingSoonMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Achievements
  achievementsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  achievementExample: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
});
