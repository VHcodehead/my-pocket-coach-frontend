// All Recipes Screen - Browse all available recipes
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import config from '../src/config';

export default function AllRecipesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllRecipes();
  }, []);

  useEffect(() => {
    // Filter recipes based on search query
    if (searchQuery.trim() === '') {
      setFilteredRecipes(recipes);
    } else {
      const filtered = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }
  }, [searchQuery, recipes]);

  const loadAllRecipes = async () => {
    try {
      console.log('[ALL_RECIPES] Fetching all recipes');
      const response = await fetch(`${config.API_URL}/api/supabase-recipes`);

      if (!response.ok) {
        console.error('[ALL_RECIPES] Failed to fetch recipes');
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setRecipes(data.data);
        setFilteredRecipes(data.data);
        console.log('[ALL_RECIPES] Loaded', data.data.length, 'recipes');
      }
    } catch (error) {
      console.error('[ALL_RECIPES] Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipe: any) => {
    router.push(`/recipe-detail?id=${recipe.id}&slug=${recipe.slug}`);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading recipes...</Text>
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
        <Text style={styles.headerTitle}>All Recipes</Text>
        <View style={styles.backButton} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search recipes..."
          placeholderTextColor={theme.colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recipe Count */}
      <Text style={styles.recipeCount}>
        {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
      </Text>

      {/* Recipes Grid */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.gridContainer}>
        {filteredRecipes.map((recipe, index) => (
          <TouchableOpacity
            key={recipe.id || index}
            style={styles.recipeCard}
            onPress={() => handleRecipePress(recipe)}
          >
            {recipe.image && (
              <Image source={{ uri: recipe.image }} style={styles.recipeImage} />
            )}
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {recipe.title}
              </Text>
              <View style={styles.recipeMacros}>
                <Text style={styles.recipeCalories}>
                  {Math.round(recipe.calories)} cal
                </Text>
                <Text style={styles.recipeMacro}>
                  P: {Math.round(recipe.protein_g || recipe.protein)}g
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
    width: 80,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.xs,
  },
  clearButton: {
    fontSize: 20,
    color: theme.colors.textMuted,
    padding: theme.spacing.xs,
  },
  recipeCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  scrollContent: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 40,
  },
  recipeCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: '1%',
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.borderLight,
  },
  recipeInfo: {
    padding: theme.spacing.md,
  },
  recipeTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    minHeight: 40,
  },
  recipeMacros: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  recipeCalories: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.calories,
    fontWeight: theme.fontWeight.medium,
  },
  recipeMacro: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
