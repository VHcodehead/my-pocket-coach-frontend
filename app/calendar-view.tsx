// Calendar View - Edit current week's food logs (Sunday-Saturday only)
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { foodLogAPI } from '../src/services/api';
import { theme } from '../src/theme';
import { DailyFoodLog } from '../src/types';

export default function CalendarViewScreen() {
  const router = useRouter();
  const [weekLogs, setWeekLogs] = useState<DailyFoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DailyFoodLog | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  useEffect(() => {
    loadCurrentWeek();
  }, []);

  // Refresh when screen comes into focus (after logging food)
  useFocusEffect(
    useCallback(() => {
      console.log('[CALENDAR_VIEW] Screen focused - refreshing data');
      loadCurrentWeek();
    }, [])
  );

  const loadCurrentWeek = async () => {
    try {
      setLoading(true);

      // Get current week dates (Sunday-Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - dayOfWeek);

      const weekDates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        // Format date as YYYY-MM-DD using local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        weekDates.push(`${year}-${month}-${day}`);
      }

      // Fetch logs for each day
      const logsPromises = weekDates.map(async (date) => {
        try {
          const response = await foodLogAPI.getDate(date);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (err) {
          console.log(`[CALENDAR] No data for ${date}`);
        }
        // Return empty day if no logs
        return {
          date,
          entries: [],
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          targets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        };
      });

      const logs = await Promise.all(logsPromises);
      setWeekLogs(logs);
    } catch (error) {
      console.error('[CALENDAR_VIEW] Error:', error);
      Alert.alert('Error', 'Failed to load week data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    Alert.alert(
      'Delete Entry?',
      'Remove this meal from the log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await foodLogAPI.deleteEntry(entryId);
              await loadCurrentWeek();
              setShowDayModal(false);
              Alert.alert('Deleted', 'Meal entry removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDate();
  };

  const isToday = (dateStr: string) => {
    // Get today's date using local date components
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    return dateStr === todayStr;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading week...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calendar View</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Current Week (Sun-Sat)</Text>
        <Text style={styles.infoSubtitle}>Tap to view/edit meals</Text>
      </View>

      <ScrollView style={styles.scroll}>
        {weekLogs.map((day) => {
          const hasEntries = day.entries && day.entries.length > 0;
          const pct = day.targets.calories > 0
            ? Math.round((day.totals.calories / day.targets.calories) * 100)
            : 0;

          return (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCard,
                isToday(day.date) && styles.dayCardToday,
                !hasEntries && styles.dayCardEmpty,
              ]}
              onPress={() => {
                setSelectedDay(day);
                setShowDayModal(true);
              }}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, isToday(day.date) && styles.dayNameToday]}>
                  {getDayName(day.date)}
                </Text>
                <Text style={[styles.dayNum, isToday(day.date) && styles.dayNumToday]}>
                  {getDayNumber(day.date)}
                </Text>
              </View>

              {hasEntries ? (
                <View>
                  <Text style={styles.dayCal}>{Math.round(day.totals.calories)} cal</Text>
                  <Text style={styles.dayMacro}>
                    P: {Math.round(day.totals.protein)}g | C: {Math.round(day.totals.carbs)}g | F: {Math.round(day.totals.fat)}g
                  </Text>
                  <Text style={styles.dayCount}>{day.entries.length} meals</Text>
                  {pct > 0 && <Text style={styles.dayPct}>{pct}% target</Text>}
                </View>
              ) : (
                <Text style={styles.dayEmpty}>No meals logged</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        {selectedDay && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {getDayName(selectedDay.date)}, {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            <View style={styles.modalSummary}>
              <View style={styles.sumItem}>
                <Text style={styles.sumLabel}>Calories</Text>
                <Text style={styles.sumValue}>
                  {Math.round(selectedDay.totals.calories)} / {Math.round(selectedDay.targets.calories)}
                </Text>
              </View>
              <View style={styles.sumItem}>
                <Text style={styles.sumLabel}>Protein</Text>
                <Text style={styles.sumValue}>
                  {Math.round(selectedDay.totals.protein)}g / {Math.round(selectedDay.targets.protein)}g
                </Text>
              </View>
              <View style={styles.sumItem}>
                <Text style={styles.sumLabel}>Carbs</Text>
                <Text style={styles.sumValue}>
                  {Math.round(selectedDay.totals.carbs)}g / {Math.round(selectedDay.targets.carbs)}g
                </Text>
              </View>
              <View style={styles.sumItem}>
                <Text style={styles.sumLabel}>Fat</Text>
                <Text style={styles.sumValue}>
                  {Math.round(selectedDay.totals.fat)}g / {Math.round(selectedDay.targets.fat)}g
                </Text>
              </View>
            </View>

            <ScrollView style={styles.modalList}>
              {selectedDay.entries && selectedDay.entries.length > 0 ? (
                selectedDay.entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryTop}>
                      <Text style={styles.entryMeal}>{entry.meal_type}</Text>
                      <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                        <Text style={styles.entryDel}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.entryFood}>{entry.food_name}</Text>
                    <Text style={styles.entryMacro}>
                      {Math.round(entry.calories)} cal • {Math.round(entry.protein)}p • {Math.round(entry.carbs)}c • {Math.round(entry.fat)}f
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyMeals}>
                  <Text style={styles.emptyText}>No meals logged</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setShowDayModal(false);
                router.push(`/food-search?date=${selectedDay.date}`);
              }}
            >
              <Text style={styles.addButtonText}>+ Add Meal to This Day</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { color: theme.colors.primary, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, marginRight: theme.spacing.md },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  info: { padding: theme.spacing.xl, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  infoTitle: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  infoSubtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.textSecondary, fontSize: theme.fontSize.lg },
  scroll: { flex: 1, padding: theme.spacing.md },
  dayCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md, borderWidth: 2, borderColor: theme.colors.border, ...theme.shadows.sm },
  dayCardToday: { borderColor: theme.colors.primary, borderWidth: 3, ...theme.shadows.neon },
  dayCardEmpty: { opacity: 0.6 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm },
  dayName: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase' },
  dayNameToday: { color: theme.colors.primary, fontWeight: theme.fontWeight.bold },
  dayNum: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  dayNumToday: { color: theme.colors.primary },
  dayCal: { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  dayMacro: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  dayCount: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: theme.spacing.xs },
  dayPct: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, color: theme.colors.encouragement, marginTop: theme.spacing.xs },
  dayEmpty: { fontSize: theme.fontSize.md, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing.md },
  modal: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.xl, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalClose: { fontSize: 24, color: theme.colors.text, marginRight: theme.spacing.md },
  modalTitle: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  modalSummary: { flexDirection: 'row', justifyContent: 'space-around', padding: theme.spacing.lg, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sumItem: { alignItems: 'center' },
  sumLabel: { fontSize: theme.fontSize.xs, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  sumValue: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
  modalList: { flex: 1, padding: theme.spacing.md },
  entryCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, marginBottom: theme.spacing.sm },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  entryMeal: { fontSize: theme.fontSize.xs, color: theme.colors.primary, textTransform: 'uppercase', fontWeight: theme.fontWeight.bold },
  entryDel: { color: theme.colors.error, fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold },
  entryFood: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.text, marginBottom: theme.spacing.xs },
  entryMacro: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary },
  emptyMeals: { padding: theme.spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.textMuted },
  addButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.lg, margin: theme.spacing.lg, borderRadius: theme.borderRadius.lg, alignItems: 'center', ...theme.shadows.neon },
  addButtonText: { color: theme.colors.background, fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold },
});
