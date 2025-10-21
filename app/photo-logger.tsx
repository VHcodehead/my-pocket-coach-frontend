// AI-powered photo food logger with GPT-4 Vision
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import config from '../src/config';
import { foodLogAPI } from '../src/services/api';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';

interface AnalysisResult {
  sessionId: string;
  message: string;
  detectedFoods: Array<{
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function PhotoLoggerScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(ErrorMessages.photoLibraryPermission.title, ErrorMessages.photoLibraryPermission.message);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(ErrorMessages.cameraPermission.title, ErrorMessages.cameraPermission.message);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
    }
  };

  const analyzePhoto = async () => {
    if (!image) return;

    setAnalyzing(true);
    try {
      console.log('[PHOTO_LOGGER] Starting AI analysis...');

      const formData = new FormData();
      formData.append('mealPhoto', {
        uri: image,
        type: 'image/jpeg',
        name: 'meal.jpg',
      } as any);
      formData.append('userId', 'user-123'); // TODO: Get from Supabase auth
      formData.append('description', 'Analyze this meal photo');

      const response = await fetch(`${config.API_URL}/api/bulletproof-photos/start-analysis`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      console.log('[PHOTO_LOGGER] AI response:', data);

      if (data.success && data.data) {
        setResult({
          sessionId: data.data.sessionId,
          message: data.data.message,
          detectedFoods: data.data.detectedFoods || [],
          totalNutrition: data.data.totalNutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
        });
      } else {
        Alert.alert('Photo Analysis Issue 📸', data.error || 'I couldn\'t analyze that photo clearly. Try a clearer shot or better lighting!');
      }
    } catch (error: any) {
      console.error('[PHOTO_LOGGER] Error:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const logToFoodDiary = async () => {
    if (!result) return;

    setLogging(true);
    console.log('[PHOTO_LOGGER] Logging detected foods to diary');

    try {
      // Log each detected food item to the food diary
      for (const food of result.detectedFoods) {
        await foodLogAPI.createEntry({
          food_name: food.name,
          meal_type: getMealTypeByTime(), // Determine meal type based on current time
          serving_size: food.portion,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        });
      }

      console.log('[PHOTO_LOGGER] Successfully logged all foods');
      Alert.alert(
        SuccessMessages.mealLogged.title,
        `I've added ${result.detectedFoods.length} ${result.detectedFoods.length === 1 ? 'item' : 'items'} to your food log.\n\nTotal: ${Math.round(result.totalNutrition.calories)} calories\n\nKeep up the great tracking!`,
        [
          { text: 'View Nutrition', onPress: () => router.push('/(tabs)/nutrition') },
          { text: 'Perfect!', onPress: () => router.back() }
        ]
      );
    } catch (error: any) {
      console.error('[PHOTO_LOGGER] Error logging to diary:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setLogging(false);
    }
  };

  // Helper function to determine meal type based on current time
  const getMealTypeByTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    return 'dinner';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Snap & Track</Text>
        <Text style={styles.subtitle}>I'll analyze your meal and log it for you 📸</Text>
      </View>

      {!image ? (
        <View style={styles.emptyState}>
          <View style={styles.iconContainer}>
            <Text style={styles.emptyIcon}>📸</Text>
          </View>
          <Text style={styles.emptyTitle}>Let Me See What You're Eating!</Text>
          <Text style={styles.instructions}>
            I'll identify every food, estimate portions, and calculate all your macros automatically. Just snap a pic!
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureText}>Smart AI vision analysis</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureText}>Automatic portion estimates</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Full nutrition breakdown</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Text style={styles.cameraButtonText}>📷 Snap Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Text style={styles.galleryButtonText}>🖼️ Choose Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {!result && !analyzing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.retakeButton} onPress={() => setImage(null)}>
                <Text style={styles.retakeButtonText}>Try Another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={analyzePhoto}
              >
                <Text style={styles.analyzeButtonText}>Let Me Analyze! 🤖</Text>
              </TouchableOpacity>
            </View>
          )}

          {analyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.analyzingText}>💭 Looking at your meal...</Text>
              <Text style={styles.analyzingSubtext}>Give me just a few seconds to analyze everything!</Text>
            </View>
          )}

          {result && (
            <View style={styles.resultsContainer}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Got It! Here's What I See ✨</Text>
                <Text style={styles.resultsMessage}>{result.message}</Text>
              </View>

              <View style={styles.totalNutrition}>
                <Text style={styles.totalTitle}>Your Nutrition Breakdown</Text>
                <View style={styles.macroGrid}>
                  <View style={styles.macroCard}>
                    <Text style={[styles.macroValue, { color: theme.colors.calories || '#ef4444' }]}>
                      {Math.round(result.totalNutrition.calories)}
                    </Text>
                    <Text style={styles.macroLabel}>Calories</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <Text style={[styles.macroValue, { color: theme.colors.protein || '#3b82f6' }]}>
                      {Math.round(result.totalNutrition.protein)}g
                    </Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <Text style={[styles.macroValue, { color: theme.colors.carbs || '#f59e0b' }]}>
                      {Math.round(result.totalNutrition.carbs)}g
                    </Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                  <View style={styles.macroCard}>
                    <Text style={[styles.macroValue, { color: theme.colors.fat || '#10b981' }]}>
                      {Math.round(result.totalNutrition.fat)}g
                    </Text>
                    <Text style={styles.macroLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              {result.detectedFoods.length > 0 && (
                <View style={styles.foodsList}>
                  <Text style={styles.foodsTitle}>I Found {result.detectedFoods.length} {result.detectedFoods.length === 1 ? 'Item' : 'Items'} 🎯</Text>
                  {result.detectedFoods.map((food, index) => (
                    <View key={index} style={styles.foodCard}>
                      <View style={styles.foodHeader}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodPortion}>{food.portion}</Text>
                      </View>
                      <View style={styles.foodMacros}>
                        <Text style={styles.foodMacro}>{Math.round(food.calories)} cal</Text>
                        <Text style={styles.foodMacro}>P: {Math.round(food.protein)}g</Text>
                        <Text style={styles.foodMacro}>C: {Math.round(food.carbs)}g</Text>
                        <Text style={styles.foodMacro}>F: {Math.round(food.fat)}g</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.finalActions}>
                <TouchableOpacity
                  style={styles.retakeButtonFinal}
                  onPress={() => { setImage(null); setResult(null); }}
                  disabled={logging}
                >
                  <Text style={styles.retakeButtonTextFinal}>New Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logButton, logging && styles.buttonDisabled]}
                  onPress={logToFoodDiary}
                  disabled={logging}
                >
                  <Text style={styles.logButtonText}>
                    {logging ? '💭 Saving...' : 'Track It! 🎯'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 60,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructions: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  featuresList: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: theme.spacing.md,
  },
  featureText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  cameraButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  cameraButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  galleryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  imageContainer: {
    padding: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  analyzeButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  analyzeButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  analyzingContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  analyzingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  analyzingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  resultsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  resultsHeader: {
    marginBottom: theme.spacing.lg,
  },
  resultsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  resultsMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  totalNutrition: {
    marginBottom: theme.spacing.lg,
  },
  totalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCard: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  foodsList: {
    marginBottom: theme.spacing.lg,
  },
  foodsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  foodCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  foodName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    flex: 1,
  },
  foodPortion: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  foodMacros: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  foodMacro: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  finalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  retakeButtonFinal: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  retakeButtonTextFinal: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  logButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  logButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
