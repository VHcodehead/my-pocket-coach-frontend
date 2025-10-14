// Training progress screen - View strength gains and PRs
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { trainingAPI } from '../src/services/api';

export default function TrainingProgressScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [personalRecords, setPersonalRecords] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProgress(),
        loadPersonalRecords(),
        loadHistory(),
      ]);
    } catch (error) {
      console.error('[TRAINING_PROGRESS] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await trainingAPI.getProgress();
      if (response.success && response.data) {
        setProgress(response.data);
      }
    } catch (error) {
      console.error('[TRAINING_PROGRESS] Progress error:', error);
    }
  };

  const loadPersonalRecords = async () => {
    try {
      const response = await trainingAPI.getPersonalRecords();
      if (response.success && response.data) {
        setPersonalRecords(response.data);
      }
    } catch (error) {
      console.error('[TRAINING_PROGRESS] PRs error:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await trainingAPI.getHistory({ limit: 10 });
      if (response.success && response.data) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('[TRAINING_PROGRESS] History error:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Training Progress</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Overall Stats */}
        {progress && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{progress.totalWorkouts || 0}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{progress.totalPRs || 0}</Text>
              <Text style={styles.statLabel}>PRs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{progress.totalVolume ? `${(progress.totalVolume / 1000).toFixed(1)}k` : '0'}</Text>
              <Text style={styles.statLabel}>Volume (lbs)</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{progress.adherenceRate || 0}%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>
        )}

        {/* Recent PRs */}
        {personalRecords.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal Records 🏆</Text>
              <Text style={styles.sectionSubtitle}>{personalRecords.length} total</Text>
            </View>
            {personalRecords.slice(0, 10).map((pr, idx) => (
              <View key={idx} style={styles.prCard}>
                <View style={styles.prHeader}>
                  <Text style={styles.prExercise}>{pr.exercise_name}</Text>
                  <Text style={styles.prDate}>{formatDate(pr.achieved_at)}</Text>
                </View>
                <View style={styles.prDetails}>
                  <View style={styles.prDetailItem}>
                    <Text style={styles.prDetailLabel}>Weight</Text>
                    <Text style={styles.prDetailValue}>{pr.weight} lbs</Text>
                  </View>
                  <View style={styles.prDetailItem}>
                    <Text style={styles.prDetailLabel}>Reps</Text>
                    <Text style={styles.prDetailValue}>{pr.reps}</Text>
                  </View>
                  <View style={styles.prDetailItem}>
                    <Text style={styles.prDetailLabel}>Est. 1RM</Text>
                    <Text style={styles.prDetailValue}>{pr.estimated_1rm} lbs</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Strength Trends Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Strength Trends 📈</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Chart visualization coming soon
            </Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Track your progress over time with detailed charts
            </Text>
          </View>
        </View>

        {/* Recent Workouts */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {history.map((workout, idx) => (
              <View key={idx} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyExercise}>{workout.exercise_name}</Text>
                  <Text style={styles.historyDate}>{formatDate(workout.logged_at)}</Text>
                </View>
                <Text style={styles.historyDetails}>
                  Set {workout.set_number}: {workout.actual_weight} lbs × {workout.actual_reps} reps
                  {workout.rpe ? ` @ RPE ${workout.rpe}` : ''}
                </Text>
                {workout.notes && (
                  <Text style={styles.historyNotes}>{workout.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!progress && personalRecords.length === 0 && history.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No training data yet</Text>
            <Text style={styles.emptySubtext}>Complete workouts to see your progress here</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/training')}
            >
              <Text style={styles.emptyButtonText}>Start Training</Text>
            </TouchableOpacity>
          </View>
        )}
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
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Section
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // PR Cards
  prCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  prExercise: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  prDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  prDetails: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  prDetailItem: {
    flex: 1,
  },
  prDetailLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  prDetailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },

  // Chart Placeholder
  chartPlaceholder: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  chartPlaceholderText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  chartPlaceholderSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },

  // History Cards
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  historyExercise: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  historyDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  historyDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  historyNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
