// Meal Prep Mode - Plan and batch log meals for the week
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { foodLogAPI } from '../src/services/api';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';

interface PlannedMeal {
  id: string;
  day: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealPrepScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState({
    mealType: 'breakfast' as 'breakfast' | 'lunch' | 'dinner' | 'snack',
    foodName: '',
    servingSize: '1 serving',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });

  const addMealToPlan = () => {
    if (!newMeal.foodName || !newMeal.calories) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please enter at least the food name and calories!');
      return;
    }

    const meal: PlannedMeal = {
      id: Date.now().toString(),
      day: selectedDay,
      mealType: newMeal.mealType,
      foodName: newMeal.foodName,
      servingSize: newMeal.servingSize,
      calories: parseFloat(newMeal.calories) || 0,
      protein: parseFloat(newMeal.protein) || 0,
      carbs: parseFloat(newMeal.carbs) || 0,
      fat: parseFloat(newMeal.fat) || 0,
    };

    setPlannedMeals([...plannedMeals, meal]);
    setNewMeal({
      mealType: 'breakfast',
      foodName: '',
      servingSize: '1 serving',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    });
    setIsAddingMeal(false);
  };

  const removeMeal = (id: string) => {
    setPlannedMeals(plannedMeals.filter(meal => meal.id !== id));
  };

  const duplicateMealToAllDays = (meal: PlannedMeal) => {
    const duplicates: PlannedMeal[] = DAYS_OF_WEEK
      .filter(day => day !== meal.day)
      .map(day => ({
        ...meal,
        id: `${meal.id}-${day}`,
        day,
      }));

    setPlannedMeals([...plannedMeals, ...duplicates]);
    Alert.alert('Duplicated! 📋', `Added "${meal.foodName}" to all days of the week!`);
  };

  const batchLogMeals = async (day: string) => {
    const mealsForDay = plannedMeals.filter(meal => meal.day === day);

    if (mealsForDay.length === 0) {
      Alert.alert(ErrorMessages.noData.title, `You haven't planned any meals for ${day} yet!`);
      return;
    }

    Alert.alert(
      'Batch Log Meals?',
      `Log all ${mealsForDay.length} planned meals for ${day} to your food diary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Them! 🎯',
          onPress: async () => {
            try {
              for (const meal of mealsForDay) {
                await foodLogAPI.createEntry({
                  food_name: meal.foodName,
                  meal_type: meal.mealType,
                  serving_size: meal.servingSize,
                  calories: meal.calories,
                  protein: meal.protein,
                  carbs: meal.carbs,
                  fat: meal.fat,
                });
              }

              Alert.alert(
                SuccessMessages.mealLogged.title,
                `Successfully logged ${mealsForDay.length} meals to your food diary for ${day}!`,
                [
                  { text: 'View Food Log', onPress: () => router.push('/(tabs)/food-log') },
                  { text: 'Great!' }
                ]
              );
            } catch (error: any) {
              console.error('[MEAL_PREP] Error batch logging:', error);
              const friendlyError = getUserFriendlyError(error);
              Alert.alert(friendlyError.title, friendlyError.message);
            }
          }
        }
      ]
    );
  };

  const getTotalMacrosForDay = (day: string) => {
    const mealsForDay = plannedMeals.filter(meal => meal.day === day);
    return mealsForDay.reduce(
      (totals, meal) => ({
        calories: totals.calories + meal.calories,
        protein: totals.protein + meal.protein,
        carbs: totals.carbs + meal.carbs,
        fat: totals.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const selectedDayMeals = plannedMeals.filter(meal => meal.day === selectedDay);
  const dayTotals = getTotalMacrosForDay(selectedDay);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Meal Prep Mode', headerShown: true }} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Meal Prep Planning 📝</Text>
        <Text style={styles.subtitle}>Plan your week, log in batches, stay consistent!</Text>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS_OF_WEEK.map(day => {
            const dayMealCount = plannedMeals.filter(m => m.day === day).length;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
                  {day.slice(0, 3)}
                </Text>
                {dayMealCount > 0 && (
                  <View style={styles.mealCountBadge}>
                    <Text style={styles.mealCountText}>{dayMealCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Day Totals */}
      {selectedDayMeals.length > 0 && (
        <View style={styles.dayTotals}>
          <Text style={styles.dayTotalsTitle}>{selectedDay} Totals</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{Math.round(dayTotals.calories)}</Text>
              <Text style={styles.macroLabel}>cal</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.protein }]}>
                {Math.round(dayTotals.protein)}g
              </Text>
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>
                {Math.round(dayTotals.carbs)}g
              </Text>
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.fat }]}>
                {Math.round(dayTotals.fat)}g
              </Text>
              <Text style={styles.macroLabel}>fat</Text>
            </View>
          </View>
        </View>
      )}

      {/* Planned Meals List */}
      <View style={styles.mealsSection}>
        <View style={styles.mealsSectionHeader}>
          <Text style={styles.mealsSectionTitle}>
            {selectedDay} Meals ({selectedDayMeals.length})
          </Text>
          {selectedDayMeals.length > 0 && (
            <TouchableOpacity
              style={styles.batchLogButton}
              onPress={() => batchLogMeals(selectedDay)}
            >
              <Text style={styles.batchLogButtonText}>Log All 🎯</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedDayMeals.map(meal => (
          <View key={meal.id} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <View style={styles.mealTypeTag}>
                <Text style={styles.mealTypeText}>{meal.mealType}</Text>
              </View>
              <TouchableOpacity onPress={() => removeMeal(meal.id)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.mealName}>{meal.foodName}</Text>
            <Text style={styles.mealServing}>{meal.servingSize}</Text>
            <View style={styles.mealMacros}>
              <Text style={styles.mealMacro}>{Math.round(meal.calories)} cal</Text>
              <Text style={styles.mealMacro}>P: {Math.round(meal.protein)}g</Text>
              <Text style={styles.mealMacro}>C: {Math.round(meal.carbs)}g</Text>
              <Text style={styles.mealMacro}>F: {Math.round(meal.fat)}g</Text>
            </View>
            <TouchableOpacity
              style={styles.duplicateButton}
              onPress={() => duplicateMealToAllDays(meal)}
            >
              <Text style={styles.duplicateButtonText}>📋 Add to All Days</Text>
            </TouchableOpacity>
          </View>
        ))}

        {selectedDayMeals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No meals planned for {selectedDay}</Text>
            <Text style={styles.emptySubtext}>Tap "Add Meal" below to start planning!</Text>
          </View>
        )}
      </View>

      {/* Add Meal Form */}
      {isAddingMeal ? (
        <View style={styles.addMealForm}>
          <Text style={styles.formTitle}>Add Meal to {selectedDay}</Text>

          <Text style={styles.inputLabel}>Meal Type</Text>
          <View style={styles.mealTypeSelector}>
            {MEAL_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeButton,
                  newMeal.mealType === type && styles.mealTypeButtonActive
                ]}
                onPress={() => setNewMeal({ ...newMeal, mealType: type })}
              >
                <Text style={[
                  styles.mealTypeButtonText,
                  newMeal.mealType === type && styles.mealTypeButtonTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Food Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Grilled Chicken Breast"
            value={newMeal.foodName}
            onChangeText={(text) => setNewMeal({ ...newMeal, foodName: text })}
          />

          <Text style={styles.inputLabel}>Serving Size</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 6 oz"
            value={newMeal.servingSize}
            onChangeText={(text) => setNewMeal({ ...newMeal, servingSize: text })}
          />

          <View style={styles.macroInputRow}>
            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Calories *</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="250"
                keyboardType="numeric"
                value={newMeal.calories}
                onChangeText={(text) => setNewMeal({ ...newMeal, calories: text })}
              />
            </View>
            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="40"
                keyboardType="numeric"
                value={newMeal.protein}
                onChangeText={(text) => setNewMeal({ ...newMeal, protein: text })}
              />
            </View>
          </View>

          <View style={styles.macroInputRow}>
            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="0"
                keyboardType="numeric"
                value={newMeal.carbs}
                onChangeText={(text) => setNewMeal({ ...newMeal, carbs: text })}
              />
            </View>
            <View style={styles.macroInputGroup}>
              <Text style={styles.inputLabel}>Fat (g)</Text>
              <TextInput
                style={styles.inputSmall}
                placeholder="3"
                keyboardType="numeric"
                value={newMeal.fat}
                onChangeText={(text) => setNewMeal({ ...newMeal, fat: text })}
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsAddingMeal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addMealToPlan}
            >
              <Text style={styles.saveButtonText}>Add to Plan ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddingMeal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Meal</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  daySelector: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  dayButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    position: 'relative',
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  dayButtonTextActive: {
    color: theme.colors.primary,
  },
  mealCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.encouragement,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCountText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  dayTotals: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  dayTotalsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  mealsSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  mealsSectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  batchLogButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.neon,
  },
  batchLogButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mealTypeTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  mealTypeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  removeButton: {
    fontSize: 20,
    color: theme.colors.textMuted,
    padding: theme.spacing.xs,
  },
  mealName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  mealServing: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealMacro: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  duplicateButton: {
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.sm,
  },
  duplicateButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  addMealForm: {
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  formTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  mealTypeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  mealTypeButtonActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  mealTypeButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  mealTypeButtonTextActive: {
    color: theme.colors.primary,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  macroInputGroup: {
    flex: 1,
  },
  inputSmall: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  addButton: {
    marginHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  addButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
});
