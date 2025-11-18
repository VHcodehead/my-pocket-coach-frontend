// Nutrition Hub - Unified nutrition screen
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { foodLogAPI, authAPI } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import { DailyFoodLog, FoodLogEntry } from '../../src/types';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../../src/utils/errorMessages';
import { haptic } from '../../src/utils/haptics';
import { showToast } from '../../src/utils/toast';
import { MacroDonutChart } from '../../src/components/MacroDonutChart';
import { FoodEntrySkeleton } from '../../src/components/SkeletonLoader';
import { copyMealToMultipleDays, getNextNDays, formatDateISO, getFriendlyDateLabel, CopyMealOptions } from '../../src/utils/mealCopy';

// Import SVG icons
import CameraIcon from '../../assets/icons/camera-icon.svg';
import MagnifyingGlassIcon from '../../assets/icons/magnifying-glass-icon.svg';
import ScanIcon from '../../assets/icons/scan-icon.svg';
import ClipboardIcon from '../../assets/icons/clipboard-icon.svg';
import NutritionIcon from '../../assets/icons/nutrition-icon.svg';
import GoalsIcon from '../../assets/icons/goals-milestones-icon.svg';
import BicepIcon from '../../assets/icons/bicep-icon.svg';
import LightBulbIcon from '../../assets/icons/light-bulb-icon.svg';
import QuickAddIcon from '../../assets/icons/quick-add-icon.svg';

