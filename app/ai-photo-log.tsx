// AI Photo Logging Screen
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '../src/theme';
import { photoLogAPI, authAPI, foodLogAPI } from '../src/services/api';

export default function AIPhotoLogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const targetDate = params.date as string | undefined;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [showDescriptionInput, setShowDescriptionInput] = useState(false);
  const [showClarifications, setShowClarifications] = useState(false);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<number, string>>({});
  const [submittingClarifications, setSubmittingClarifications] = useState(false);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 || null);
      setShowDescriptionInput(true);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 || null);
      setShowDescriptionInput(true);
    }
  };

  const analyzePhoto = async () => {
    if (!photoBase64) {
      Alert.alert('Error', 'No photo data available');
      return;
    }

    try {
      setAnalyzing(true);

      // Get user profile for userId
      const profileResponse = await authAPI.getProfile();
      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert('Error', 'Could not get your profile');
        return;
      }

      const userId = profileResponse.data.id;

      // Use base64 from ImagePicker
      console.log('[AI_PHOTO] Using base64 from ImagePicker...');
      const base64Image = `data:image/jpeg;base64,${photoBase64}`;
      console.log('[AI_PHOTO] Base64 length:', photoBase64.length);

      // Analyze the photo with base64
      const response = await photoLogAPI.analyzePhoto(base64Image, userId, description || undefined);

      if (response.success) {
        setSession(response.data.session);

        // Check if requires user input or auto-completed
        if (response.data.requiresUserInput) {
          // Show clarification questions
          Alert.alert(
            'Need More Info 🤔',
            `I found ${response.data.session.initialAnalysis.foods.length} food items, but need some clarification to be more accurate.`,
            [
              {
                text: 'Skip Analysis',
                style: 'cancel',
                onPress: () => router.back(),
              },
              {
                text: 'Answer Questions',
                onPress: () => showClarificationQuestions(response.data.session),
              },
            ]
          );
        } else {
          // Analysis completed automatically
          showCompletedAnalysis(response.data.session);
        }
      }
    } catch (error: any) {
      console.error('[AI_PHOTO] Analysis error:', error);
      Alert.alert('Error', error.message || 'Failed to analyze photo');
    } finally {
      setAnalyzing(false);
    }
  };

  const showClarificationQuestions = (sessionData: any) => {
    const questions = sessionData.initialAnalysis.followUpQuestions || [];

    if (questions.length === 0) {
      completeAnalysis(sessionData.sessionId);
      return;
    }

    // Initialize empty answers for each question
    const initialAnswers: Record<number, string> = {};
    questions.forEach((_: any, index: number) => {
      initialAnswers[index] = '';
    });
    setClarificationAnswers(initialAnswers);
    setShowClarifications(true);
  };

  const handleSubmitClarifications = async () => {
    if (!session) return;

    const questions = session.initialAnalysis.followUpQuestions || [];

    // Build clarifications in the format backend expects
    const additionalContextParts: string[] = [];
    questions.forEach((question: string, index: number) => {
      const answer = clarificationAnswers[index]?.trim();
      if (answer) {
        additionalContextParts.push(`${question} ${answer}`);
      }
    });

    const clarifications = {
      foodCorrections: [], // Empty array for generic questions
      additionalContext: additionalContextParts.join('. ')
    };

    try {
      setSubmittingClarifications(true);

      const response = await photoLogAPI.submitClarifications(session.sessionId, clarifications);

      if (response.success) {
        setShowClarifications(false);
        showCompletedAnalysis(response.data.session);
      }
    } catch (error: any) {
      console.error('[AI_PHOTO] Submit clarifications error:', error);
      Alert.alert('Error', error.message || 'Failed to submit clarifications');
    } finally {
      setSubmittingClarifications(false);
    }
  };

  const handleSkipClarifications = () => {
    if (!session) return;
    setShowClarifications(false);
    completeAnalysis(session.sessionId);
  };

  const completeAnalysis = async (sessionId: string) => {
    try {
      const response = await photoLogAPI.completeSession(sessionId);

      if (response.success) {
        showCompletedAnalysis(response.data.session);
      }
    } catch (error) {
      console.error('[AI_PHOTO] Complete session error:', error);
      Alert.alert('Error', 'Failed to complete analysis');
    }
  };

  const showCompletedAnalysis = (sessionData: any) => {
    const foods = sessionData.finalAnalysis?.foods || sessionData.initialAnalysis?.foods || [];
    const nutrition = sessionData.nutritionBreakdown;

    if (!nutrition) {
      Alert.alert('Error', 'No nutrition data available');
      return;
    }

    const foodList = foods.map((f: any) => f.name).join(', ');

    Alert.alert(
      'Meal Analyzed! 🎉',
      `Found: ${foodList}\n\n` +
      `Calories: ${Math.round(nutrition.totalCalories)}\n` +
      `Protein: ${Math.round(nutrition.totalProtein)}g\n` +
      `Carbs: ${Math.round(nutrition.totalCarbs)}g\n` +
      `Fat: ${Math.round(nutrition.totalFat)}g\n\n` +
      `Confidence: ${Math.round(nutrition.accuracy * 100)}%`,
      [
        {
          text: 'Discard',
          style: 'cancel',
          onPress: () => router.back(),
        },
        {
          text: 'Log Meal',
          onPress: () => logMealFromAnalysis(foods, nutrition),
        },
      ]
    );
  };

  const logMealFromAnalysis = async (foods: any[], nutrition: any) => {
    try {
      // Combine all foods into one entry
      const foodNames = foods.map((f: any) => f.name).join(' + ');

      // Use targetDate if provided, otherwise current date
      let logTimestamp: string;
      if (targetDate) {
        const targetDateObj = new Date(targetDate);
        targetDateObj.setHours(12, 0, 0, 0); // Set to noon
        logTimestamp = targetDateObj.toISOString();
      } else {
        logTimestamp = new Date().toISOString();
      }

      const response = await foodLogAPI.createEntry({
        food_name: foodNames,
        serving_size: 1,
        serving_unit: 'meal',
        calories: Math.round(nutrition.totalCalories),
        protein: Math.round(nutrition.totalProtein),
        carbs: Math.round(nutrition.totalCarbs),
        fat: Math.round(nutrition.totalFat),
        meal_type: 'lunch', // Default, user can change later
        loggedAt: logTimestamp, // camelCase for backend
      });

      if (response.success) {
        Alert.alert(
          'Logged! ✅',
          'Meal has been added to your food log',
          [
            {
              text: 'Done',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('[AI_PHOTO] Log meal error:', error);
      Alert.alert('Error', 'Failed to log meal');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>AI Photo Logging</Text>
          <Text style={styles.subtitle}>Snap a photo, get instant nutrition</Text>
        </View>
      </View>

      {!photoUri && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📸</Text>
          <Text style={styles.emptyText}>Take or Choose a Photo</Text>
          <Text style={styles.emptySubtext}>
            I'll analyze your meal and estimate the nutrition automatically
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto}>
              <Text style={styles.primaryButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handlePickPhoto}>
              <Text style={styles.secondaryButtonText}>🖼️ Choose from Library</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
            <Text style={styles.tipText}>• Take photo from directly above</Text>
            <Text style={styles.tipText}>• Good lighting (natural light is best)</Text>
            <Text style={styles.tipText}>• Keep entire plate in frame</Text>
            <Text style={styles.tipText}>• Include a reference object (coin, fork)</Text>
          </View>
        </View>
      )}

      {photoUri && !analyzing && !session && (
        <View style={styles.photoContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />

          {showDescriptionInput && (
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionLabel}>Add details (optional):</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="e.g., grilled chicken with rice"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setPhotoUri(null);
                setPhotoBase64(null);
                setDescription('');
                setShowDescriptionInput(false);
              }}
            >
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.analyzeButton} onPress={analyzePhoto}>
              <Text style={styles.analyzeButtonText}>Analyze Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {analyzing && (
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.analyzingText}>Analyzing your meal...</Text>
          <Text style={styles.analyzingSubtext}>This usually takes 5-10 seconds</Text>
        </View>
      )}

      {showClarifications && session && (
        <View style={styles.clarificationsContainer}>
          <View style={styles.clarificationsCard}>
            <Text style={styles.clarificationsTitle}>A Few Quick Questions 🤔</Text>
            <Text style={styles.clarificationsSubtext}>
              Help me get more accurate nutrition estimates
            </Text>

            {session.initialAnalysis.followUpQuestions.map((question: string, index: number) => (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>
                  {index + 1}. {question}
                </Text>
                <TextInput
                  style={styles.answerInput}
                  placeholder="Your answer..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={clarificationAnswers[index] || ''}
                  onChangeText={(text) => {
                    setClarificationAnswers((prev) => ({
                      ...prev,
                      [index]: text,
                    }));
                  }}
                  multiline
                />
              </View>
            ))}

            <View style={styles.clarificationButtons}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipClarifications}
                disabled={submittingClarifications}
              >
                <Text style={styles.skipButtonText}>Skip & Use Estimate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitClarifications}
                disabled={submittingClarifications}
              >
                {submittingClarifications ? (
                  <ActivityIndicator size="small" color={theme.colors.background} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Answers</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    alignItems: 'center',
    padding: theme.spacing.xl,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: theme.colors.text,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  buttonGroup: {
    width: '100%',
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xl,
    width: '100%',
  },
  tipsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  photoContainer: {
    padding: theme.spacing.md,
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  descriptionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  descriptionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  descriptionInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
  clarificationsContainer: {
    padding: theme.spacing.md,
  },
  clarificationsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  clarificationsTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  clarificationsSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: theme.spacing.lg,
  },
  questionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  answerInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 60,
  },
  clarificationButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  skipButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  submitButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
