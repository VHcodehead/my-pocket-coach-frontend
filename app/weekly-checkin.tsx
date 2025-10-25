// Weekly check-in screen with multi-step wizard
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { checkinAPI, mealPlanAPI, authAPI, trainingAPI } from '../src/services/api';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

type MoodType = 'great' | 'good' | 'okay' | 'tired' | 'stressed';

export default function WeeklyCheckinScreen() {
  const router = useRouter();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7; // Increased to include training stats step

  // Form data
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [energy, setEnergy] = useState(3);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<{
    front: string | null;
    side1: string | null;
    side2: string | null;
    back: string | null;
  }>({
    front: null,
    side1: null,
    side2: null,
    back: null,
  });

  // Training data
  const [trainingStats, setTrainingStats] = useState<{
    workoutsCompleted: number;
    workoutsPlanned: number;
    totalVolume: number;
    prsAchieved: number;
    averageRPE: number | null;
    hasActivePlan: boolean;
  } | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [trainingRating, setTrainingRating] = useState<number | null>(null);
  const [trainingInjuryNotes, setTrainingInjuryNotes] = useState('');

  // Loading and results
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const moods: { value: MoodType; emoji: string; label: string }[] = [
    { value: 'great', emoji: '😄', label: 'Great' },
    { value: 'good', emoji: '🙂', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'tired', emoji: '😴', label: 'Tired' },
    { value: 'stressed', emoji: '😰', label: 'Stressed' },
  ];

  // Load training stats on mount
  useEffect(() => {
    fetchTrainingStats();
  }, []);

  const fetchTrainingStats = async () => {
    try {
      setLoadingTraining(true);

      // Check if user has an active training plan
      const planResponse = await trainingAPI.getCurrentPlan();

      if (!planResponse.success || !planResponse.data) {
        // No active plan
        setTrainingStats({
          workoutsCompleted: 0,
          workoutsPlanned: 0,
          totalVolume: 0,
          prsAchieved: 0,
          averageRPE: null,
          hasActivePlan: false,
        });
        setLoadingTraining(false);
        return;
      }

      // Fetch PRs
      const prsResponse = await trainingAPI.getPersonalRecords();

      // Calculate stats for the past week
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // For now, set placeholder values
      // TODO: Backend should provide a weekly summary endpoint
      setTrainingStats({
        workoutsCompleted: 0, // Will be calculated from logs
        workoutsPlanned: planResponse.data.training_days_per_week || 0,
        totalVolume: 0, // Will be calculated from logs
        prsAchieved: prsResponse.success ? prsResponse.data.filter((pr: any) => {
          const prDate = new Date(pr.achieved_at);
          return prDate >= weekAgo;
        }).length : 0,
        averageRPE: null, // Will be calculated from logs
        hasActivePlan: true,
      });
    } catch (error) {
      console.error('[WEEKLY_CHECKIN] Error fetching training stats:', error);
      setTrainingStats({
        workoutsCompleted: 0,
        workoutsPlanned: 0,
        totalVolume: 0,
        prsAchieved: 0,
        averageRPE: null,
        hasActivePlan: false,
      });
    } finally {
      setLoadingTraining(false);
    }
  };

  const handleNext = () => {
    // Validation
    if (currentStep === 1 && !weight) {
      Alert.alert('Required', 'Please enter your weight');
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleTakePhoto = async (position: 'front' | 'side1' | 'side2' | 'back') => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to take progress photos');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => ({
          ...prev,
          [position]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('[WEEKLY_CHECKIN] Photo capture error:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickPhoto = async (position: 'front' | 'side1' | 'side2' | 'back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos(prev => ({
          ...prev,
          [position]: result.assets[0].uri,
        }));
      }
    } catch (error) {
      console.error('[WEEKLY_CHECKIN] Photo pick error:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('[WEEKLY_CHECKIN] Base64 conversion error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Convert photos to base64 if provided
      const photoData: any = {};
      if (photos.front) photoData.photoFront = await convertImageToBase64(photos.front);
      if (photos.side1) photoData.photoSide1 = await convertImageToBase64(photos.side1);
      if (photos.side2) photoData.photoSide2 = await convertImageToBase64(photos.side2);
      if (photos.back) photoData.photoBack = await convertImageToBase64(photos.back);

      // Include training data if user has an active plan
      const trainingData: any = {};
      if (trainingStats?.hasActivePlan) {
        trainingData.training = {
          workoutsCompleted: trainingStats.workoutsCompleted,
          workoutsPlanned: trainingStats.workoutsPlanned,
          totalVolume: trainingStats.totalVolume,
          prsAchieved: trainingStats.prsAchieved,
          averageRPE: trainingStats.averageRPE,
          trainingRating,
          injuryNotes: trainingInjuryNotes.trim() || undefined,
        };
      }

      const response = await checkinAPI.submitWeekly({
        weight: parseFloat(weight),
        mood,
        energy,
        notes: notes.trim() || undefined,
        ...photoData,
        ...trainingData,
      });

      if (response.success && response.data) {
        setResults(response.data);
        setCurrentStep(7); // Move to results step
      } else {
        Alert.alert('Error', 'Failed to submit check-in. Please try again.');
      }
    } catch (error: any) {
      console.error('[WEEKLY_CHECKIN] Submit error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    try {
      setGeneratingPlan(true);
      console.log('[WEEKLY_CHECKIN] Generating meal plan with new targets');

      // Get user profile for diet preferences
      const profileResponse = await authAPI.getProfile();
      if (!profileResponse.success || !profileResponse.data) {
        Alert.alert('Error', 'Could not load your profile. Please try again.');
        return;
      }

      const profile = profileResponse.data;

      // Generate meal plan with new targets from results
      const planResponse = await mealPlanAPI.generate({
        profile: {
          weight: results.weightChange.current,
          bodyfat: profile.bodyfat,
          activity: profile.activity || 1.2,
          goal: profile.goal || 'recomp',
          mealsPerDay: profile.meals_per_day || 3,
          sex: profile.sex,
          age: profile.age,
          height_cm: profile.height_cm,
        },
        diet: {
          keto: profile.keto,
          vegetarian: profile.vegetarian,
          vegan: profile.vegan,
          halal: profile.halal,
          kosher: profile.kosher,
          allergens: profile.allergens || [],
          mustInclude: profile.must_include || [],
          avoid: profile.avoid || [],
        },
      });

      if (planResponse.success) {
        console.log('[WEEKLY_CHECKIN] Meal plan generated successfully');
        Alert.alert(
          'Meal Plan Generated! 🎉',
          'Your new weekly meal plan is ready based on your updated targets. Check the Nutrition tab!',
          [
            {
              text: 'View Nutrition',
              onPress: () => router.replace('/(tabs)/nutrition'),
            },
            {
              text: 'Done',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to generate meal plan. Please try again from the Plan tab.');
      }
    } catch (error: any) {
      console.error('[WEEKLY_CHECKIN] Meal plan generation error:', error);
      Alert.alert('Error', 'Something went wrong. You can generate a plan manually from the Plan tab.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Step 1: Weight
  const renderWeightStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your weight today?</Text>
      <Text style={styles.stepSubtitle}>Be honest - this helps me adjust your targets</Text>
      <View style={styles.weightInputContainer}>
        <TextInput
          style={styles.weightInput}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          maxLength={5}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        <Text style={styles.weightUnit}>lbs</Text>
      </View>
    </View>
  );

  // Step 2: Mood & Energy
  const renderMoodEnergyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How are you feeling?</Text>

      <Text style={styles.sectionLabel}>Mood</Text>
      <View style={styles.moodGrid}>
        {moods.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[styles.moodButton, mood === m.value && styles.moodButtonSelected]}
            onPress={() => setMood(m.value)}
          >
            <Text style={styles.moodEmoji}>{m.emoji}</Text>
            <Text style={[styles.moodLabel, mood === m.value && styles.moodLabelSelected]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Energy Level</Text>
      <View style={styles.energyContainer}>
        {[1, 2, 3, 4, 5].map(level => (
          <TouchableOpacity
            key={level}
            style={[styles.energyButton, energy === level && styles.energyButtonSelected]}
            onPress={() => setEnergy(level)}
          >
            <Text style={[styles.energyText, energy === level && styles.energyTextSelected]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.energyLabels}>
        <Text style={styles.energyLabelText}>Low</Text>
        <Text style={styles.energyLabelText}>High</Text>
      </View>
    </View>
  );

  // Step 3: Notes
  const renderNotesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Any notes for this week?</Text>
      <Text style={styles.stepSubtitle}>Optional - share anything about your week</Text>
      <TextInput
        style={styles.notesInput}
        value={notes}
        onChangeText={setNotes}
        placeholder="How did the week go? Any challenges or wins?"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={500}
        textAlignVertical="top"
        returnKeyType="done"
        blurOnSubmit={true}
      />
      <Text style={styles.characterCount}>{notes.length}/500</Text>
    </View>
  );

  // Step 4: Photos
  const renderPhotosStep = () => {
    const photoPositions: { key: 'front' | 'side1' | 'side2' | 'back'; label: string; instruction: string }[] = [
      { key: 'front', label: 'Front', instruction: 'Face the camera, arms at sides' },
      { key: 'side1', label: 'Left Side', instruction: 'Turn to your left, relaxed posture' },
      { key: 'side2', label: 'Right Side', instruction: 'Turn to your right, relaxed posture' },
      { key: 'back', label: 'Back', instruction: 'Face away from camera, arms at sides' },
    ];

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Progress Photos</Text>
        <Text style={styles.stepSubtitle}>Optional - but helps me give you better feedback!</Text>

        {photoPositions.map(position => (
          <View key={position.key} style={styles.photoSection}>
            <Text style={styles.photoLabel}>{position.label}</Text>
            <Text style={styles.photoInstruction}>{position.instruction}</Text>

            {photos[position.key] ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photos[position.key]! }} style={styles.photoImage} />
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    onPress={() => handleTakePhoto(position.key)}
                  >
                    <Text style={styles.photoActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoActionButton}
                    onPress={() => setPhotos(prev => ({ ...prev, [position.key]: null }))}
                  >
                    <Text style={styles.photoActionText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={() => handleTakePhoto(position.key)}
                >
                  <Text style={styles.photoButtonText}>📷 Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoButtonSecondary}
                  onPress={() => handlePickPhoto(position.key)}
                >
                  <Text style={styles.photoButtonSecondaryText}>Choose from Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  // Step 5: Training This Week
  const renderTrainingStep = () => {
    if (loadingTraining) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Training This Week 💪</Text>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        </View>
      );
    }

    if (!trainingStats?.hasActivePlan) {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Training This Week 💪</Text>
          <Text style={styles.stepSubtitle}>No active training plan detected</Text>
          <View style={styles.emptyTrainingCard}>
            <Text style={styles.emptyTrainingEmoji}>🏋️</Text>
            <Text style={styles.emptyTrainingText}>
              You don't have an active training plan yet. Generate one from the Training tab to track your workouts here!
            </Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Training This Week 💪</Text>
        <Text style={styles.stepSubtitle}>How did your training go?</Text>

        {/* Training Stats Grid */}
        <View style={styles.trainingStatsGrid}>
          <View style={styles.trainingStatCard}>
            <Text style={styles.trainingStatEmoji}>🔥</Text>
            <Text style={styles.trainingStatValue}>{trainingStats.workoutsCompleted}/{trainingStats.workoutsPlanned}</Text>
            <Text style={styles.trainingStatLabel}>Workouts</Text>
          </View>
          <View style={styles.trainingStatCard}>
            <Text style={styles.trainingStatEmoji}>🏆</Text>
            <Text style={styles.trainingStatValue}>{trainingStats.prsAchieved}</Text>
            <Text style={styles.trainingStatLabel}>PRs</Text>
          </View>
          <View style={styles.trainingStatCard}>
            <Text style={styles.trainingStatEmoji}>💪</Text>
            <Text style={styles.trainingStatValue}>{trainingStats.totalVolume > 0 ? `${(trainingStats.totalVolume / 1000).toFixed(1)}k` : '0'}</Text>
            <Text style={styles.trainingStatLabel}>Volume (lbs)</Text>
          </View>
        </View>

        {/* Training Rating */}
        <Text style={styles.sectionLabel}>How did training feel overall?</Text>
        <View style={styles.trainingRatingContainer}>
          {[1, 2, 3, 4, 5].map(rating => (
            <TouchableOpacity
              key={rating}
              style={[styles.trainingRatingButton, trainingRating === rating && styles.trainingRatingButtonSelected]}
              onPress={() => setTrainingRating(rating)}
            >
              <Text style={[styles.trainingRatingText, trainingRating === rating && styles.trainingRatingTextSelected]}>
                {rating === 1 ? '😰' : rating === 2 ? '😓' : rating === 3 ? '😐' : rating === 4 ? '😊' : '🔥'}
              </Text>
              <Text style={[styles.trainingRatingLabel, trainingRating === rating && styles.trainingRatingLabelSelected]}>
                {rating}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.trainingRatingLabels}>
          <Text style={styles.trainingRatingLabelText}>Tough</Text>
          <Text style={styles.trainingRatingLabelText}>Great</Text>
        </View>

        {/* Injury/Pain Notes */}
        <Text style={styles.sectionLabel}>Any exercises causing pain or discomfort? (Optional)</Text>
        <TextInput
          style={styles.trainingNotesInput}
          value={trainingInjuryNotes}
          onChangeText={setTrainingInjuryNotes}
          placeholder="E.g., shoulder pain on overhead press..."
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={300}
          textAlignVertical="top"
          returnKeyType="done"
          blurOnSubmit={true}
        />
        <Text style={styles.characterCount}>{trainingInjuryNotes.length}/300</Text>
      </ScrollView>
    );
  };

  // Step 6: Review
  const renderReviewStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review Your Check-In</Text>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Weight</Text>
        <Text style={styles.reviewValue}>{weight} lbs</Text>
      </View>

      {mood && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Mood</Text>
          <Text style={styles.reviewValue}>{moods.find(m => m.value === mood)?.label}</Text>
        </View>
      )}

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Energy</Text>
        <Text style={styles.reviewValue}>{energy}/5</Text>
      </View>

      {notes && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Notes</Text>
          <Text style={styles.reviewValue}>{notes}</Text>
        </View>
      )}

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Photos</Text>
        <Text style={styles.reviewValue}>
          {Object.values(photos).filter(Boolean).length}/4 uploaded
        </Text>
      </View>
    </ScrollView>
  );

  // Step 7: Results
  const renderResultsStep = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsTitle}>Check-In Complete! 🎉</Text>

        {/* Weight Change */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Weight Change</Text>
          <Text style={styles.resultValue}>
            {results.weightChange.change > 0 ? '+' : ''}
            {results.weightChange.change.toFixed(1)} lbs
          </Text>
          <Text style={styles.resultSubtext}>
            {results.weightChange.previous} → {results.weightChange.current} lbs
          </Text>
        </View>

        {/* New Targets */}
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>New Macro Targets</Text>
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{results.newTargets.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{results.newTargets.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{results.newTargets.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>
          {results.newTargets.totalCalories && (
            <Text style={styles.resultSubtext}>
              Total: {results.newTargets.totalCalories} calories/day
            </Text>
          )}
        </View>

        {/* Macro Calculation Breakdown */}
        {results.macroCalculationBreakdown && (
          <View style={styles.mathBreakdownCard}>
            <Text style={styles.resultLabel}>🔢 How Your Targets Were Calculated</Text>
            <Text style={styles.mathExplanation}>{results.macroCalculationBreakdown.explanation}</Text>
            <View style={styles.mathSteps}>
              <View style={styles.mathStep}>
                <Text style={styles.mathStepLabel}>1. BMR (Base Metabolism)</Text>
                <Text style={styles.mathStepValue}>{results.macroCalculationBreakdown.step1_bmr} cal/day</Text>
              </View>
              <View style={styles.mathStep}>
                <Text style={styles.mathStepLabel}>2. TDEE (With Activity)</Text>
                <Text style={styles.mathStepValue}>{results.macroCalculationBreakdown.step2_tdee} cal/day</Text>
              </View>
              <View style={styles.mathStep}>
                <Text style={styles.mathStepLabel}>3. Goal Adjustment</Text>
                <Text style={styles.mathStepValue}>{results.macroCalculationBreakdown.step3_deficitSurplus}</Text>
              </View>
              <View style={styles.mathStep}>
                <Text style={styles.mathStepLabel}>4. Baseline Calories</Text>
                <Text style={styles.mathStepValue}>{results.macroCalculationBreakdown.step4_baselineCalories} cal/day</Text>
              </View>
              {results.macroCalculationBreakdown.step5_metabolicAdjustment !== 0 && (
                <View style={styles.mathStep}>
                  <Text style={styles.mathStepLabel}>5. Metabolic Adjustment</Text>
                  <Text style={styles.mathStepValue}>
                    {results.macroCalculationBreakdown.step5_metabolicAdjustment > 0 ? '+' : ''}
                    {results.macroCalculationBreakdown.step5_metabolicAdjustment} cal
                  </Text>
                </View>
              )}
              {results.macroCalculationBreakdown.step6_aiAdjustment !== 0 && (
                <View style={styles.mathStep}>
                  <Text style={styles.mathStepLabel}>6. AI Recovery Adjustment</Text>
                  <Text style={styles.mathStepValue}>
                    {results.macroCalculationBreakdown.step6_aiAdjustment > 0 ? '+' : ''}
                    {results.macroCalculationBreakdown.step6_aiAdjustment} cal
                  </Text>
                </View>
              )}
              <View style={[styles.mathStep, styles.mathStepFinal]}>
                <Text style={styles.mathStepLabelFinal}>7. Final Target</Text>
                <Text style={styles.mathStepValueFinal}>{results.macroCalculationBreakdown.step7_finalCalories} cal/day</Text>
              </View>
            </View>
          </View>
        )}

        {/* Adherence */}
        {results.adherence && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>This Week's Adherence</Text>
            <Text style={styles.resultValue}>{results.adherence.averageMacroAdherence}%</Text>
            <Text style={styles.resultSubtext}>
              Logged {results.adherence.daysLogged}/7 days
            </Text>
          </View>
        )}

        {/* Goal Timeline Prediction */}
        {results.goalPrediction && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>🎯 Goal Timeline Prediction</Text>
            <Text style={styles.resultValue}>
              {results.goalPrediction.weeksToGoal} weeks to goal
            </Text>
            <Text style={styles.resultSubtext}>
              Confidence: {results.goalPrediction.confidenceInterval[0]}-{results.goalPrediction.confidenceInterval[1]} weeks
            </Text>
            <View style={[
              styles.trajectoryBadge,
              results.goalPrediction.trajectory === 'on_track' && styles.trajectoryOnTrack,
              results.goalPrediction.trajectory === 'ahead' && styles.trajectoryAhead,
              results.goalPrediction.trajectory === 'behind' && styles.trajectoryBehind
            ]}>
              <Text style={styles.trajectoryText}>
                {results.goalPrediction.trajectory === 'on_track' ? '✅ On Track' :
                 results.goalPrediction.trajectory === 'ahead' ? '🚀 Ahead of Schedule' :
                 '⚠️ Behind Schedule'}
              </Text>
            </View>
            <Text style={styles.predictionRecommendation}>
              {results.goalPrediction.recommendation}
            </Text>
          </View>
        )}

        {/* Macro Adjustment Recommendation */}
        {results.macroRecommendation && results.macroRecommendation.shouldAdjust && (
          <View style={styles.macroRecommendationCard}>
            <Text style={styles.resultLabel}>📊 Macro Adjustment Needed</Text>
            <Text style={styles.macroAdjustmentValue}>
              {results.macroRecommendation.calorieAdjustment > 0 ? '+' : ''}
              {results.macroRecommendation.calorieAdjustment} calories/day
            </Text>
            <Text style={styles.predictionRecommendation}>
              {results.macroRecommendation.reasoning}
            </Text>
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(results.macroRecommendation.confidence * 100)}%
            </Text>
          </View>
        )}

        {/* Plateau Warnings */}
        {results.plateauWarnings && results.plateauWarnings.length > 0 && (
          <View style={styles.plateauCard}>
            <Text style={styles.resultLabel}>⚠️ Training Plateau Alerts</Text>
            {results.plateauWarnings.map((warning: any, idx: number) => (
              <View key={idx} style={styles.plateauWarning}>
                <Text style={styles.plateauExercise}>{warning.exerciseName}</Text>
                <Text style={styles.plateauDetail}>
                  Stalled for {warning.weeksStalled} weeks at {warning.currentWeight} lbs
                </Text>
                <Text style={styles.plateauSuggestion}>
                  💡 {warning.suggestedAction}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* AI Insights - Biometrics */}
        {results.aiInsights?.biometrics && (
          <View style={[
            styles.resultCard,
            results.aiInsights.biometrics.recoveryStatus === 'Poor' && styles.warningCard
          ]}>
            <Text style={styles.resultLabel}>
              {results.aiInsights.biometrics.recoveryStatus === 'Poor' ? '⚠️ Recovery Metrics' : '✅ Recovery Metrics'}
            </Text>
            <Text style={styles.resultText}>{results.aiInsights.biometrics.interpretation}</Text>
            <View style={styles.biometricGrid}>
              {results.aiInsights.biometrics.sleep && (
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricLabel}>Sleep</Text>
                  <Text style={styles.biometricValue}>{results.aiInsights.biometrics.sleep}hrs</Text>
                </View>
              )}
              {results.aiInsights.biometrics.readiness && (
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricLabel}>Readiness</Text>
                  <Text style={styles.biometricValue}>{results.aiInsights.biometrics.readiness}/100</Text>
                </View>
              )}
              {results.aiInsights.biometrics.hrv && (
                <View style={styles.biometricItem}>
                  <Text style={styles.biometricLabel}>HRV</Text>
                  <Text style={styles.biometricValue}>{results.aiInsights.biometrics.hrv}ms</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Insights - TDEE Calculation */}
        {results.aiInsights?.tdeeCalculation && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>📊 Dynamic TDEE Calculation</Text>
            <Text style={styles.resultText}>{results.aiInsights.tdeeCalculation.interpretation}</Text>
            <View style={styles.tdeeBreakdown}>
              <Text style={styles.tdeeDetailText}>
                • {results.aiInsights.tdeeCalculation.workoutDays} workouts over 4 weeks
              </Text>
              <Text style={styles.tdeeDetailText}>
                • {results.aiInsights.tdeeCalculation.avgWorkoutsPerWeek}/week average
              </Text>
              <Text style={styles.tdeeDetailText}>
                • Activity Level: {results.aiInsights.tdeeCalculation.activityLevel}
              </Text>
            </View>
          </View>
        )}

        {/* AI Insights - Adjustment Reasoning */}
        {results.aiInsights?.aiAdjustment && (
          <View style={[
            styles.resultCard,
            results.aiInsights.aiAdjustment.isRecoveryPrioritized && styles.recoveryPrioritizedCard
          ]}>
            <Text style={styles.resultLabel}>
              {results.aiInsights.aiAdjustment.isRecoveryPrioritized ? '🧠 Recovery-Prioritized Decision' : '🎯 AI Adjustment'}
            </Text>
            <Text style={styles.resultValue}>
              {results.aiInsights.aiAdjustment.calorieChange > 0 ? '+' : ''}
              {results.aiInsights.aiAdjustment.calorieChange} calories
            </Text>
            <Text style={styles.resultText}>{results.aiInsights.aiAdjustment.interpretation}</Text>
          </View>
        )}

        {/* AI Insights - Deload */}
        {results.aiInsights?.deload && (
          <View style={styles.deloadCard}>
            <Text style={styles.resultLabel}>🚨 Deload Triggered</Text>
            <Text style={styles.resultText}>{results.aiInsights.deload.interpretation}</Text>
            <View style={styles.deloadDetails}>
              <Text style={styles.deloadDetailLabel}>Active Triggers:</Text>
              {results.aiInsights.deload.triggers.map((trigger: string, idx: number) => (
                <Text key={idx} style={styles.bulletPoint}>• {trigger}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Coach Message */}
        <View style={styles.coachMessageCard}>
          <Text style={styles.coachMessageTitle}>Coach Feedback</Text>
          <Text style={styles.coachMessageText}>{results.coachMessage}</Text>
        </View>

        {/* Body Composition */}
        {results.bodyComposition && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Body Composition Analysis</Text>
            <Text style={styles.resultText}>{results.bodyComposition.overallAssessment}</Text>
            {results.bodyComposition.visibleProgress?.length > 0 && (
              <>
                <Text style={styles.resultSubLabel}>Progress I'm Seeing:</Text>
                {results.bodyComposition.visibleProgress.map((item: string, idx: number) => (
                  <Text key={idx} style={styles.bulletPoint}>• {item}</Text>
                ))}
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.generatePlanButton, generatingPlan && styles.buttonDisabled]}
          onPress={handleGenerateMealPlan}
          disabled={generatingPlan}
        >
          {generatingPlan ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={styles.generatePlanButtonText}>🍽️ Generate New Meal Plan</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Weekly Check-In</Text>
          <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        {currentStep === 1 && renderWeightStep()}
        {currentStep === 2 && renderMoodEnergyStep()}
        {currentStep === 3 && renderNotesStep()}
        {currentStep === 4 && renderPhotosStep()}
        {currentStep === 5 && renderTrainingStep()}
        {currentStep === 6 && renderReviewStep()}
        {currentStep === 7 && renderResultsStep()}
      </View>

      {/* Navigation Buttons */}
      {currentStep < 7 && (
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.navButtonSecondary}
              onPress={handleBack}
            >
              <Text style={styles.navButtonSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < 6 && (
            <TouchableOpacity
              style={[styles.navButton, currentStep === 1 && !weight && styles.navButtonDisabled]}
              onPress={handleNext}
              disabled={currentStep === 1 && !weight}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          )}

          {currentStep === 6 && (
            <TouchableOpacity
              style={[styles.navButton, submitting && styles.navButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.navButtonText}>Submit Check-In</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.surface,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  stepTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  stepSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },

  // Weight Step
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xxxl,
  },
  weightInput: {
    fontSize: 72,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    minWidth: 150,
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: theme.fontSize.xxl,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.md,
  },

  // Mood & Energy Step
  sectionLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  moodButton: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  moodButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  moodLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  moodLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  energyContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  energyButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  energyButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  energyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  energyTextSelected: {
    color: theme.colors.background,
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyLabelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },

  // Notes Step
  notesInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 150,
  },
  characterCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: theme.spacing.sm,
  },

  // Photos Step
  photoSection: {
    marginBottom: theme.spacing.xl,
  },
  photoLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  photoInstruction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  photoButtons: {
    gap: theme.spacing.sm,
  },
  photoButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  photoButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  photoButtonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  photoButtonSecondaryText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  photoPreview: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surface,
  },
  photoActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  photoActionText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },

  // Review Step
  reviewSection: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  reviewLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  reviewValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },

  // Results Step
  resultsTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  resultLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  resultValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
  },
  resultSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  resultText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  resultSubLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  bulletPoint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  macroLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  coachMessageCard: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  coachMessageTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  coachMessageText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  generatePlanButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    ...theme.shadows.neon,
  },
  generatePlanButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  doneButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  doneButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },

  // Navigation
  navigation: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  navButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  navButtonSecondary: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  navButtonSecondaryText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },

  // Training Step
  emptyTrainingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  emptyTrainingEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  emptyTrainingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  trainingStatsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  trainingStatCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  trainingStatEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  trainingStatValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  trainingStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  trainingRatingContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  trainingRatingButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  trainingRatingButtonSelected: {
    borderColor: theme.colors.secondary,
    backgroundColor: theme.colors.secondary + '20',
  },
  trainingRatingText: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  trainingRatingTextSelected: {
    transform: [{ scale: 1.2 }],
  },
  trainingRatingLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.bold,
  },
  trainingRatingLabelSelected: {
    color: theme.colors.secondary,
  },
  trainingRatingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  trainingRatingLabelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  trainingNotesInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 100,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Prediction UI Styles
  trajectoryBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  trajectoryOnTrack: {
    backgroundColor: '#22c55e20',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  trajectoryAhead: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  trajectoryBehind: {
    backgroundColor: '#f59e0b20',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  trajectoryText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  predictionRecommendation: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  macroRecommendationCard: {
    backgroundColor: theme.colors.secondary + '10',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  macroAdjustmentValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
  },
  confidenceText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
    fontStyle: 'italic',
  },
  plateauCard: {
    backgroundColor: '#f59e0b10',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  plateauWarning: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  plateauExercise: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  plateauDetail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  plateauSuggestion: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Macro Calculation Breakdown Styles
  mathBreakdownCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  mathExplanation: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  mathSteps: {
    gap: theme.spacing.sm,
  },
  mathStep: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mathStepLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  mathStepValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  mathStepFinal: {
    borderBottomWidth: 0,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  mathStepLabelFinal: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    flex: 1,
  },
  mathStepValueFinal: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
  },

  // AI Insights Styles
  warningCard: {
    backgroundColor: '#f59e0b10',
    borderColor: '#f59e0b',
  },
  biometricGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  biometricItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  biometricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  biometricValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  tdeeBreakdown: {
    marginTop: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
  },
  tdeeDetailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  recoveryPrioritizedCard: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  deloadCard: {
    backgroundColor: '#ef444410',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  deloadDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#ef444440',
  },
  deloadDetailLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
});