export default function NutritionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date()); // Date being viewed/logged to
  const [todayLog, setTodayLog] = useState<DailyFoodLog | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [yesterdayLog, setYesterdayLog] = useState<DailyFoodLog | null>(null);
  const [copying, setCopying] = useState(false);

  // Add form state
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');

  // Validation state
  const [validationHints, setValidationHints] = useState({
    foodName: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  });


  useEffect(() => {
    loadTodayLog();
    loadYesterdayLog();
  }, [selectedDate]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[FOOD_LOG] Screen focused - refreshing data');
      loadTodayLog();
    }, [])
  );

  const loadTodayLog = async () => {
    try {
      const dateString = selectedDate.toISOString().split('T')[0];
      const isToday = dateString === new Date().toISOString().split('T')[0];

      console.log('[FOOD_LOG] Loading log for:', dateString, '(isToday:', isToday, ')');

      const response = isToday
        ? await foodLogAPI.getToday()
        : await foodLogAPI.getDate(dateString);

      console.log('[FOOD_LOG] Full API Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        console.log('[FOOD_LOG] Success! Data structure:', {
          entriesCount: response.data.entries?.length || 0,
          hasTargets: !!response.data.targets,
          targets: response.data.targets,
          totals: response.data.totals
        });
        setTodayLog(response.data);
      } else {
        console.log('[FOOD_LOG] Response not successful or no data');
        setTodayLog(null);
      }
    } catch (error) {
      console.error('[FOOD_LOG] Error loading log:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYesterdayLog = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data && Array.isArray(response.data)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const foundYesterday = response.data.find(log => log.date === yesterdayStr);
        if (foundYesterday && foundYesterday.entries && foundYesterday.entries.length > 0) {
          setYesterdayLog(foundYesterday);
        }
      }
    } catch (error) {
      console.error('[FOOD_LOG] Error loading yesterday:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayLog();
    await loadYesterdayLog();
    setRefreshing(false);
  };

  // Date navigation helpers
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    // Don't allow future dates
    const today = new Date();
    if (newDate <= today) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
  };

  const getDateLabel = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const selectedStr = selectedDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (selectedStr === todayStr) return 'Today';
    if (selectedStr === yesterdayStr) return 'Yesterday';

    return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleCopyYesterday = async () => {
    if (!yesterdayLog || !yesterdayLog.entries) return;

    Alert.alert(
      'Copy Yesterday\'s Meals? 📋',
      `This will copy all ${yesterdayLog.entries.length} meal${yesterdayLog.entries.length > 1 ? 's' : ''} from yesterday to today. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy All',
          onPress: async () => {
            setCopying(true);
            try {
              let successCount = 0;
              for (const entry of yesterdayLog.entries) {
                const response = await foodLogAPI.createEntry({
                  food_name: entry.food_name,
                  meal_type: entry.meal_type,
                  serving_size: entry.serving_size,
                  serving_unit: entry.serving_unit,
                  calories: entry.calories,
                  protein: entry.protein,
                  carbs: entry.carbs,
                  fat: entry.fat,
                  logged_at: new Date().toISOString(),
                });
                if (response.success) successCount++;
              }

              Alert.alert(
                'Success! 🎉',
                `Copied ${successCount} meal${successCount > 1 ? 's' : ''} from yesterday!`,
                [{ text: 'Great!', onPress: () => loadTodayLog() }]
              );
            } catch (error: any) {
              Alert.alert(
                'Copy Issue 📋',
                'Had trouble copying those meals. Mind trying again?'
              );
            } finally {
              setCopying(false);
            }
          },
        },
      ]
    );
  };

  const handleAddFood = async () => {
    if (!foodName || !calories) {
      Alert.alert(ErrorMessages.missingFields.title, 'Need at least food name and calories to log this meal.');
      return;
    }

    try {
      console.log('[FOOD_LOG] Adding food:', foodName, 'to date:', selectedDate.toISOString().split('T')[0]);
      const response = await foodLogAPI.createEntry({
        food_name: foodName,
        serving_size: parseFloat(servingSize) || 1,
        serving_unit: 'serving',
        calories: parseInt(calories),
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        meal_type: mealType,
        logged_at: selectedDate.toISOString(),
      });

      if (response.success) {
        console.log('[FOOD_LOG] Food added successfully');
        haptic.success();
        setShowAddForm(false);
        clearForm();
        loadTodayLog();
        showToast.success(SuccessMessages.mealLogged.title, SuccessMessages.mealLogged.message);
      }
    } catch (error: any) {
      console.error('[FOOD_LOG] Error adding food:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      console.log('[FOOD_LOG] Deleting entry:', id);
      const response = await foodLogAPI.deleteEntry(id);
      if (response.success) {
        console.log('[FOOD_LOG] Entry deleted');
        haptic.medium();
        loadTodayLog();
        showToast.quick(SuccessMessages.mealDeleted.message);
      }
    } catch (error: any) {
      console.error('[FOOD_LOG] Error deleting entry:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const handleCopyToOtherDays = (entry: FoodLogEntry) => {
    Alert.alert(
      'Copy Meal to Future Days 📋',
      `Copy "${entry.food_name}" to the next 7 days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy to Next 7 Days',
          onPress: async () => {
            const meal: CopyMealOptions = {
              foodName: entry.food_name,
              mealType: entry.meal_type as any,
              servingSize: entry.serving_size || 1,
              servingUnit: entry.serving_unit,
              calories: entry.calories,
              protein: entry.protein,
              carbs: entry.carbs,
              fat: entry.fat,
            };

            const targetDates = getNextNDays(7).map(date => formatDateISO(date));

            try {
              const result = await copyMealToMultipleDays(meal, targetDates);
              haptic.success();
              showToast.success(
                'Meals Copied! 📋',
                `Copied "${meal.foodName}" to ${result.success} future days`
              );
            } catch (error) {
              showToast.error('Copy Failed', 'Had trouble copying that meal');
            }
          },
        },
      ]
    );
  };


  const clearForm = () => {
    setFoodName('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setValidationHints({
      foodName: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    });
  };

  // Validation helpers with live feedback
  const validateFoodName = (value: string) => {
    if (!value.trim()) {
      setValidationHints(prev => ({ ...prev, foodName: '⚠️ Food name is required' }));
    } else if (value.length < 2) {
      setValidationHints(prev => ({ ...prev, foodName: '⚠️ Too short - need at least 2 characters' }));
    } else {
      setValidationHints(prev => ({ ...prev, foodName: '✅ Looks good!' }));
    }
  };

  const validateCalories = (value: string) => {
    const num = parseInt(value);
    if (!value) {
      setValidationHints(prev => ({ ...prev, calories: '⚠️ Calories are required' }));
    } else if (isNaN(num)) {
      setValidationHints(prev => ({ ...prev, calories: '⚠️ Must be a number' }));
    } else if (num < 0) {
      setValidationHints(prev => ({ ...prev, calories: '⚠️ Can\'t be negative' }));
    } else if (num > 5000) {
      setValidationHints(prev => ({ ...prev, calories: '⚠️ Seems really high - double check?' }));
    } else {
      setValidationHints(prev => ({ ...prev, calories: '✅ Perfect' }));
    }
  };

  const validateMacro = (value: string, macroName: 'protein' | 'carbs' | 'fat', maxReasonable: number) => {
    if (!value) {
      setValidationHints(prev => ({ ...prev, [macroName]: '' }));
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setValidationHints(prev => ({ ...prev, [macroName]: '⚠️ Must be a number' }));
    } else if (num < 0) {
      setValidationHints(prev => ({ ...prev, [macroName]: '⚠️ Can\'t be negative' }));
    } else if (num > maxReasonable) {
      setValidationHints(prev => ({ ...prev, [macroName]: '⚠️ Seems high - recheck?' }));
    } else {
      setValidationHints(prev => ({ ...prev, [macroName]: '✅' }));
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Food Log</Text>
          <Text style={styles.subtitle}>Loading your meals...</Text>
        </View>
        <View style={styles.skeletonContainer}>
          <FoodEntrySkeleton />
          <FoodEntrySkeleton />
          <FoodEntrySkeleton />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Nutrition</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.subtitle}>Track your meals and hit your targets</Text>
            <NutritionIcon width={16} height={16} fill={theme.colors.textSecondary} />
          </View>
        </View>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelectorCard}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.dateNavButton}>
          <Text style={styles.dateNavButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.dateCenterSection}>
          <Text style={styles.dateLabel}>{getDateLabel()}</Text>
          {!isToday() && (
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Go to Today</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={goToNextDay}
          style={[styles.dateNavButton, isToday() && styles.dateNavButtonDisabled]}
          disabled={isToday()}
        >
          <Text style={[styles.dateNavButtonText, isToday() && styles.dateNavButtonTextDisabled]}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Logging Options */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Log Food</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push(`/ai-photo-log?date=${selectedDate.toISOString().split('T')[0]}`)}
          >
            <CameraIcon width={32} height={32} fill={theme.colors.primary} />
            <Text style={styles.quickActionLabel}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push(`/food-search?date=${selectedDate.toISOString().split('T')[0]}`)}
          >
            <MagnifyingGlassIcon width={32} height={32} fill={theme.colors.primary} />
            <Text style={styles.quickActionLabel}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push(`/barcode-scanner?date=${selectedDate.toISOString().split('T')[0]}`)}
          >
            <ScanIcon width={32} height={32} fill={theme.colors.primary} />
            <Text style={styles.quickActionLabel}>Scan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meal Plan - FEATURED */}
      <TouchableOpacity
        style={styles.mealPlanBanner}
        onPress={() => router.push('/meal-plan')}
      >
        <ClipboardIcon width={48} height={48} fill={theme.colors.primary} />
        <View style={styles.mealPlanBannerContent}>
          <Text style={styles.mealPlanBannerTitle}>Your Meal Plan</Text>
          <Text style={styles.mealPlanBannerSubtitle}>Personalized weekly nutrition plan</Text>
        </View>
        <Text style={styles.mealPlanBannerArrow}>›</Text>
      </TouchableOpacity>

      {/* Recipe Browser */}
      <TouchableOpacity
        style={styles.recipesBanner}
        onPress={() => router.push('/recipe-library')}
      >
        <NutritionIcon width={40} height={40} fill={theme.colors.encouragement} />
        <View style={styles.recipesBannerContent}>
          <Text style={styles.recipesBannerTitle}>Browse Recipes</Text>
          <Text style={styles.recipesBannerSubtitle}>Find meals that fit your macros</Text>
        </View>
        <Text style={styles.recipesBannerArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today Progress</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.calories }]}>
              {Math.round(todayLog?.totals.calories || 0)}
            </Text>
            {todayLog?.targets && (
              <Text style={styles.targetLabel}>/ {Math.round(todayLog.targets.calories)}</Text>
            )}
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.protein }]}>
              {Math.round(todayLog?.totals.protein || 0)}g
            </Text>
            {todayLog?.targets && (
              <Text style={styles.targetLabel}>/ {Math.round(todayLog.targets.protein)}g</Text>
            )}
            <Text style={styles.summaryLabel}>Protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.carbs }]}>
              {Math.round(todayLog?.totals.carbs || 0)}g
            </Text>
            {todayLog?.targets && (
              <Text style={styles.targetLabel}>/ {Math.round(todayLog.targets.carbs)}g</Text>
            )}
            <Text style={styles.summaryLabel}>Carbs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.fat }]}>
              {Math.round(todayLog?.totals.fat || 0)}g
            </Text>
            {todayLog?.targets && (
              <Text style={styles.targetLabel}>/ {Math.round(todayLog.targets.fat)}g</Text>
            )}
            <Text style={styles.summaryLabel}>Fat</Text>
          </View>
        </View>

        {/* Coach Explanation */}
        {todayLog?.adjustmentMessage && (
          <View style={styles.coachExplanation}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <LightBulbIcon width={16} height={16} fill={theme.colors.primary} style={{ marginTop: 2 }} />
              <Text style={[styles.coachExplanationText, { flex: 1 }]}>
                {todayLog.adjustmentMessage}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Macro Balance Chart */}
      {todayLog?.targets && (
        <View style={styles.chartContainer}>
          <MacroDonutChart
            protein={todayLog.totals.protein || 0}
            carbs={todayLog.totals.carbs || 0}
            fat={todayLog.totals.fat || 0}
            proteinTarget={Math.round(todayLog.targets.protein)}
            carbsTarget={Math.round(todayLog.targets.carbs)}
            fatTarget={Math.round(todayLog.targets.fat)}
          />
        </View>
      )}

      {!showAddForm && (
        <View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push(`/food-search?mealType=breakfast&date=${selectedDate.toISOString().split('T')[0]}`)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MagnifyingGlassIcon width={20} height={20} fill={theme.colors.background} />
                <Text style={styles.searchButtonText}>Find Food</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.barcodeButton}
              onPress={() => router.push(`/barcode-scanner?date=${selectedDate.toISOString().split('T')[0]}`)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ScanIcon width={20} height={20} fill={theme.colors.background} />
                <Text style={styles.barcodeButtonText}>Scan</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoLogButton}
              onPress={() => router.push(`/ai-photo-log?date=${selectedDate.toISOString().split('T')[0]}`)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CameraIcon width={20} height={20} fill={theme.colors.background} />
                <Text style={styles.photoLogButtonText}>AI</Text>
              </View>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setShowAddForm(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <QuickAddIcon width={18} height={18} fill={theme.colors.textSecondary} />
              <Text style={styles.manualButtonText}>Quick Add</Text>
            </View>
          </TouchableOpacity>

          {/* Copy Yesterday Button */}
          {yesterdayLog && yesterdayLog.entries && yesterdayLog.entries.length > 0 && (
            <TouchableOpacity
              style={[styles.copyYesterdayButton, copying && styles.copyYesterdayButtonDisabled]}
              onPress={handleCopyYesterday}
              disabled={copying}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ClipboardIcon width={18} height={18} fill={theme.colors.secondary} />
                <Text style={styles.copyYesterdayButtonText}>
                  {copying ? 'Copying...' : `Copy Yesterday (${yesterdayLog.entries.length} meals)`}
                </Text>
              </View>
              <Text style={styles.copyYesterdayHint}>
                {Math.round(yesterdayLog.totals.calories)} cal • {Math.round(yesterdayLog.totals.protein)}g P
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showAddForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Quick Add Food</Text>
          <Text style={styles.formSubtitle}>Every detail helps me support you better! ✨</Text>

          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.mealTypeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.mealTypeChip, mealType === type && styles.mealTypeChipActive]}
                onPress={() => {
                  haptic.selection();
                  setMealType(type);
                }}
              >
                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Food Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Chicken Breast"
            placeholderTextColor={theme.colors.textMuted}
            value={foodName}
            onChangeText={(value) => {
              setFoodName(value);
              validateFoodName(value);
            }}
            onBlur={() => validateFoodName(foodName)}
          />
          {validationHints.foodName && (
            <Text style={validationHints.foodName.includes('✅') ? styles.hintSuccess : styles.hintError}>
              {validationHints.foodName}
            </Text>
          )}

          <Text style={styles.label}>Serving Size</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor={theme.colors.textMuted}
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
          />

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                style={styles.input}
                placeholder="200"
                placeholderTextColor={theme.colors.textMuted}
                value={calories}
                onChangeText={(value) => {
                  setCalories(value);
                  validateCalories(value);
                }}
                onBlur={() => validateCalories(calories)}
                keyboardType="numeric"
              />
              {validationHints.calories && (
                <Text style={validationHints.calories.includes('✅') ? styles.hintSuccess : styles.hintError}>
                  {validationHints.calories}
                </Text>
              )}
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Protein (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                placeholderTextColor={theme.colors.textMuted}
                value={protein}
                onChangeText={(value) => {
                  setProtein(value);
                  validateMacro(value, 'protein', 200);
                }}
                onBlur={() => validateMacro(protein, 'protein', 200)}
                keyboardType="numeric"
              />
              {validationHints.protein && (
                <Text style={validationHints.protein.includes('✅') ? styles.hintSuccess : styles.hintError}>
                  {validationHints.protein}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Carbs (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                value={carbs}
                onChangeText={(value) => {
                  setCarbs(value);
                  validateMacro(value, 'carbs', 300);
                }}
                onBlur={() => validateMacro(carbs, 'carbs', 300)}
                keyboardType="numeric"
              />
              {validationHints.carbs && (
                <Text style={validationHints.carbs.includes('✅') ? styles.hintSuccess : styles.hintError}>
                  {validationHints.carbs}
                </Text>
              )}
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Fat (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={theme.colors.textMuted}
                value={fat}
                onChangeText={(value) => {
                  setFat(value);
                  validateMacro(value, 'fat', 150);
                }}
                onBlur={() => validateMacro(fat, 'fat', 150)}
                keyboardType="numeric"
              />
              {validationHints.fat && (
                <Text style={validationHints.fat.includes('✅') ? styles.hintSuccess : styles.hintError}>
                  {validationHints.fat}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => {
                setShowAddForm(false);
                clearForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.formButton} onPress={handleAddFood}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <GoalsIcon width={20} height={20} fill={theme.colors.background} />
                <Text style={styles.formButtonText}>Log It!</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.entriesSection}>
        <Text style={styles.sectionTitle}>Today's Entries</Text>
        {!todayLog?.entries || todayLog.entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyText}>Ready to log your first meal?</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Text style={styles.emptySubtext}>
                Every journey starts with one meal logged. I'm here to guide you every step of the way!
              </Text>
              <BicepIcon width={18} height={18} fill={theme.colors.primary} />
            </View>
            <Text style={styles.emptyHint}>
              👆 Use the buttons above to get started - scan, search, or quick add!
            </Text>
          </View>
        ) : (
          todayLog.entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryMealType}>{entry.meal_type}</Text>
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => handleCopyToOtherDays(entry)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.copyText}>Copy</Text>
                      <ClipboardIcon width={12} height={12} fill={theme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.entryFoodName}>{entry.food_name}</Text>
              <View style={styles.entryMacros}>
                <Text style={styles.entryMacro}>{Math.round(entry.calories)} cal</Text>
                <Text style={styles.entryMacro}>P: {Math.round(entry.protein)}g</Text>
                <Text style={styles.entryMacro}>C: {Math.round(entry.carbs)}g</Text>
                <Text style={styles.entryMacro}>F: {Math.round(entry.fat)}g</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
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
  // Date Selector Styles
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  dateNavButtonText: {
    fontSize: 28,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  dateNavButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  dateCenterSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  dateLabel: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  todayButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary + '15',
  },
  todayButtonText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  quickActionsCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    marginTop: 0,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  quickActionsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  quickActionEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  quickActionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  mealPlanBanner: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  mealPlanBannerEmoji: {
    fontSize: 48,
    marginRight: theme.spacing.md,
  },
  mealPlanBannerContent: {
    flex: 1,
  },
  mealPlanBannerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  mealPlanBannerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  mealPlanBannerArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  recipesBanner: {
    backgroundColor: theme.colors.encouragement + '15',
    borderWidth: 2,
    borderColor: theme.colors.encouragement,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  recipesBannerEmoji: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  recipesBannerContent: {
    flex: 1,
  },
  recipesBannerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipesBannerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  recipesBannerArrow: {
    fontSize: 28,
    color: theme.colors.encouragement,
    fontWeight: theme.fontWeight.bold,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  summaryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  coachExplanation: {
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  coachExplanationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  targetLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  chartContainer: {
    marginHorizontal: theme.spacing.md,
  },
  skeletonContainer: {
    padding: theme.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    margin: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  searchButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  barcodeButton: {
    flex: 1,
    backgroundColor: theme.colors.secondary || '#6366f1',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  barcodeButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  photoLogButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  photoLogButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    margin: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  manualButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  copyYesterdayButton: {
    backgroundColor: theme.colors.secondary + '15',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    margin: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  copyYesterdayButtonDisabled: {
    opacity: 0.5,
  },
  copyYesterdayButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  copyYesterdayHint: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  formTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  formSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontStyle: 'italic',
  },
  label: {
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
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.xs,
  },
  hintSuccess: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.encouragement,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  hintError: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  mealTypeChip: {
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flex: 1,
    alignItems: 'center',
  },
  mealTypeChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  mealTypeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  mealTypeTextActive: {
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  formButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    flex: 1,
    alignItems: 'center',
  },
  formButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  entriesSection: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.semibold,
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  entryMealType: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    fontWeight: theme.fontWeight.bold,
  },
  entryActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  copyText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
  },
  deleteText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
  },
  entryFoodName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  entryMacros: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  entryMacro: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});
