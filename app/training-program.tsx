// Training Program View - See full 12-week program
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { trainingAPI } from '../src/services/api';
import { theme } from '../src/theme';

interface WorkoutTemplate {
  id: number;
  week_number: number;
  day_number: number;
  workout_name: string;
  workout_type: 'normal' | 'deload';
  exercises: any[];
  total_exercises: number;
  estimated_duration_minutes: number;
}

export default function TrainingProgramScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutTemplate[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadProgram();
  }, []);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const [planResponse, workoutsResponse] = await Promise.all([
        trainingAPI.getCurrentPlan(),
        trainingAPI.getAllWorkouts(),
      ]);

      if (planResponse.success && planResponse.data) {
        setPlan(planResponse.data.plan);
        setSelectedWeek(planResponse.data.plan.current_week);
      }

      if (workoutsResponse.success && workoutsResponse.data) {
        setAllWorkouts(workoutsResponse.data);
      }
    } catch (error) {
      console.error('[TRAINING_PROGRAM] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkoutExpanded = (workoutId: number) => {
    setExpandedWorkouts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workoutId)) {
        newSet.delete(workoutId);
      } else {
        newSet.add(workoutId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your program...</Text>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>No active training plan found</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/training-onboarding')}
          >
            <Text style={styles.emptyButtonText}>Create Training Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const weeklySchedule = plan.program_structure?.weeklySchedule || [];
  const weeklySummary = plan.program_structure?.weeklySummaries?.[selectedWeek];
  const currentWeekWorkouts = allWorkouts.filter(w => w.week_number === selectedWeek);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Full Program</Text>
          <Text style={styles.headerSubtitle}>{plan.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Program Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Program Overview</Text>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Duration:</Text>
            <Text style={styles.overviewValue}>{plan.duration_weeks} weeks</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Split:</Text>
            <Text style={styles.overviewValue}>{plan.split_type}</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Training Days:</Text>
            <Text style={styles.overviewValue}>{plan.training_days_per_week}/week</Text>
          </View>
          <View style={styles.overviewRow}>
            <Text style={styles.overviewLabel}>Current Week:</Text>
            <Text style={styles.overviewValue}>Week {plan.current_week}</Text>
          </View>
          {plan.program_structure?.programOverview && (
            <Text style={styles.programDescription}>{plan.program_structure.programOverview}</Text>
          )}
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelectorContainer}>
          <Text style={styles.sectionTitle}>Select Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScrollView}>
            {Array.from({ length: plan.duration_weeks || 12 }, (_, i) => i + 1).map(week => (
              <TouchableOpacity
                key={week}
                style={[
                  styles.weekButton,
                  selectedWeek === week && styles.weekButtonActive,
                  plan.current_week === week && styles.weekButtonCurrent,
                ]}
                onPress={() => setSelectedWeek(week)}
              >
                <Text style={[
                  styles.weekButtonText,
                  selectedWeek === week && styles.weekButtonTextActive,
                ]}>
                  {week}
                </Text>
                {plan.current_week === week && (
                  <Text style={styles.weekButtonLabel}>Current</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Weekly Summary */}
        {weeklySummary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Week {selectedWeek} Focus</Text>
            <Text style={styles.summaryText}>{weeklySummary}</Text>
          </View>
        )}

        {/* Weekly Schedule */}
        <View style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          {weeklySchedule.map((day, index) => (
            <View key={index} style={styles.scheduleRow}>
              <Text style={styles.scheduleDay}>Day {index + 1}:</Text>
              <Text style={[
                styles.scheduleWorkout,
                day.toLowerCase() === 'rest' && styles.scheduleRest
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Week's Workouts */}
        <View style={styles.workoutsSection}>
          <Text style={styles.sectionTitle}>Week {selectedWeek} Workouts</Text>

          {currentWeekWorkouts.length === 0 ? (
            <View style={styles.emptyWorkouts}>
              <Text style={styles.emptyWorkoutsText}>
                Workout details for this week are being generated...
              </Text>
            </View>
          ) : (
            currentWeekWorkouts.map(workout => {
              const isExpanded = expandedWorkouts.has(workout.id);
              const isRest = workout.workout_name.toLowerCase() === 'rest';

              if (isRest) {
                return (
                  <View key={workout.id} style={styles.restWorkoutCard}>
                    <Text style={styles.restEmoji}>😌</Text>
                    <Text style={styles.restText}>Rest Day</Text>
                  </View>
                );
              }

              return (
                <View key={workout.id} style={styles.workoutCard}>
                  <TouchableOpacity
                    onPress={() => toggleWorkoutExpanded(workout.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workoutHeader}>
                      <View>
                        <Text style={styles.workoutName}>{workout.workout_name}</Text>
                        <Text style={styles.workoutMeta}>
                          {workout.total_exercises} exercises • ~{workout.estimated_duration_minutes} min
                        </Text>
                      </View>
                      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && workout.exercises && workout.exercises.length > 0 && (
                    <View style={styles.exercisesList}>
                      {workout.exercises.map((ex: any, idx: number) => (
                        <View key={idx} style={styles.exerciseRow}>
                          <View style={styles.exerciseNumber}>
                            <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                          </View>
                          <View style={styles.exerciseDetails}>
                            <Text style={styles.exerciseName}>{ex.exerciseName || 'Exercise'}</Text>
                            <Text style={styles.exerciseStats}>
                              {ex.sets || 0} sets × {ex.reps || 0} reps
                              {ex.rpe && ` @ RPE ${ex.rpe}`}
                              {ex.restSeconds && ` • ${ex.restSeconds}s rest`}
                            </Text>
                            {ex.coachingCues && (
                              <Text style={styles.exerciseCues}>💡 {ex.coachingCues}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {isExpanded && (!workout.exercises || workout.exercises.length === 0) && (
                    <View style={styles.exercisesList}>
                      <Text style={styles.emptyWorkoutsText}>
                        Exercise details are being generated...
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Periodization Info */}
        {plan.program_structure?.periodization && (
          <View style={styles.periodizationCard}>
            <Text style={styles.sectionTitle}>Periodization Strategy</Text>
            {plan.program_structure.periodization.map((block: any, idx: number) => (
              <View key={idx} style={styles.periodBlock}>
                <Text style={styles.periodWeeks}>
                  Weeks {block.weekStart}-{block.weekEnd}
                </Text>
                <Text style={styles.periodPhase}>{block.phase}</Text>
                <Text style={styles.periodFocus}>{block.focus}</Text>
                <Text style={styles.periodIntensity}>
                  Intensity: {block.intensityRange} • Volume: {block.volumeModifier}x
                </Text>
              </View>
            ))}
          </View>
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
    padding: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
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
  overviewCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  overviewTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  overviewLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  overviewValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  programDescription: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  weekSelectorContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  weekScrollView: {
    marginTop: theme.spacing.sm,
  },
  weekButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  weekButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  weekButtonCurrent: {
    borderColor: theme.colors.secondary,
    borderWidth: 2,
  },
  weekButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  weekButtonTextActive: {
    color: theme.colors.background,
  },
  weekButtonLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.secondary,
    marginTop: 2,
    fontWeight: theme.fontWeight.semibold,
  },
  weekNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  summaryCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  summaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  scheduleCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  scheduleDay: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  scheduleWorkout: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  scheduleRest: {
    color: theme.colors.textMuted,
  },
  workoutsSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  emptyWorkouts: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptyWorkoutsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  workoutCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
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
  expandIcon: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  restWorkoutCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  restEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  restText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  exercisesList: {
    padding: theme.spacing.lg,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  exerciseRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  exerciseNumberText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  exerciseStats: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  exerciseCues: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  periodizationCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  periodBlock: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  periodWeeks: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  periodPhase: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  periodFocus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  periodIntensity: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
});
