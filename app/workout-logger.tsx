// Workout logger screen - Log sets during workout
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { trainingAPI } from '../src/services/api';

// Import SVG icons
import LightBulbIcon from '../assets/icons/light-bulb-icon.svg';
import GoalsIcon from '../assets/icons/goals-milestones-icon.svg';
import ClipboardIcon from '../assets/icons/clipboard-icon.svg';
import WeeklyCheckinIcon from '../assets/icons/weekly_checkin_icon.svg';

interface Set {
  setNumber: number;
  logged: boolean;
  actualWeight?: number;
  actualReps?: number;
  rpe?: number;
}

interface Exercise {
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: string | number;
  rpe?: number;
  restSeconds: number;
  notes?: string;
  coachingCues?: string; // NEW: AI-generated coaching cues
  exerciseRationale?: string; // NEW: Why this exercise is in the program
  supersetPair?: string;
  videoUrl?: string;
  formCues?: string[];
  setData: Set[];
}

export default function WorkoutLoggerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Input state
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // UI state
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [showFormCues, setShowFormCues] = useState(false);

  useEffect(() => {
    loadWorkout();
  }, []);

  const loadWorkout = async () => {
    try {
      setLoading(true);
      const response = await trainingAPI.getTodayWorkout();

      if (response.success && response.data) {
        const workoutData = response.data;
        setWorkout(workoutData);

        // Initialize exercise state with empty sets
        const initializedExercises = workoutData.exercises.map((ex: any) => ({
          ...ex,
          setData: Array.from({ length: ex.sets }, (_, i) => ({
            setNumber: i + 1,
            logged: false,
          })),
        }));

        // Load already-logged sets for today and merge with template
        await resumeWorkoutProgress(initializedExercises, workoutData.id);

        // Load weight recommendations
        loadRecommendations(workoutData.id);
      } else {
        Alert.alert('No Workout', 'No workout scheduled for today.');
        router.back();
      }
    } catch (error: any) {
      console.error('[WORKOUT_LOGGER] Load error:', error);
      Alert.alert('Error', 'Failed to load workout. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const resumeWorkoutProgress = async (initializedExercises: Exercise[], workoutTemplateId: number) => {
    try {
      // Fetch today's logged sets from backend
      const today = new Date().toISOString().split('T')[0];
      const historyResponse = await trainingAPI.getHistory({
        date: today,
        workoutTemplateId: workoutTemplateId
      });

      if (historyResponse.success && historyResponse.data?.logs) {
        const loggedSets = historyResponse.data.logs;

        // Merge logged sets with template
        const resumedExercises = initializedExercises.map(ex => {
          // Find all logged sets for this exercise
          const exerciseLogs = loggedSets.filter((log: any) =>
            log.exercise_id === ex.exerciseId ||
            log.exercise_name === ex.exerciseName
          );

          if (exerciseLogs.length > 0) {
            // Update setData with logged information
            const updatedSetData = ex.setData.map(set => {
              const loggedSet = exerciseLogs.find((log: any) => log.set_number === set.setNumber);

              if (loggedSet) {
                return {
                  ...set,
                  logged: true,
                  actualWeight: loggedSet.actual_weight,
                  actualReps: loggedSet.actual_reps,
                  rpe: loggedSet.rpe,
                };
              }
              return set;
            });

            return { ...ex, setData: updatedSetData };
          }

          return ex;
        });

        setExercises(resumedExercises);

        // Find first uncompleted set and navigate to it
        let firstUncompletedFound = false;
        for (let exIdx = 0; exIdx < resumedExercises.length; exIdx++) {
          const exercise = resumedExercises[exIdx];
          const firstUnloggedSetIdx = exercise.setData.findIndex(s => !s.logged);

          if (firstUnloggedSetIdx !== -1) {
            setCurrentExerciseIndex(exIdx);
            setCurrentSetIndex(firstUnloggedSetIdx);
            firstUncompletedFound = true;

            // Show resume notification if user has logged sets
            const totalLogged = resumedExercises.reduce((sum, ex) =>
              sum + ex.setData.filter(s => s.logged).length, 0
            );

            if (totalLogged > 0) {
              Alert.alert(
                '✓ Resuming Workout',
                `You've already logged ${totalLogged} set${totalLogged === 1 ? '' : 's'}. Continuing where you left off!`,
                [{ text: 'Continue', style: 'default' }]
              );
            }
            break;
          }
        }

        // If all sets are logged, show completion
        if (!firstUncompletedFound) {
          const totalSets = resumedExercises.reduce((sum, ex) => sum + ex.sets, 0);
          Alert.alert(
            'Workout Already Complete! 🎉',
            `You've logged all ${totalSets} sets for today's workout.`,
            [
              {
                text: 'View Progress',
                onPress: () => router.push('/training-progress'),
              },
              {
                text: 'Done',
                onPress: () => router.replace('/(tabs)/training'),
              },
            ]
          );
        }
      } else {
        // No logged sets found, use initialized exercises
        setExercises(initializedExercises);
      }
    } catch (error) {
      console.error('[WORKOUT_LOGGER] Resume error:', error);
      // On error, just use initialized exercises (fresh start)
      setExercises(initializedExercises);
    }
  };

  const loadRecommendations = async (workoutTemplateId: number) => {
    try {
      const response = await trainingAPI.getNextWeights(workoutTemplateId);
      if (response.success && response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (error) {
      console.error('[WORKOUT_LOGGER] Recommendations error:', error);
    }
  };

  const getRecommendation = (exerciseId: number) => {
    return recommendations.find(r => r.exerciseId === exerciseId);
  };

  const handleLogSet = async () => {
    const exercise = exercises[currentExerciseIndex];
    const set = exercise.setData[currentSetIndex];

    // Validation
    const trimmedWeight = weight.trim();
    const trimmedReps = reps.trim();

    if (!trimmedWeight || !trimmedReps) {
      Alert.alert('Required', 'Please enter weight and reps');
      return;
    }

    const parsedWeight = parseFloat(trimmedWeight);
    const parsedReps = parseInt(trimmedReps);

    if (isNaN(parsedWeight) || isNaN(parsedReps) || parsedWeight < 0 || parsedReps < 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for weight and reps');
      return;
    }

    try {
      const logData = {
        workoutTemplateId: workout.id,
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        setNumber: set.setNumber,
        actualWeight: parsedWeight,
        actualReps: parsedReps,
        rpe: rpe || undefined,
        notes: notes.trim() || undefined,
      };

      console.log('[WORKOUT_LOGGER] Logging set with data:', JSON.stringify(logData, null, 2));
      console.log('[WORKOUT_LOGGER] Exercise object:', JSON.stringify(exercise, null, 2));

      const response = await trainingAPI.logSet(logData);

      if (response.success) {
        // Update local state
        const updatedExercises = [...exercises];
        updatedExercises[currentExerciseIndex].setData[currentSetIndex] = {
          ...set,
          logged: true,
          actualWeight: parsedWeight,
          actualReps: parsedReps,
          rpe: rpe || undefined,
        };
        setExercises(updatedExercises);

        // Clear inputs
        setNotes('');
        setRpe(null);

        // Move to next set or exercise
        moveToNextSet();

        // Show rest timer if not last set
        if (currentSetIndex < exercise.setData.length - 1 || currentExerciseIndex < exercises.length - 1) {
          startRestTimer(exercise.restSeconds);
        }
      } else {
        Alert.alert('Error', 'Failed to log set. Please try again.');
      }
    } catch (error: any) {
      console.error('[WORKOUT_LOGGER] Log set error:', error);
      Alert.alert('Error', error.message || 'Failed to log set.');
    }
  };

  const moveToNextSet = () => {
    const exercise = exercises[currentExerciseIndex];

    // Check if there are more sets for current exercise
    if (currentSetIndex < exercise.setData.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else if (currentExerciseIndex < exercises.length - 1) {
      // Move to next exercise
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSetIndex(0);
      setWeight(''); // Reset weight for new exercise
      setReps('');
    } else {
      // Workout complete
      handleWorkoutComplete();
    }
  };

  const startRestTimer = (seconds: number) => {
    setRestRemaining(seconds);
    setShowRestTimer(true);

    const interval = setInterval(() => {
      setRestRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowRestTimer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleWorkoutComplete = () => {
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const loggedSets = exercises.reduce((sum, ex) => sum + ex.setData.filter(s => s.logged).length, 0);

    Alert.alert(
      'Workout Complete! 🎉',
      `Great work! You logged ${loggedSets}/${totalSets} sets.`,
      [
        {
          text: 'View Progress',
          onPress: () => router.push('/training-progress'),
        },
        {
          text: 'Done',
          onPress: () => router.replace('/(tabs)/training'),
        },
      ]
    );
  };

  const handleSkipExercise = () => {
    Alert.alert(
      'Skip Exercise',
      'Are you sure you want to skip this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            if (currentExerciseIndex < exercises.length - 1) {
              setCurrentExerciseIndex(prev => prev + 1);
              setCurrentSetIndex(0);
              setWeight('');
              setReps('');
              setRpe(null);
            } else {
              handleWorkoutComplete();
            }
          },
        },
      ]
    );
  };

  const handleFinishEarly = () => {
    Alert.alert(
      'Finish Early',
      'Are you sure you want to end this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => handleWorkoutComplete(),
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  if (!workout || exercises.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No workout data available</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const currentSet = currentExercise.setData[currentSetIndex];
  const recommendation = getRecommendation(currentExercise.exerciseId);
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = exercises.reduce((sum, ex) => sum + ex.setData.filter(s => s.logged).length, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{workout.workout_name}</Text>
          <Text style={styles.headerSubtitle}>
            Week {workout.week_number}, Day {workout.day_number}
          </Text>
        </View>
        <TouchableOpacity onPress={handleFinishEarly} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Deload Week Indicator */}
      {workout.workout_type === 'deload' && (
        <View style={styles.deloadBanner}>
          <Text style={styles.deloadBannerText}>
            🔄 Deload Week - Reduced volume for recovery
          </Text>
        </View>
      )}

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(completedSets / totalSets) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedSets}/{totalSets} sets completed</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exercise Info */}
        <View style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseNameContainer}>
              <Text style={styles.exerciseName}>{currentExercise.exerciseName}</Text>
              <Text style={styles.exerciseNumber}>
                Exercise {currentExerciseIndex + 1}/{exercises.length}
              </Text>
            </View>
            {currentExercise.supersetPair && (
              <View style={styles.supersetBadge}>
                <Text style={styles.supersetText}>Superset {currentExercise.supersetPair}</Text>
              </View>
            )}
          </View>

          {/* Exercise Rationale - Why this exercise */}
          {currentExercise.exerciseRationale && (
            <View style={styles.rationaleCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <LightBulbIcon width={16} height={16} fill={theme.colors.primary} style={{ marginTop: 2 }} />
                <Text style={[styles.rationaleText, { flex: 1 }]}>{currentExercise.exerciseRationale}</Text>
              </View>
            </View>
          )}

          <View style={styles.exerciseDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Target</Text>
              <Text style={styles.detailValue}>{currentExercise.reps} reps</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rest</Text>
              <Text style={styles.detailValue}>{currentExercise.restSeconds}s</Text>
            </View>
            {currentExercise.rpe && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>RPE</Text>
                <Text style={styles.detailValue}>~{currentExercise.rpe}</Text>
              </View>
            )}
          </View>

          {/* Coaching Cues - AI-generated form reminders */}
          {currentExercise.coachingCues && (
            <View style={styles.coachingCuesCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GoalsIcon width={18} height={18} fill={theme.colors.primary} />
                <Text style={styles.coachingCuesLabel}>Coach's Cues:</Text>
              </View>
              <Text style={styles.coachingCuesText}>{currentExercise.coachingCues}</Text>
            </View>
          )}

          {currentExercise.notes && (
            <View style={styles.exerciseNotes}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ClipboardIcon width={18} height={18} fill={theme.colors.textSecondary} />
                <Text style={styles.notesLabel}>This Week:</Text>
              </View>
              <Text style={styles.notesText}>{currentExercise.notes}</Text>
            </View>
          )}

          {currentExercise.formCues && currentExercise.formCues.length > 0 && (
            <TouchableOpacity
              style={styles.formCuesButton}
              onPress={() => setShowFormCues(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <WeeklyCheckinIcon width={18} height={18} fill={theme.colors.primary} />
                <Text style={styles.formCuesButtonText}>View Detailed Form Cues</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Recommendation */}
        {recommendation && (
          <View style={styles.recommendationCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LightBulbIcon width={18} height={18} fill={theme.colors.primary} />
              <Text style={styles.recommendationLabel}>Recommended Weight</Text>
            </View>
            <Text style={styles.recommendationValue}>{recommendation.recommendedWeight} lbs</Text>
            <Text style={styles.recommendationReason}>{recommendation.reasoning}</Text>
          </View>
        )}

        {/* Current Set */}
        <View style={styles.setCard}>
          <Text style={styles.setTitle}>Set {currentSet.setNumber} of {currentExercise.sets}</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.rpeContainer}>
            <Text style={styles.inputLabel}>RPE (optional)</Text>
            <View style={styles.rpeButtons}>
              {[6, 7, 8, 9, 10].map(value => (
                <TouchableOpacity
                  key={value}
                  style={[styles.rpeButton, rpe === value && styles.rpeButtonSelected]}
                  onPress={() => setRpe(value)}
                >
                  <Text style={[styles.rpeButtonText, rpe === value && styles.rpeButtonTextSelected]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logButton, (!weight || !reps) && styles.logButtonDisabled]}
            onPress={handleLogSet}
            disabled={!weight || !reps}
          >
            <Text style={styles.logButtonText}>✓ Log Set</Text>
          </TouchableOpacity>
        </View>

        {/* Previous Sets */}
        {currentExercise.setData.some(s => s.logged) && (
          <View style={styles.previousSetsCard}>
            <Text style={styles.previousSetsTitle}>Previous Sets</Text>
            {currentExercise.setData
              .filter(s => s.logged)
              .map(s => (
                <View key={s.setNumber} style={styles.previousSetRow}>
                  <Text style={styles.previousSetNumber}>Set {s.setNumber}</Text>
                  <Text style={styles.previousSetData}>
                    {s.actualWeight} lbs × {s.actualReps} reps
                    {s.rpe ? ` @ RPE ${s.rpe}` : ''}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Exercise List */}
        <View style={styles.exerciseListCard}>
          <Text style={styles.exerciseListTitle}>Today's Exercises</Text>
          {exercises.map((ex, idx) => {
            const setsCompleted = ex.setData.filter(s => s.logged).length;
            const isActive = idx === currentExerciseIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.exerciseListItem,
                  isActive && styles.exerciseListItemActive,
                ]}
              >
                <Text style={[styles.exerciseListName, isActive && styles.exerciseListNameActive]}>
                  {idx + 1}. {ex.exerciseName}
                </Text>
                <Text style={styles.exerciseListProgress}>
                  {setsCompleted}/{ex.sets}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipExercise}
        >
          <Text style={styles.skipButtonText}>Skip Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Rest Timer Modal */}
      <Modal
        visible={showRestTimer}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.restTimerModal}>
            <Text style={styles.restTimerTitle}>Rest Timer</Text>
            <Text style={styles.restTimerTime}>{formatTime(restRemaining)}</Text>
            <TouchableOpacity
              style={styles.restTimerButton}
              onPress={() => setShowRestTimer(false)}
            >
              <Text style={styles.restTimerButtonText}>Continue Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Form Cues Modal */}
      <Modal
        visible={showFormCues}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formCuesModal}>
            <View style={styles.formCuesHeader}>
              <Text style={styles.formCuesTitle}>Form Cues</Text>
              <TouchableOpacity onPress={() => setShowFormCues(false)}>
                <Text style={styles.formCuesClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formCuesList}>
              {currentExercise.formCues?.map((cue, idx) => (
                <View key={idx} style={styles.formCueItem}>
                  <Text style={styles.formCueBullet}>•</Text>
                  <Text style={styles.formCueText}>{cue}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
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
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  finishButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  finishButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  deloadBanner: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary + '60',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  deloadBannerText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  progressContainer: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  exerciseCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  exerciseNameContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  exerciseNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  supersetBadge: {
    backgroundColor: theme.colors.primary + '30',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  supersetText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  rationaleCard: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  rationaleText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  coachingCuesCard: {
    backgroundColor: theme.colors.secondary + '15',
    borderWidth: 1,
    borderColor: theme.colors.secondary + '40',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  coachingCuesLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachingCuesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  exerciseNotes: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  notesLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  formCuesButton: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  formCuesButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  recommendationCard: {
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  recommendationLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recommendationValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  recommendationReason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  setCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  setTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  rpeContainer: {
    marginBottom: theme.spacing.md,
  },
  rpeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  rpeButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  rpeButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rpeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  rpeButtonTextSelected: {
    color: theme.colors.background,
  },
  logButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  previousSetsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  previousSetsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  previousSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  previousSetNumber: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  previousSetData: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  exerciseListCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  exerciseListTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  exerciseListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  exerciseListItemActive: {
    backgroundColor: theme.colors.primary + '20',
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  exerciseListName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  exerciseListNameActive: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  exerciseListProgress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  skipButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  restTimerModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    width: '80%',
  },
  restTimerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  restTimerTime: {
    fontSize: 72,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
  },
  restTimerButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  restTimerButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  formCuesModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '90%',
    maxHeight: '70%',
  },
  formCuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  formCuesTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  formCuesClose: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
  },
  formCuesList: {
    flex: 1,
  },
  formCueItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  formCueBullet: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  formCueText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
});
