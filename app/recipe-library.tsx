// Recipe Library - Browse all recipes
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import config from '../src/config';

// Import SVG icons
import MagnifyingGlassIcon from '../assets/icons/magnifying-glass-icon.svg';
import BicepIcon from '../assets/icons/bicep-icon.svg';
import LightningBoltIcon from '../assets/icons/lightning-bolt-icon.svg';
import NutritionIcon from '../assets/icons/nutrition-icon.svg';

interface Recipe {
  id: number;
  slug: string;
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  image?: string;
  tags?: string[];
}

export default function RecipeLibraryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high-protein' | 'low-carb' | 'quick'>('all');

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [searchQuery, selectedFilter, recipes]);

  const loadRecipes = async () => {
    try {
      const response = await fetch(`${config.API_URL}/api/supabase-recipes`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setRecipes(data.data);
        setFilteredRecipes(data.data);
      }
    } catch (error) {
      console.error('[RECIPE_LIBRARY] Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedFilter === 'high-protein') {
      filtered = filtered.filter(recipe => recipe.protein >= 30);
    } else if (selectedFilter === 'low-carb') {
      filtered = filtered.filter(recipe => recipe.carbs <= 20);
    } else if (selectedFilter === 'quick') {
      filtered = filtered.filter(recipe =>
        (recipe.prep_time_minutes + recipe.cook_time_minutes) <= 30
      );
    }

    setFilteredRecipes(filtered);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Recipes', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Recipe Library', headerShown: true }} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Browse Recipes</Text>
          <Text style={styles.headerSubtitle}>
            Find meals that fit your macros
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchIconWrapper}>
            <MagnifyingGlassIcon width={20} height={20} fill={theme.colors.textMuted} />
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              All Recipes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'high-protein' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('high-protein')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BicepIcon width={16} height={16} fill={selectedFilter === 'high-protein' ? theme.colors.background : theme.colors.text} />
              <Text style={[styles.filterText, selectedFilter === 'high-protein' && styles.filterTextActive]}>
                High Protein
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'low-carb' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('low-carb')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <NutritionIcon width={16} height={16} fill={selectedFilter === 'low-carb' ? theme.colors.background : theme.colors.text} />
              <Text style={[styles.filterText, selectedFilter === 'low-carb' && styles.filterTextActive]}>
                Low Carb
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedFilter === 'quick' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('quick')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LightningBoltIcon width={16} height={16} fill={selectedFilter === 'quick' ? theme.colors.background : theme.colors.text} />
              <Text style={[styles.filterText, selectedFilter === 'quick' && styles.filterTextActive]}>
                Quick (≤30min)
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {filteredRecipes.length} {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
          </Text>
        </View>

        {/* Recipe Grid */}
        {filteredRecipes.length > 0 ? (
          <View style={styles.recipeGrid}>
            {filteredRecipes.map((recipe) => (
              <TouchableOpacity
                key={recipe.id}
                style={styles.recipeCard}
                onPress={() => router.push(`/recipe-detail?id=${recipe.id}&slug=${recipe.slug}`)}
              >
                {recipe.image && (
                  <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
                )}
                {!recipe.image && (
                  <View style={styles.recipeImagePlaceholder}>
                    <NutritionIcon width={48} height={48} fill={theme.colors.textMuted} />
                  </View>
                )}
                <View style={styles.recipeInfo}>
                  <Text style={styles.recipeTitle} numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  {recipe.description && (
                    <Text style={styles.recipeDescription} numberOfLines={2}>
                      {recipe.description}
                    </Text>
                  )}
                  <View style={styles.recipeMacros}>
                    <Text style={styles.recipeCalories}>
                      {Math.round(recipe.calories)} cal
                    </Text>
                    <Text style={styles.recipeMacro}>P: {Math.round(recipe.protein)}g</Text>
                    <Text style={styles.recipeMacro}>C: {Math.round(recipe.carbs)}g</Text>
                    <Text style={styles.recipeMacro}>F: {Math.round(recipe.fat)}g</Text>
                  </View>
                  {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                    <Text style={styles.recipeTime}>
                      ⏱️ {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MagnifyingGlassIcon width={64} height={64} fill={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No recipes found</Text>
            <Text style={styles.emptyText}>Try a different search or filter</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  searchContainer: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    paddingRight: 50,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIconWrapper: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  filtersScroll: {
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  filterButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  filterTextActive: {
    color: theme.colors.background,
  },
  resultsCount: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  resultsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  recipeGrid: {
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  recipeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  recipeImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.borderLight,
  },
  recipeImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeImagePlaceholderEmoji: {
    fontSize: 64,
  },
  recipeInfo: {
    padding: theme.spacing.md,
  },
  recipeTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  recipeDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.sm,
  },
  recipeMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  recipeCalories: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.calories,
    fontWeight: theme.fontWeight.semibold,
  },
  recipeMacro: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  recipeTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
  },
  emptyState: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
