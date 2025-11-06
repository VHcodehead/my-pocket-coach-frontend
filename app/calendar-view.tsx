// Weekly Calendar View - Editable Food Logs + Training Split
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { foodLogAPI, trainingAPI } from '../src/services/api';
import { theme } from '../src/theme';
import { DailyFoodLog } from '../src/types';
import { captureError } from '../src/utils/sentry';

// Import SVG icons
import TrainingIcon from '../assets/icons/training-icon.svg';
import SleepIcon from '../assets/icons/sleep-icon.svg';

interface WeekDay {
  date: Date;
  dateString: string;
  dayOfWeek: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  hasLog: boolean;
  log?: DailyFoodLog;
  workoutName?: string;
}

export default function CalendarViewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [currentWeekWorkouts, setCurrentWeekWorkouts] = useState<any[]>([]);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const trainingResponse = await trainingAPI.getCurrentPlan();
      let workouts: any[] = [];
      if (trainingResponse.success && trainingResponse.data) {
        // Extract currentWeekWorkouts from the response
        workouts = trainingResponse.data.currentWeekWorkouts || [];
        setCurrentWeekWorkouts(workouts);
      } else {
        // Show DETAILED error to user AND send to Sentry
        const errorMsg = `Failed to load training plan: ${trainingResponse.error || 'Unknown error'}\n\nFull response: ${JSON.stringify(trainingResponse, null, 2)}`;
        Alert.alert('Calendar Error', errorMsg);
        console.error('[CALENDAR] Training plan failed:', trainingResponse);
        captureError(new Error(errorMsg), { feature: 'calendar', action: 'load_training', extra: trainingResponse });
      }
      await generateWeek(workouts);
    } catch (error) {
      // Show DETAILED error to user AND send to Sentry
      const errorDetails = error instanceof Error
        ? `${error.message}\n\nStack: ${error.stack?.substring(0, 500)}`
        : String(error);
      Alert.alert('Calendar Error', `Error loading data: ${errorDetails}`);
      console.error('[CALENDAR] Error loading data:', error);
      if (error instanceof Error) {
        captureError(error, { feature: 'calendar', action: 'load_data', extra: { fullError: error } });
      }
    } finally {
      setLoading(false);
    }
  };

  const generateWeek = async (workouts: any[] = currentWeekWorkouts) => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Calculate Sunday of current week
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - currentDayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    // Fetch week's logs
    let weekLogs: DailyFoodLog[] = [];
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data) {
        weekLogs = response.data;
      } else {
        const errorMsg = `Failed to load food logs: ${response.error || 'Unknown error'}\n\nResponse: ${JSON.stringify(response, null, 2)}`;
        Alert.alert('Calendar Error', errorMsg);
        console.error('[CALENDAR] Food logs failed:', response);
        captureError(new Error(errorMsg), { feature: 'calendar', action: 'load_food_logs', extra: response });
      }
    } catch (error) {
      const errorDetails = error instanceof Error
        ? `${error.message}\n\n${error.stack?.substring(0, 300)}`
        : String(error);
      Alert.alert('Calendar Error', `Error fetching logs: ${errorDetails}`);
      console.error('[CALENDAR] Error fetching logs:', error);
      if (error instanceof Error) {
        captureError(error, { feature: 'calendar', action: 'load_food_logs', extra: { fullError: error } });
      }
    }

    // Generate 7 days (Sun - Sat)
    const days: WeekDay[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const log = weekLogs.find(l => l.date === dateString);

      // Get workout for this day from currentWeekWorkouts
      // day_number: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const workout = workouts.find(w => w.day_number === i);
      const workoutName = workout?.workout_name || '';

      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      days.push({
        date,
        dateString,
        dayOfWeek: dayNames[i],
        dayNumber: date.getDate(),
        isToday,
        isPast: date < today && !isToday,
        hasLog: !!log,
        log,
        workoutName,
      });
    }

    setWeekDays(days);
  };

  const toggleDay = async (day: WeekDay) => {
    if (expandedDay === day.dateString) {
      setExpandedDay(null);
    } else {
      setExpandedDay(day.dateString);

      // Fetch day's log if not already loaded
      if (!day.log) {
        try {
          const response = await foodLogAPI.getDate(day.dateString);
          if (response.success && response.data) {
            const updatedDays = weekDays.map(d =>
              d.dateString === day.dateString
                ? { ...d, log: response.data, hasLog: true }
                : d
            );
            setWeekDays(updatedDays);
          }
        } catch (error) {
          console.error('[CALENDAR] Error fetching day log:', error);
        }
      }
    }
  };

  const handleDeleteEntry = async (dayDateString: string, entryId: number) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this food entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await foodLogAPI.deleteEntry(entryId);
              if (response.success) {
                // Refresh the day's log
                const logResponse = await foodLogAPI.getDate(dayDateString);
                if (logResponse.success) {
                  const updatedDays = weekDays.map(d =>
                    d.dateString === dayDateString
                      ? { ...d, log: logResponse.data, hasLog: !!logResponse.data }
                      : d
                  );
                  setWeekDays(updatedDays);
                }
              }
            } catch (error) {
              console.error('[CALENDAR] Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const getWeekRange = () => {
    if (weekDays.length === 0) return '';
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weekly View</Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Weekly View</Text>
          <Text style={styles.headerSubtitle}>{getWeekRange()}</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {weekDays.map((day, index) => (
          <View key={day.dateString} style={styles.dayCard}>
            <TouchableOpacity
              style={[
                styles.dayHeader,
                day.isToday && styles.dayHeaderToday,
                expandedDay === day.dateString && styles.dayHeaderExpanded,
              ]}
              onPress={() => toggleDay(day)}
            >
              <View style={styles.dayHeaderLeft}>
                <Text style={[styles.dayOfWeek, day.isToday && styles.todayText]}>
                  {day.dayOfWeek}
                </Text>
                <Text style={[styles.dayDate, day.isToday && styles.todayText]}>
                  {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>

              <View style={styles.dayHeaderRight}>
                {/* Workout Indicator */}
                {day.workoutName && (
                  <View style={styles.workoutBadge}>
                    {day.workoutName.toLowerCase() === 'rest' ? (
                      <SleepIcon width={16} height={16} fill={theme.colors.text} />
                    ) : (
                      <TrainingIcon width={16} height={16} fill={theme.colors.text} />
                    )}
                    <Text style={styles.workoutBadgeText}>{day.workoutName}</Text>
                  </View>
                )}

                {/* Log Status */}
                {day.hasLog ? (
                  <Text style={styles.loggedIndicator}>✓ Logged</Text>
                ) : day.isPast ? (
                  <Text style={styles.missingIndicator}>No log</Text>
                ) : null}

                <Text style={styles.expandIcon}>
                  {expandedDay === day.dateString ? '▼' : '▶'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expanded Content */}
            {expandedDay === day.dateString && (
              <View style={styles.dayContent}>
                {day.hasLog && day.log ? (
                  <>
                    {/* Macros Summary */}
                    <View style={styles.macroSummary}>
                      <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Calories</Text>
                        <Text style={styles.macroValue}>
                          {Math.round(day.log.total_calories)}
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroValue}>
                          {Math.round(day.log.total_protein)}g
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroValue}>
                          {Math.round(day.log.total_carbs)}g
                        </Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={styles.macroLabel}>Fat</Text>
                        <Text style={styles.macroValue}>
                          {Math.round(day.log.total_fat)}g
                        </Text>
                      </View>
                    </View>

                    {/* Food Entries */}
                    {day.log.entries && day.log.entries.length > 0 && (
                      <View style={styles.entriesSection}>
                        <Text style={styles.entriesSectionTitle}>
                          {day.log.entries.length} item{day.log.entries.length !== 1 ? 's' : ''}
                        </Text>
                        {day.log.entries.map((entry: any, idx: number) => (
                          <View key={idx} style={styles.entryRow}>
                            <View style={styles.entryInfo}>
                              <Text style={styles.entryName}>
                                {entry.food_name || entry.description}
                              </Text>
                              <Text style={styles.entryMacros}>
                                {Math.round(entry.calories)}cal • {Math.round(entry.protein)}p •{' '}
                                {Math.round(entry.carbs)}c • {Math.round(entry.fat)}f
                              </Text>
                            </View>
                            {day.isPast && (
                              <TouchableOpacity
                                onPress={() => handleDeleteEntry(day.dateString, entry.id)}
                                style={styles.deleteButton}
                              >
                                <Text style={styles.deleteButtonText}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Action Buttons for Past Days */}
                    {day.isPast && (
                      <TouchableOpacity
                        style={styles.addFoodButton}
                        onPress={() => {
                          Alert.alert(
                            'Log Food',
                            `Use the Nutrition tab's date selector to log food for ${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. You can navigate to any past day and use photo, barcode, or manual entry.`,
                            [
                              { text: 'OK', style: 'cancel' },
                              {
                                text: 'Go to Nutrition',
                                onPress: () => router.push('/(tabs)/nutrition'),
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={styles.addFoodButtonText}>+ Add Food to This Day</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <View style={styles.noLogSection}>
                    <Text style={styles.noLogText}>No food logged this day</Text>
                    {day.isPast && (
                      <TouchableOpacity
                        style={styles.addFoodButton}
                        onPress={() => {
                          router.push('/(tabs)/nutrition');
                        }}
                      >
                        <Text style={styles.addFoodButtonText}>+ Add Food in Nutrition Tab</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '20',
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  dayCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  dayHeaderToday: {
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  dayHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.textMuted + '20',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayOfWeek: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  dayDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  todayText: {
    color: theme.colors.primary,
  },
  dayHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  workoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.secondary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  workoutBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  loggedIndicator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.success,
    fontWeight: theme.fontWeight.medium,
  },
  missingIndicator: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  expandIcon: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.xs,
  },
  dayContent: {
    padding: theme.spacing.md,
  },
  macroSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.textMuted + '20',
    marginBottom: theme.spacing.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  entriesSection: {
    marginBottom: theme.spacing.md,
  },
  entriesSectionTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.fontWeight.medium,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.textMuted + '10',
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: 2,
  },
  entryMacros: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  deleteButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.sm,
  },
  deleteButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.error,
  },
  addFoodButton: {
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  addFoodButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  noLogSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  noLogText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
  },
});
