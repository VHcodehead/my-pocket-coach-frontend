// Training History - Past workout logs
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { trainingAPI } from '../src/services/api';
import { useTheme } from '../src/contexts/ThemeContext';

interface TrainingLog {
  id: number;
  exercise_name: string;
  set_number: number;
  actual_weight: number;
  actual_reps: number;
  rpe?: number;
  logged_at: string;
}

interface GroupedLog {
  date: string;
  logs: TrainingLog[];
  totalVolume: number;
}

export default function TrainingHistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<GroupedLog[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await trainingAPI.getHistory();

      if (response.success && response.data?.logs) {
        setLogs(response.data.logs);
        groupLogsByDate(response.data.logs);
      }
    } catch (error) {
      console.error('[TRAINING_HISTORY] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupLogsByDate = (logs: TrainingLog[]) => {
    const grouped: { [date: string]: TrainingLog[] } = {};

    logs.forEach(log => {
      const date = new Date(log.logged_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });

    const groupedArray: GroupedLog[] = Object.entries(grouped).map(([date, logs]) => ({
      date,
      logs,
      totalVolume: logs.reduce((sum, log) => sum + (log.actual_weight * log.actual_reps), 0),
    }));

    // Sort by date descending
    groupedArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setGroupedLogs(groupedArray);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Training History</Text>
          <Text style={styles.headerSubtitle}>{logs.length} total sets logged</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {groupedLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No workout history yet</Text>
            <Text style={styles.emptySubtext}>
              Start logging workouts to see your training history here!
            </Text>
          </View>
        ) : (
          groupedLogs.map((group, idx) => (
            <View key={idx} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{group.date}</Text>
                <Text style={styles.volumeText}>
                  {(group.totalVolume / 1000).toFixed(1)}k lbs
                </Text>
              </View>

              {/* Group exercises by name */}
              {Object.entries(
                group.logs.reduce((acc, log) => {
                  if (!acc[log.exercise_name]) {
                    acc[log.exercise_name] = [];
                  }
                  acc[log.exercise_name].push(log);
                  return acc;
                }, {} as { [key: string]: TrainingLog[] })
              ).map(([exerciseName, exerciseLogs]) => (
                <View key={exerciseName} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exerciseName}</Text>
                  <View style={styles.setsContainer}>
                    {exerciseLogs.map((log, setIdx) => (
                      <View key={log.id} style={styles.setRow}>
                        <Text style={styles.setNumber}>Set {log.set_number}:</Text>
                        <Text style={styles.setText}>
                          {log.actual_weight} lbs × {log.actual_reps} reps
                        </Text>
                        {log.rpe && (
                          <Text style={styles.rpeText}>RPE {log.rpe}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

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
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    padding: theme.spacing.xxxl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: theme.spacing.xl,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  volumeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  exerciseCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  setsContainer: {
    marginLeft: theme.spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  setNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    width: 50,
  },
  setText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  rpeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    fontWeight: theme.fontWeight.semibold,
  },
});
