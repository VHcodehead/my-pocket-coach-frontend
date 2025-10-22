// Meal Plan - View your personalized weekly meal plan
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../src/theme';
import { mealPlanAPI, authAPI } from '../src/services/api';

// Import SVG icons
import ClipboardIcon from '../assets/icons/clipboard-icon.svg';
import AlarmClockIcon from '../assets/icons/alarm-clock.svg';
import LightBulbIcon from '../assets/icons/light-bulb-icon.svg';
import PrepTipIcon from '../assets/icons/prep-tip-icon.svg';
import DiceIcon from '../assets/icons/dice-icon.svg';

interface DailyMeal {
  title: string;
  items: {
    name: string;
    grams: number;
    displayName: string;
    serving: string;
  }[];
  timing?: string;
  prepTips?: string[];
  hydration?: string;
  coachNotes?: string;
  _context?: {
    purpose: string;
    macroFocus: string;
    energyLevel: string;
    calorieTarget: number;
  };
}

export default function MealPlanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [dailyMeals, setDailyMeals] = useState<DailyMeal[]>([]);

  useEffect(() => {
    loadMealPlan();
  }, []);

  const loadMealPlan = async () => {
    try {
      // Fetch both meal plan and user profile to get totals
      const [mealPlanResponse, profileResponse] = await Promise.all([
        mealPlanAPI.getCurrent(),
        authAPI.getProfile(),
      ]);

      console.log('[MEAL_PLAN] Meal plan response:', JSON.stringify(mealPlanResponse, null, 2));
      console.log('[MEAL_PLAN] Profile response:', JSON.stringify(profileResponse, null, 2));

      if (mealPlanResponse.success && mealPlanResponse.data) {
        // Get totals from user profile's current_meal_plan
        const planTotals = profileResponse?.data?.current_meal_plan?.totals;

        const fullPlan = {
          plan: mealPlanResponse.data.plan,
          totals: planTotals, // Store totals from profile
          targets: mealPlanResponse.data.targets,
        };

        setMealPlan(fullPlan);

        // Backend returns flat array of daily meals (breakfast, lunch, dinner, snacks)
        if (mealPlanResponse.data.plan && Array.isArray(mealPlanResponse.data.plan)) {
          // Sort meals by actual timing
          const sortedMeals = [...mealPlanResponse.data.plan].sort((a, b) => {
            const getTimeValue = (meal: DailyMeal) => {
              // Check both timing and title fields for time info
              const timingStr = (meal.timing || '').toLowerCase();
              const titleStr = (meal.title || '').toLowerCase();
              const combinedStr = `${timingStr} ${titleStr}`;

              // Extract hour from timing (e.g., "7-8 am" → 7, "4-5 pm" → 16)
              const amMatch = combinedStr.match(/(\d+)(?:-\d+)?\s*am/i);
              const pmMatch = combinedStr.match(/(\d+)(?:-\d+)?\s*pm/i);

              if (pmMatch) {
                const hour = parseInt(pmMatch[1]);
                const time24 = hour === 12 ? 12 : hour + 12; // Convert to 24hr
                console.log(`[MEAL_SORT] PM match: ${meal.title} → hour ${hour} → 24hr ${time24}`);
                return time24;
              }
              if (amMatch) {
                const hour = parseInt(amMatch[1]);
                const time24 = hour === 12 ? 0 : hour; // 12 am = midnight = 0
                console.log(`[MEAL_SORT] AM match: ${meal.title} → hour ${hour} → 24hr ${time24}`);
                return time24;
              }

              // Fallback to keyword-based ordering if no time found
              if (titleStr.includes('breakfast')) {
                console.log(`[MEAL_SORT] Keyword match: ${meal.title} → breakfast → 7`);
                return 7;
              }
              if (titleStr.includes('lunch')) {
                console.log(`[MEAL_SORT] Keyword match: ${meal.title} → lunch → 12`);
                return 12;
              }
              if (titleStr.includes('afternoon') || titleStr.includes('4')) {
                console.log(`[MEAL_SORT] Keyword match: ${meal.title} → afternoon → 16`);
                return 16;
              }
              if (titleStr.includes('dinner') || titleStr.includes('evening')) {
                console.log(`[MEAL_SORT] Keyword match: ${meal.title} → dinner → 18`);
                return 18;
              }
              if (titleStr.includes('snack')) {
                console.log(`[MEAL_SORT] Keyword match: ${meal.title} → snack → 10`);
                return 10; // Default mid-morning snack
              }
              console.log(`[MEAL_SORT] No match: ${meal.title} → 99`);
              return 99;
            };

            const timeA = getTimeValue(a);
            const timeB = getTimeValue(b);
            console.log(`[MEAL_SORT] Comparing ${a.title} (${timeA}) vs ${b.title} (${timeB})`);
            return timeA - timeB;
          });

          console.log('[MEAL_SORT] Final sorted order:', sortedMeals.map(m => `${m.title} (${m.timing})`));
          setDailyMeals(sortedMeals);
        }
      }
    } catch (error) {
      console.error('[MEAL_PLAN] Error loading meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMealPlan();
    setRefreshing(false);
  };

  const generateNewVariation = async () => {
    try {
      setGenerating(true);
      console.log('[MEAL_PLAN] Generating new meal plan variation...');

      // Fetch user profile to get current parameters
      const profileResponse = await authAPI.getProfile();

      if (!profileResponse.success || !profileResponse.data) {
        throw new Error('Failed to fetch profile');
      }

      const profile = profileResponse.data;

      // Prepare profile data for plan generation
      const planProfile = {
        weight: profile.weight,
        bodyfat: profile.bodyfat,
        activity: profile.activity || 1.2,
        goal: profile.goal || 'recomp',
        mealsPerDay: profile.meals_per_day || 4,
        sex: profile.sex,
        age: profile.age,
        height_cm: profile.height_cm,
      };

      // Prepare diet preferences
      const dietType = profile.diet_type || 'standard';
      const diet = {
        vegetarian: dietType === 'vegetarian',
        vegan: dietType === 'vegan',
        keto: dietType === 'keto',
        allergens: profile.allergens || [],
        mustInclude: profile.must_include || [],
        avoid: profile.dislikes || [],
      };

      console.log('[MEAL_PLAN] Calling generate with:', { planProfile, diet });

      // Generate new meal plan (backend will use adjusted macros from database)
      const generateResponse = await mealPlanAPI.generate({
        profile: planProfile,
        diet: diet,
      });

      if (generateResponse.success) {
        console.log('[MEAL_PLAN] ✅ New variation generated successfully');
        // Reload the meal plan to show the new variation
        await loadMealPlan();
      } else {
        throw new Error('Plan generation failed');
      }
    } catch (error: any) {
      console.error('[MEAL_PLAN] Error generating new variation:', error);
      alert('Failed to generate new meal plan variation. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Meal Plan', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your meal plan...</Text>
        </View>
      </View>
    );
  }

  if (!mealPlan) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Meal Plan', headerShown: true }} />
        <View style={styles.emptyContainer}>
          <ClipboardIcon width={64} height={64} fill={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
          <Text style={styles.emptyText}>
            Complete your weekly check-in to generate your personalized meal plan
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/weekly-checkin')}
          >
            <Text style={styles.emptyButtonText}>Start Check-In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate targets from meal plan totals fetched from user profile
  let dailyTargets = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  // Use totals from current_meal_plan.totals (fetched from profile)
  const planTotals = mealPlan?.totals;

  if (planTotals?.p) {
    // Use totals from the meal plan itself (stored in current_meal_plan.totals)
    dailyTargets.protein = planTotals.p;
    dailyTargets.carbs = planTotals.c;
    dailyTargets.fat = planTotals.f;
    dailyTargets.calories = (dailyTargets.protein * 4) + (dailyTargets.carbs * 4) + (dailyTargets.fat * 9);
  } else if (dailyMeals && dailyMeals.length > 0) {
    // Fallback: sum calories from all meals
    dailyTargets.calories = dailyMeals.reduce(
      (sum, meal) => sum + (meal._context?.calorieTarget || 0),
      0
    );
    // Use bodyweight as protein target (1g per lb bodyweight)
    dailyTargets.protein = 170; // Default estimate
    dailyTargets.carbs = Math.round((dailyTargets.calories * 0.40) / 4);
    dailyTargets.fat = Math.round((dailyTargets.calories * 0.30) / 9);
  } else {
    // Last fallback
    dailyTargets = {
      calories: 2000,
      protein: 150,
      carbs: 200,
      fat: 65,
    };
  }

  console.log('[MEAL_PLAN] Targets calculation:', {
    hasPlanTotals: !!planTotals?.p,
    planTotals,
    calculatedTargets: dailyTargets
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Your Meal Plan', headerShown: true }} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Meal Plan</Text>
          <Text style={styles.headerSubtitle}>
            Personalized nutrition plan to hit your goals
          </Text>
        </View>

        {/* Meal Plan Targets */}
        <View style={styles.targetsCard}>
          <Text style={styles.targetsTitle}>Meal Plan Targets</Text>
          <Text style={styles.targetsSubtitle}>
            Your base weekly targets. Daily targets may be slightly different based on how yesterday went.
          </Text>
          <View style={styles.targetsGrid}>
            <View style={styles.targetItem}>
              <Text style={[styles.targetValue, { color: theme.colors.calories }]}>
                {Math.round(dailyTargets.calories)}
              </Text>
              <Text style={styles.targetLabel}>Calories</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetValue, { color: theme.colors.protein }]}>
                {Math.round(dailyTargets.protein)}g
              </Text>
              <Text style={styles.targetLabel}>Protein</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetValue, { color: theme.colors.carbs }]}>
                {Math.round(dailyTargets.carbs)}g
              </Text>
              <Text style={styles.targetLabel}>Carbs</Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetValue, { color: theme.colors.fat }]}>
                {Math.round(dailyTargets.fat)}g
              </Text>
              <Text style={styles.targetLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Daily Meal Plan */}
        {dailyMeals && dailyMeals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Daily Meal Plan</Text>
            <Text style={styles.sectionSubtitle}>
              Follow this plan daily. Macros auto-adjust weekly based on your progress.
            </Text>

            {dailyMeals.map((meal, index) => (
              <View key={index} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  {meal._context?.calorieTarget && (
                    <Text style={styles.mealCalories}>
                      {Math.round(meal._context.calorieTarget)} cal
                    </Text>
                  )}
                </View>

                {/* Timing */}
                {meal.timing && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AlarmClockIcon width={14} height={14} fill={theme.colors.textMuted} />
                    <Text style={styles.mealTiming}>{meal.timing}</Text>
                  </View>
                )}

                {/* Food Items */}
                <View style={styles.itemsContainer}>
                  {meal.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName}>• {item.displayName}</Text>
                      <Text style={styles.itemServing}>{item.serving}</Text>
                    </View>
                  ))}
                </View>

                {/* Coach Notes */}
                {meal.coachNotes && (
                  <View style={styles.coachNotesBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <LightBulbIcon width={14} height={14} fill={theme.colors.primary} />
                      <Text style={styles.coachNotesLabel}>Coach Note:</Text>
                    </View>
                    <Text style={styles.coachNotesText}>{meal.coachNotes}</Text>
                  </View>
                )}

                {/* Prep Tips */}
                {meal.prepTips && meal.prepTips.length > 0 && (
                  <View style={styles.prepTipsBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <PrepTipIcon width={14} height={14} fill={theme.colors.encouragement} />
                      <Text style={styles.prepTipsLabel}>Prep Tips:</Text>
                    </View>
                    {meal.prepTips.map((tip, tipIdx) => (
                      <Text key={tipIdx} style={styles.prepTip}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          // No meal plan yet
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Meal Plan</Text>
            <View style={styles.infoCard}>
              <ClipboardIcon width={48} height={48} fill={theme.colors.primary} />
              <Text style={styles.infoText}>
                Your personalized meal plan will be generated after your first weekly check-in!
              </Text>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <LightBulbIcon width={20} height={20} fill={theme.colors.primary} />
            <Text style={styles.tipsTitle}>Pro Tips</Text>
          </View>
          <Text style={styles.tipText}>• Your macros auto-adjust every weekly check-in based on progress</Text>
          <Text style={styles.tipText}>• Prep meals in bulk to save time during the week</Text>
          <Text style={styles.tipText}>• You can swap similar foods (chicken ↔ turkey, rice ↔ pasta)</Text>
          <Text style={styles.tipText}>• Hit your protein target first, then adjust carbs/fats as needed</Text>
        </View>

        {/* Generate New Variation Button */}
        <TouchableOpacity
          style={[styles.generateButton, generating && styles.generateButtonDisabled]}
          onPress={generateNewVariation}
          disabled={generating}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <DiceIcon width={20} height={20} fill={theme.colors.background} />
            <Text style={styles.generateButtonText}>
              {generating ? 'Generating New Variation...' : 'Generate New Variation'}
            </Text>
          </View>
          <Text style={styles.generateButtonSubtext}>
            Get a fresh meal plan with the same macros
          </Text>
        </TouchableOpacity>

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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  header: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  targetsCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  targetsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  targetsSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  targetItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  targetValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  targetLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  section: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mealTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  mealCalories: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.calories,
  },
  mealTiming: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
  },
  itemsContainer: {
    marginVertical: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  itemName: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
  },
  itemServing: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  coachNotesBox: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  coachNotesLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  coachNotesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  prepTipsBox: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  prepTipsLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  prepTip: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsCard: {
    backgroundColor: theme.colors.encouragement + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  tipsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  generateButton: {
    backgroundColor: theme.colors.secondary || theme.colors.primary,
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
    marginBottom: theme.spacing.xs,
  },
  generateButtonSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.background,
    opacity: 0.9,
  },
});
