// Food search screen with DB + Edamam autocomplete
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/theme';
import config from '../src/config';
import { foodLogAPI } from '../src/services/api';
import { getRecentFoods, RecentFood } from '../src/utils/recentFoods';
import { DailyFoodLog } from '../src/types';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';
import { getMealCompletionSuggestions, MealSuggestion } from '../src/utils/mealPairing';
import { haptic } from '../src/utils/haptics';
import { showToast } from '../src/utils/toast';

// Import SVG icons
import LightBulbIcon from '../assets/icons/light-bulb-icon.svg';
import LightningBoltIcon from '../assets/icons/lightning-bolt-icon.svg';

interface FoodResult {
  name: string;
  p: number;  // protein
  c: number;  // carbs
  f: number;  // fat
  kcal: number;  // calories
  source?: 'db' | 'edamam';
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.mealType as string || 'breakfast';
  const targetDate = params.date as string | undefined; // Optional date for backdating entries

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [foodFilter, setFoodFilter] = useState<'all' | 'wholefoods' | 'fastfood'>('all');

  // Serving size modal
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState<'g' | 'oz' | 'serving'>('g');
  const [logging, setLogging] = useState(false);

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        console.log('[FOOD_SEARCH] Searching:', query, 'Filter:', foodFilter);
        const filterParam = foodFilter !== 'all' ? `&filter=${foodFilter}` : '';
        const response = await fetch(`${config.API_URL}/foods/lookup?q=${encodeURIComponent(query)}${filterParam}`);
        const data = await response.json();

        if (Array.isArray(data)) {
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('[FOOD_SEARCH] Error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    setDebounceTimer(timer);
  }, [debounceTimer, foodFilter]);

