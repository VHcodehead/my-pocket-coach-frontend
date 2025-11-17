// Recipe Detail Screen - View recipe info and open PDF instructions
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Linking, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { foodLogAPI } from '../src/services/api';
import config from '../src/config';

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; slug: string }>();
  const { theme } = useTheme();
  const [recipe, setRecipe] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServing, setSelectedServing] = useState(1.0);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [params.id]);

  const loadRecipe = async () => {
    try {
      if (!params.id) return;

      console.log('[RECIPE_DETAIL] Loading recipe:', params.id);

      const response = await fetch(`${config.API_URL}/api/supabase-recipes/${params.id}`);
      const data = await response.json();

      if (data.success && data.data && data.data.recipe) {
        setRecipe(data.data.recipe);
        console.log('[RECIPE_DETAIL] Recipe loaded:', data.data.recipe.title);
      }
    } catch (error) {
      console.error('[RECIPE_DETAIL] Error loading recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const servingOptions = [
    { label: '1/4 serving', value: 0.25 },
    { label: '1/2 serving', value: 0.5 },
    { label: '3/4 serving', value: 0.75 },
    { label: '1 full serving', value: 1.0 },
    { label: '1.5 servings', value: 1.5 },
    { label: '2 servings', value: 2.0 },
  ];

  const handleViewRecipe = async () => {
    if (!recipe || !recipe.source_pdf || !recipe.pages) {
      Alert.alert('Recipe Not Available', 'Recipe instructions are not available for this recipe.');
      return;
    }

    // Use backend route that extracts just the single recipe page
    const pdfUrl = `${config.API_URL}/api/recipe-pdf/${recipe.id}`;

    console.log('[RECIPE_DETAIL] Opening single-page PDF:', pdfUrl);

    try {
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Cannot Open PDF', 'Unable to open recipe PDF. Please check your browser settings.');
      }
    } catch (error) {
      console.error('[RECIPE_DETAIL] Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open recipe PDF.');
    }
  };

  const handleLogRecipe = async () => {
    if (!recipe) return;

    setLogging(true);
    try {
      const servingText = selectedServing === 1 ? 'serving' :
                         selectedServing < 1 ? `${selectedServing} serving` :
                         `${selectedServing} servings`;

      await foodLogAPI.createEntry({
        food_name: `${recipe.title} (${servingText})`,
        meal_type: 'lunch', // Default to lunch, user can change later
        serving_size: selectedServing,
        serving_unit: 'serving',
        calories: (recipe.calories || 0) * selectedServing,
        protein: (recipe.protein_g || 0) * selectedServing,
        carbs: (recipe.carbs_g || 0) * selectedServing,
        fat: (recipe.fat_g || 0) * selectedServing,
      });

      console.log('[RECIPE_DETAIL] Recipe logged successfully');
      Alert.alert('Success', 'Recipe logged to your daily intake!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[RECIPE_DETAIL] Error logging recipe:', error);
      Alert.alert('Error', 'Failed to log recipe. Please try again.');
    } finally {
      setLogging(false);
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Recipe not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Recipe Image */}
        {recipe.image && (
          <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
        )}

        {/* Recipe Title */}
        <View style={styles.titleSection}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>

          {/* Recipe Meta Info */}
          {recipe.servings && (
            <Text style={styles.metaText}>🍽️ Makes {recipe.servings} servings</Text>
          )}
        </View>

        {/* Macros per Serving */}
        <View style={styles.macrosCard}>
          <Text style={styles.macrosTitle}>Nutrition per Serving</Text>
          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.calories }]}>
                {Math.round(recipe.calories || 0)}
              </Text>
              <Text style={styles.macroLabel}>Calories</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.protein }]}>
                {Math.round(recipe.protein_g || 0)}g
              </Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>
                {Math.round(recipe.carbs_g || 0)}g
              </Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: theme.colors.fat }]}>
                {Math.round(recipe.fat_g || 0)}g
              </Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* View Full Recipe Button */}
        <TouchableOpacity style={styles.viewRecipeButton} onPress={handleViewRecipe}>
          <Text style={styles.viewRecipeButtonIcon}>📖</Text>
          <View style={styles.viewRecipeButtonContent}>
            <Text style={styles.viewRecipeButtonTitle}>View Full Recipe Instructions</Text>
            <Text style={styles.viewRecipeButtonSubtitle}>
              Opens recipe PDF with ingredients & cooking steps
            </Text>
          </View>
          <Text style={styles.viewRecipeButtonArrow}>→</Text>
        </TouchableOpacity>

        {/* Serving Size Selection */}
        <View style={styles.servingSection}>
          <Text style={styles.sectionTitle}>Select Serving Size to Log</Text>
          {servingOptions.map((option) => {
            const isSelected = selectedServing === option.value;
            const calories = Math.round((recipe.calories || 0) * option.value);
            const protein = Math.round((recipe.protein_g || 0) * option.value);
            const carbs = Math.round((recipe.carbs_g || 0) * option.value);
            const fat = Math.round((recipe.fat_g || 0) * option.value);

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.servingOption,
                  isSelected && styles.servingOptionSelected,
                ]}
                onPress={() => setSelectedServing(option.value)}
              >
                <View style={styles.servingOptionContent}>
                  <Text style={[styles.servingLabel, isSelected && styles.servingLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.servingMacros, isSelected && styles.servingMacrosSelected]}>
                    P {protein}g • C {carbs}g • F {fat}g • {calories} cal
                  </Text>
                </View>
                {isSelected && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* What You're Logging */}
        <View style={styles.loggingPreview}>
          <Text style={styles.loggingPreviewTitle}>You're logging:</Text>
          <Text style={styles.loggingPreviewFood}>
            {recipe.title} - {selectedServing === 1 ? '1 serving' :
                             selectedServing < 1 ? `${selectedServing} serving` :
                             `${selectedServing} servings`}
          </Text>
          <Text style={styles.loggingPreviewMacros}>
            P {Math.round((recipe.protein_g || 0) * selectedServing)}g •
            C {Math.round((recipe.carbs_g || 0) * selectedServing)}g •
            F {Math.round((recipe.fat_g || 0) * selectedServing)}g •
            {Math.round((recipe.calories || 0) * selectedServing)} cal
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Log Button (Fixed at Bottom) */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.logButton, logging && styles.logButtonDisabled]}
          onPress={handleLogRecipe}
          disabled={logging}
        >
          <Text style={styles.logButtonText}>
            {logging ? 'Logging...' : '✓ Log to Daily Intake'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxl,
  },
  errorText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
  },
  header: {
    padding: theme.spacing.md,
    paddingTop: 60,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonHeader: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  recipeImage: {
    width: '100%',
    height: 250,
    backgroundColor: theme.colors.borderLight,
  },
  titleSection: {
    padding: theme.spacing.xl,
  },
  recipeTitle: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metaText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  macrosCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  macrosTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  viewRecipeButton: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  viewRecipeButtonIcon: {
    fontSize: 40,
    marginRight: theme.spacing.md,
  },
  viewRecipeButtonContent: {
    flex: 1,
  },
  viewRecipeButtonTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  viewRecipeButtonSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 18,
  },
  viewRecipeButtonArrow: {
    fontSize: 32,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  servingSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  servingOption: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingOptionSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  servingOptionContent: {
    flex: 1,
  },
  servingLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  servingLabelSelected: {
    color: theme.colors.primary,
  },
  servingMacros: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  servingMacrosSelected: {
    color: theme.colors.text,
  },
  checkmark: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  loggingPreview: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.encouragement + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  loggingPreviewTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  loggingPreviewFood: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  loggingPreviewMacros: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    ...theme.shadows.lg,
  },
  logButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  logButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  logButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
    textAlign: 'center',
  },
});
