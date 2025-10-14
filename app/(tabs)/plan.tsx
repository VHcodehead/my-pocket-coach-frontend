// Meal plan screen
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { mealPlanAPI, authAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { getUserFriendlyError } from '../../src/utils/errorMessages';
import { HamburgerMenu } from '../../src/components/HamburgerMenu';

export default function MealPlanScreen() {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  // Load existing meal plan on mount
  useEffect(() => {
    loadExistingPlan();
  }, []);

  const loadExistingPlan = async () => {
    try {
      console.log('[MEAL_PLAN] Loading existing plan from profile');
      const profileResponse = await authAPI.getProfile();

      if (profileResponse.success && profileResponse.data?.current_meal_plan) {
        console.log('[MEAL_PLAN] Found existing plan:', profileResponse.data.current_meal_plan);
        setPlan(profileResponse.data.current_meal_plan);
      } else {
        console.log('[MEAL_PLAN] No existing plan found');
      }
    } catch (error) {
      console.error('[MEAL_PLAN] Error loading existing plan:', error);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    console.log('[MEAL_PLAN] Generating new plan');

    try {
      // Fetch user profile first
      const profileResponse = await authAPI.getProfile();

      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert(
          'Profile Required',
          'Please complete your profile setup in the weekly check-in first.'
        );
        return;
      }

      const profile = profileResponse.data;

      // Generate meal plan with user's profile data
      const response = await mealPlanAPI.generate({
        profile: {
          weight: profile.weight,
          bodyfat: profile.bodyfat,
          activity: profile.activity || 1.5,
          goal: profile.goal || 'recomp',
          mealsPerDay: profile.meals_per_day || 3,
          sex: profile.sex,
          age: profile.age,
          height_cm: profile.height_cm,
        },
        diet: {
          keto: profile.diet_type === 'keto',
          vegetarian: profile.diet_type === 'vegetarian',
          vegan: profile.diet_type === 'vegan',
          halal: profile.diet_type === 'halal',
          kosher: profile.diet_type === 'kosher',
          allergens: profile.allergens || [],
          mustInclude: profile.must_include || [],
          avoid: profile.dislikes || [],
        },
      });

      console.log('[MEAL_PLAN] Response received:', response);

      if (response.success && response.data) {
        console.log('[MEAL_PLAN] Plan generated:', response.data);
        setPlan(response.data);
      } else {
        console.log('[MEAL_PLAN] No data in response:', response);
        Alert.alert('Meal Plan', 'Plan generation completed but no data returned. This feature may still be in development.');
      }
    } catch (error: any) {
      console.error('[MEAL_PLAN] Error:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <HamburgerMenu style={styles.menuButton} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Your Meal Plan</Text>
          <Text style={styles.subtitle}>Personalized meals that fit your goals 🎯</Text>
        </View>
      </View>

      {!plan && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍽️</Text>
          <Text style={styles.emptyTitle}>Ready to Plan Your Week?</Text>
          <Text style={styles.emptyText}>
            I'll create a personalized meal plan based on your goals, preferences, and macro targets. Every meal designed just for you!
          </Text>
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={handleGeneratePlan}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? '💭 Creating your plan...' : "Let's Build It! 🚀"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {plan && (
        <View style={styles.planContainer}>
          <TouchableOpacity
            style={[styles.regenerateButton, loading && styles.buttonDisabled]}
            onPress={handleGeneratePlan}
            disabled={loading}
          >
            <Text style={styles.regenerateButtonText}>
              {loading ? '💭 Regenerating...' : 'Build New Plan 🔄'}
            </Text>
          </TouchableOpacity>

          {/* Macro Targets */}
          {plan.macros && (
            <View style={styles.macrosCard}>
              <Text style={styles.macrosTitle}>Daily Targets 🎯</Text>
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>
                    {Math.round(plan.totals?.kcal || plan.macros.kcal || 0)}
                  </Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(plan.macros.p || 0)}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(plan.macros.c || 0)}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(plan.macros.f || 0)}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}

          {/* Meals */}
          {plan.meals && plan.meals.length > 0 && (
            <View style={styles.mealsSection}>
              <Text style={styles.sectionTitle}>Your Meals 🍽️</Text>
              {plan.meals.map((meal: any, index: number) => (
                <View key={index} style={styles.mealCard}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTitle}>{meal.title || `Meal ${index + 1}`}</Text>
                    {meal.timing && (
                      <Text style={styles.mealTiming}>{meal.timing}</Text>
                    )}
                  </View>

                  {/* Meal Items */}
                  {meal.items && meal.items.length > 0 && (
                    <View style={styles.mealItems}>
                      {meal.items.map((item: any, itemIndex: number) => (
                        <View key={itemIndex} style={styles.mealItem}>
                          <Text style={styles.itemName}>• {item.name}</Text>
                          <Text style={styles.itemAmount}>{item.grams}g</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Prep Tips */}
                  {meal.prepTips && (
                    <View style={styles.tipsSection}>
                      <Text style={styles.tipsTitle}>💡 Prep Tips:</Text>
                      <Text style={styles.tipsText}>{meal.prepTips}</Text>
                    </View>
                  )}

                  {/* Hydration */}
                  {meal.hydration && (
                    <View style={styles.hydrationSection}>
                      <Text style={styles.hydrationText}>💧 {meal.hydration}</Text>
                    </View>
                  )}

                  {/* Coach Notes */}
                  {meal.coachNotes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesText}>🗣️ {meal.coachNotes}</Text>
                    </View>
                  )}

                  {/* Macros */}
                  {meal.macros && (
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacroText}>
                        {Math.round(meal.macros.kcal)} cal • {Math.round(meal.macros.p)}p • {Math.round(meal.macros.c)}c • {Math.round(meal.macros.f)}f
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Daily Totals */}
          {plan.totals && (
            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Daily Totals</Text>
              <Text style={styles.totalsText}>
                {Math.round(plan.totals.kcal)} cal • {Math.round(plan.totals.p)}g protein • {Math.round(plan.totals.c)}g carbs • {Math.round(plan.totals.f)}g fat
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.xl,
    paddingTop: 60,
    gap: theme.spacing.md,
  },
  menuButton: {
    marginTop: 4,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  generateButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  planContainer: {
    padding: theme.spacing.md,
  },
  regenerateButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  regenerateButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  planTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  planDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  macrosCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  macrosTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  mealsSection: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  mealTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  mealTiming: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  mealItems: {
    marginBottom: theme.spacing.md,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  itemName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  itemAmount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  tipsSection: {
    backgroundColor: theme.colors.primary + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  tipsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  tipsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  hydrationSection: {
    marginTop: theme.spacing.sm,
  },
  hydrationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  notesSection: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  mealMacros: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mealMacroText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  totalsCard: {
    backgroundColor: theme.colors.primary + '20',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  totalsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  totalsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
});