  // Re-search when filter changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch(searchQuery);
    }
  }, [foodFilter]);

  useEffect(() => {
    loadRecentFoods();
    loadTodayLog();
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const loadRecentFoods = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data) {
        const recent = getRecentFoods(response.data);
        setRecentFoods(recent);
      }
    } catch (error) {
      console.error('[FOOD_SEARCH] Error loading recent foods:', error);
    }
  };

  const loadTodayLog = async () => {
    try {
      const response = await foodLogAPI.getToday();
      if (response.success && response.data) {
        setTodayLog(response.data);
        // Generate meal completion suggestions
        const suggestions = getMealCompletionSuggestions(
          response.data,
          mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack'
        );
        setMealSuggestions(suggestions);
      }
    } catch (error) {
      console.error('[FOOD_SEARCH] Error loading today log:', error);
    }
  };

  const handleQuickAddRecent = async (food: RecentFood) => {
    try {
      // Create timestamp normalized to noon local time to avoid timezone issues
      // This ensures the backend extracts the correct date regardless of UTC conversion
      let logTimestamp: string;
      if (targetDate) {
        // Backdating from Calendar View - use target date at noon
        const targetDateObj = new Date(targetDate + 'T12:00:00');
        logTimestamp = targetDateObj.toISOString();
      } else {
        // Current date - use today at noon
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        logTimestamp = today.toISOString();
      }

      await foodLogAPI.createEntry({
        food_name: food.food_name,
        meal_type: mealType as any,
        serving_size: food.serving_size,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        logged_at: logTimestamp,
      });

      Alert.alert(
        SuccessMessages.mealLogged.title,
        `Added ${food.food_name} to your ${mealType}!`,
        [{ text: 'Great!', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('[FOOD_SEARCH] Error quick adding:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const handleSelectFood = (food: FoodResult) => {
    setSelectedFood(food);
    setServingSize('100');
    setServingUnit('g');
  };

  const calculateMacros = () => {
    if (!selectedFood) return { kcal: 0, p: 0, c: 0, f: 0 };

    const multiplier = servingUnit === 'serving' ? 1 : parseFloat(servingSize) / 100;

    return {
      kcal: Math.round(selectedFood.kcal * multiplier),
      p: Math.round(selectedFood.p * multiplier * 10) / 10,
      c: Math.round(selectedFood.c * multiplier * 10) / 10,
      f: Math.round(selectedFood.f * multiplier * 10) / 10,
    };
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;

    const macros = calculateMacros();
    setLogging(true);

    try {
      console.log('[FOOD_SEARCH] Logging food:', selectedFood.name);

      // Create timestamp normalized to noon local time to avoid timezone issues
      // This ensures the backend extracts the correct date regardless of UTC conversion
      let logTimestamp: string;
      if (targetDate) {
        // Backdating from Calendar View - use target date at noon
        const targetDateObj = new Date(targetDate + 'T12:00:00');
        logTimestamp = targetDateObj.toISOString();
      } else {
        // Current date - use today at noon
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        logTimestamp = today.toISOString();
      }

      const response = await foodLogAPI.createEntry({
        food_name: selectedFood.name,
        serving_size: servingUnit === 'serving' ? 1 : parseFloat(servingSize) || 1,
        serving_unit: servingUnit || 'serving',
        calories: macros.kcal,
        protein: macros.p,
        carbs: macros.c,
        fat: macros.f,
        meal_type: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        logged_at: logTimestamp,
      });

      console.log('[FOOD_SEARCH] Response:', response);

      if (response.success) {
        console.log('[FOOD_SEARCH] Food logged successfully');
        haptic.success();
        showToast.success(SuccessMessages.mealLogged.title, SuccessMessages.mealLogged.message);
        setSelectedFood(null);
        router.back();
      } else {
        console.error('[FOOD_SEARCH] Response not successful:', response);
        haptic.error();
        showToast.error('Logging Failed', 'Could not log food entry');
      }
    } catch (error: any) {
      console.error('[FOOD_SEARCH] Log error:', error);
      haptic.error();
      const friendlyError = getUserFriendlyError(error);
      showToast.error(friendlyError.title, friendlyError.message);
    } finally {
      setLogging(false);
    }
  };

  const renderFoodItem = ({ item }: { item: FoodResult }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectFood(item)}>
      <View style={styles.resultHeader}>
        <Text style={styles.foodName}>{item.name}</Text>
        {item.source && (
          <Text style={[styles.sourceTag, item.source === 'edamam' && styles.edamamTag]}>
            {item.source === 'db' ? 'DB' : 'Edamam'}
          </Text>
        )}
      </View>
      <View style={styles.macros}>
        <Text style={styles.macroText}>{Math.round(item.kcal)} cal</Text>
        <Text style={[styles.macroText, { color: theme.colors.protein }]}>P: {Math.round(item.p)}g</Text>
        <Text style={[styles.macroText, { color: theme.colors.carbs }]}>C: {Math.round(item.c)}g</Text>
        <Text style={[styles.macroText, { color: theme.colors.fat }]}>F: {Math.round(item.f)}g</Text>
      </View>
      <Text style={styles.perServing}>per 100g</Text>
    </TouchableOpacity>
  );

  const macros = calculateMacros();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Find Your Food</Text>
        <Text style={styles.subtitle}>Let's log your {mealType} 🍽️</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="What did you eat? (e.g., chicken breast)"
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && (
          <ActivityIndicator style={styles.loadingIcon} color={theme.colors.primary} />
        )}
      </View>

      {/* Food Filter Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, foodFilter === 'all' && styles.filterButtonActive]}
          onPress={() => setFoodFilter('all')}
        >
          <Text style={[styles.filterButtonText, foodFilter === 'all' && styles.filterButtonTextActive]}>
            All Foods
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, foodFilter === 'wholefoods' && styles.filterButtonActive]}
          onPress={() => setFoodFilter('wholefoods')}
        >
          <Text style={[styles.filterButtonText, foodFilter === 'wholefoods' && styles.filterButtonTextActive]}>
            Whole Foods
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, foodFilter === 'fastfood' && styles.filterButtonActive]}
          onPress={() => setFoodFilter('fastfood')}
        >
          <Text style={[styles.filterButtonText, foodFilter === 'fastfood' && styles.filterButtonTextActive]}>
            Fast Food
          </Text>
        </TouchableOpacity>
      </View>

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <Text style={styles.hintText}>Type at least 2 characters to search</Text>
      )}

      {/* Meal Completion Suggestions */}
      {!searchQuery && mealSuggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <LightBulbIcon width={18} height={18} fill={theme.colors.primary} />
            <Text style={styles.suggestionsTitle}>Suggested for This Meal</Text>
          </View>
          {mealSuggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionCard}
              onPress={() => {
                const foodResult: FoodResult = {
                  name: suggestion.food,
                  p: suggestion.macros.protein,
                  c: suggestion.macros.carbs,
                  f: suggestion.macros.fat,
                  kcal: suggestion.macros.calories,
                  source: 'db',
                };
                setSelectedFood(foodResult);
                setServingSize('1');
                setServingUnit('serving');
              }}
            >
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionFood}>{suggestion.food}</Text>
                <Text style={styles.suggestionCals}>{Math.round(suggestion.macros.calories)} cal</Text>
              </View>
              <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
              <View style={styles.suggestionMacros}>
                <Text style={styles.suggestionMacro}>P: {Math.round(suggestion.macros.protein)}g</Text>
                <Text style={styles.suggestionMacro}>C: {Math.round(suggestion.macros.carbs)}g</Text>
                <Text style={styles.suggestionMacro}>F: {Math.round(suggestion.macros.fat)}g</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Foods - Quick Add */}
      {!searchQuery && recentFoods.length > 0 && (
        <View style={styles.recentSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <LightningBoltIcon width={18} height={18} fill={theme.colors.encouragement} />
            <Text style={styles.recentTitle}>Quick Add Recent</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
            {recentFoods.map((food, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentFoodCard}
                onPress={() => handleQuickAddRecent(food)}
              >
                <Text style={styles.recentFoodName}>{food.food_name}</Text>
                <Text style={styles.recentFoodMeta}>{food.serving_size}</Text>
                <Text style={styles.recentFoodMacros}>
                  {Math.round(food.calories)} cal • {Math.round(food.protein)}g P
                </Text>
                <Text style={styles.recentFoodCount}>Logged {food.times_logged}x</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={results}
        renderItem={renderFoodItem}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={styles.resultsList}
        ListEmptyComponent={
          !loading && searchQuery.length >= 2 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>Hmm, can't find that one</Text>
              <Text style={styles.emptySubtext}>Try a different search or use Quick Add</Text>
            </View>
          ) : null
        }
      />

      {/* Serving Size Modal */}
      <Modal
        visible={selectedFood !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFood(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedFood?.name}</Text>

            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[styles.unitButton, servingUnit === 'g' && styles.unitButtonActive]}
                onPress={() => setServingUnit('g')}
              >
                <Text style={[styles.unitButtonText, servingUnit === 'g' && styles.unitButtonTextActive]}>Grams</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, servingUnit === 'oz' && styles.unitButtonActive]}
                onPress={() => setServingUnit('oz')}
              >
                <Text style={[styles.unitButtonText, servingUnit === 'oz' && styles.unitButtonTextActive]}>Ounces</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitButton, servingUnit === 'serving' && styles.unitButtonActive]}
                onPress={() => setServingUnit('serving')}
              >
                <Text style={[styles.unitButtonText, servingUnit === 'serving' && styles.unitButtonTextActive]}>Serving</Text>
              </TouchableOpacity>
            </View>

            {servingUnit !== 'serving' && (
              <View style={styles.servingInput}>
                <Text style={styles.inputLabel}>Amount ({servingUnit}):</Text>
                <TextInput
                  style={styles.input}
                  value={servingSize}
                  onChangeText={setServingSize}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            <View style={styles.macroSummary}>
              <Text style={styles.macroSummaryTitle}>Nutritional Info:</Text>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Calories:</Text>
                <Text style={styles.macroValue}>{macros.kcal} kcal</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={[styles.macroLabel, { color: theme.colors.protein }]}>Protein:</Text>
                <Text style={[styles.macroValue, { color: theme.colors.protein }]}>{macros.p}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={[styles.macroLabel, { color: theme.colors.carbs }]}>Carbs:</Text>
                <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>{macros.c}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={[styles.macroLabel, { color: theme.colors.fat }]}>Fat:</Text>
                <Text style={[styles.macroValue, { color: theme.colors.fat }]}>{macros.f}g</Text>
              </View>
            </View>

            {/* Impact on Daily Targets */}
            {todayLog && (
              <View style={styles.impactSection}>
                <Text style={styles.impactTitle}>📊 Impact on Today's Targets</Text>
                <View style={styles.impactRow}>
                  <Text style={styles.impactLabel}>Calories:</Text>
                  <Text style={styles.impactValue}>
                    {Math.round(todayLog.totals.calories + macros.kcal)} / {Math.round(todayLog.targets.calories)}
                    <Text style={styles.impactDelta}> (+{macros.kcal})</Text>
                  </Text>
                </View>
                <View style={styles.impactRow}>
                  <Text style={[styles.impactLabel, { color: theme.colors.protein }]}>Protein:</Text>
                  <Text style={[styles.impactValue, { color: theme.colors.protein }]}>
                    {Math.round(todayLog.totals.protein + macros.p)}g / {Math.round(todayLog.targets.protein)}g
                    <Text style={styles.impactDelta}> (+{macros.p}g)</Text>
                  </Text>
                </View>
                <View style={styles.impactRow}>
                  <Text style={[styles.impactLabel, { color: theme.colors.carbs }]}>Carbs:</Text>
                  <Text style={[styles.impactValue, { color: theme.colors.carbs }]}>
                    {Math.round(todayLog.totals.carbs + macros.c)}g / {Math.round(todayLog.targets.carbs)}g
                    <Text style={styles.impactDelta}> (+{macros.c}g)</Text>
                  </Text>
                </View>
                <View style={styles.impactRow}>
                  <Text style={[styles.impactLabel, { color: theme.colors.fat }]}>Fat:</Text>
                  <Text style={[styles.impactValue, { color: theme.colors.fat }]}>
                    {Math.round(todayLog.totals.fat + macros.f)}g / {Math.round(todayLog.targets.fat)}g
                    <Text style={styles.impactDelta}> (+{macros.f}g)</Text>
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectedFood(null)}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logButton, logging && styles.logButtonDisabled]}
                onPress={handleLogFood}
                disabled={logging}
              >
                <Text style={styles.logButtonText}>{logging ? '💭 Logging...' : 'Track It! 🎯'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  backButton: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  suggestionsSection: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  suggestionsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  suggestionCard: {
    backgroundColor: theme.colors.encouragement + '15',
    borderWidth: 2,
    borderColor: theme.colors.encouragement,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  suggestionFood: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    flex: 1,
  },
  suggestionCals: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.encouragement,
  },
  suggestionReason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontStyle: 'italic',
  },
  suggestionMacros: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  suggestionMacro: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
  },
  searchContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingRight: 50,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  loadingIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  filterButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  filterButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  filterButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  hintText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  resultsList: {
    padding: theme.spacing.md,
  },
  resultItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  foodName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  sourceTag: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  edamamTag: {
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  macros: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  macroText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  perServing: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    marginTop: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  unitButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  unitButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  unitButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  unitButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  servingInput: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
  },
  macroSummary: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  macroSummaryTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  macroLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  macroValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  logButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  recentSection: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recentTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  recentScroll: {
    flexDirection: 'row',
  },
  recentFoodCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    width: 150,
    ...theme.shadows.sm,
  },
  recentFoodName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recentFoodMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  recentFoodMacros: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recentFoodCount: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  impactSection: {
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  impactTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  impactLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
  impactValue: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  impactDelta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
});
