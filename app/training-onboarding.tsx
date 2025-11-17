// Training onboarding screen - Multi-step wizard
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { trainingAPI } from '../src/services/api';

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type PrimaryGoal = 'strength' | 'hypertrophy' | 'hybrid';

const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbells',
  'Kettlebells',
  'Resistance Bands',
  'Pull-up Bar',
  'Dip Station',
  'Bench (Flat)',
  'Bench (Adjustable)',
  'Squat Rack / Power Rack',
  'Cable Machine',
  'Leg Press',
  'Leg Curl Machine',
  'Leg Extension Machine',
  'Smith Machine',
  'Rowing Machine',
  'Assault Bike',
  'Treadmill',
  'Weight Plates',
  'EZ Bar',
  'Trap Bar',
  'Medicine Ball',
  'Suspension Trainer (TRX)',
  'Plyo Box',
  'Battle Ropes',
  'Landmine Attachment',
  'Gymnastic Rings',
];

const COMMON_INJURIES = [
  'Lower Back',
  'Knee',
  'Shoulder',
  'Elbow',
  'Wrist',
  'Hip',
  'Ankle',
  'Neck',
  'Rotator Cuff',
  'Achilles',
  'Hamstring',
];

export default function TrainingOnboardingScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  // Form data
  const [workoutLocation, setWorkoutLocation] = useState<'home' | 'gym' | 'both' | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [trainingDays, setTrainingDays] = useState(4);
  const [timePerSession, setTimePerSession] = useState(60);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [customInjury, setCustomInjury] = useState('');

  // Loading & generation status
  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [generationStepMessage, setGenerationStepMessage] = useState('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const experienceLevels: { value: ExperienceLevel; label: string; description: string }[] = [
    { value: 'beginner', label: 'Beginner', description: '0-1 years of consistent training' },
    { value: 'intermediate', label: 'Intermediate', description: '1-3 years of training experience' },
    { value: 'advanced', label: 'Advanced', description: '3+ years, strong foundation' },
  ];

  const goals: { value: PrimaryGoal; emoji: string; label: string; description: string }[] = [
    { value: 'strength', emoji: '💪', label: 'Strength', description: 'Focus on getting stronger, lower rep ranges' },
    { value: 'hypertrophy', emoji: '🦾', label: 'Hypertrophy', description: 'Build muscle size, moderate-high reps' },
    { value: 'hybrid', emoji: '⚡', label: 'Hybrid', description: 'Balance of strength and size gains' },
  ];

  const handleNext = () => {
    // Validation
    if (currentStep === 1 && !experienceLevel) {
      Alert.alert('Required', 'Please select your experience level');
      return;
    }
    if (currentStep === 2 && !primaryGoal) {
      Alert.alert('Required', 'Please select your primary goal');
      return;
    }
    if (currentStep === 5 && !workoutLocation) {
      Alert.alert('Required', 'Please select your workout location');
      return;
    }
    if (currentStep === 6 && equipment.length === 0) {
      Alert.alert('Required', 'Please select at least one piece of equipment');
      return;
    }

    // Auto-generate plan when advancing to final review step
    if (currentStep === 7) {
      setCurrentStep(8);
      // Automatically start plan generation
      setTimeout(() => handleGeneratePlan(), 500);
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item)
        ? prev.filter(e => e !== item)
        : [...prev, item]
    );
  };

  const toggleInjury = (item: string) => {
    setInjuries(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const addCustomInjury = () => {
    if (customInjury.trim() && !injuries.includes(customInjury.trim())) {
      setInjuries(prev => [...prev, customInjury.trim()]);
      setCustomInjury('');
    }
  };

  const handleDismissProgress = () => {
    // Stop polling but keep generation running in background
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setGenerating(false);

    // Navigate to tutorial after training onboarding completes
    Alert.alert(
      'Training Plan Generating!',
      'Your personalized program is being created. Let\'s complete the tour while it generates!',
      [
        {
          text: 'Continue',
          onPress: () => router.replace('/app-tutorial'),
        },
      ]
    );
  };

  const pollJobStatus = async (jobIdToPoll: number) => {
    try {
      const response = await trainingAPI.checkPlanStatus(jobIdToPoll);

      if (response.success && response.data) {
        const { status, progressPercentage, currentStep, trainingPlanId, errorMessage } = response.data;

        setGenerationStatus(status);
        setProgressPercentage(progressPercentage || 0);
        setGenerationStepMessage(currentStep || '');

        console.log(`[TRAINING_ONBOARDING] Status: ${status}, Progress: ${progressPercentage}%`);

        // Check if completed
        if (status === 'completed' && trainingPlanId) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setGenerating(false);
          console.log('[TRAINING_ONBOARDING] Plan generated successfully!');

          Alert.alert(
            'Training Plan Created!',
            `Your ${experienceLevel} ${primaryGoal} program is ready! Let's show you around the app.`,
            [
              {
                text: 'Start Tour',
                onPress: () => router.replace('/app-tutorial'),
              },
            ]
          );
        }

        // Check if failed
        if (status === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setGenerating(false);
          console.error('[TRAINING_ONBOARDING] Generation failed:', errorMessage);

          Alert.alert(
            'Generation Failed',
            errorMessage || 'Failed to generate training plan. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      console.error('[TRAINING_ONBOARDING] Polling error:', error);
      // Don't stop polling on network errors - might be temporary
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      setProgressPercentage(0);
      setGenerationStepMessage('Initializing...');
      console.log('[TRAINING_ONBOARDING] Starting plan generation...');

      const onboardingData = {
        experienceLevel: experienceLevel!,
        primaryGoal: primaryGoal!,
        trainingDays,
        timePerSession,
        equipment,
        injuryHistory: injuries.length > 0 ? injuries : undefined,
      };

      // Start generation - returns immediately with jobId
      const response = await trainingAPI.generatePlan(onboardingData);

      if (response.success && response.data?.jobId) {
        const newJobId = response.data.jobId;
        setJobId(newJobId);
        console.log('[TRAINING_ONBOARDING] Job started:', newJobId);

        // Start polling every 2 seconds
        pollingIntervalRef.current = setInterval(() => {
          pollJobStatus(newJobId);
        }, 2000);

        // Poll immediately once
        pollJobStatus(newJobId);
      } else {
        throw new Error(response.error || 'Failed to start generation');
      }
    } catch (error: any) {
      console.error('[TRAINING_ONBOARDING] Generation error:', error);
      setGenerating(false);
      Alert.alert('Error', error.message || 'Failed to generate training plan. Please try again.');
    }
  };

  // Step 1: Experience Level
  const renderExperienceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your experience level?</Text>
      <Text style={styles.stepSubtitle}>Be honest - this helps me design the right program</Text>

      <View style={styles.optionsContainer}>
        {experienceLevels.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[styles.optionCard, experienceLevel === level.value && styles.optionCardSelected]}
            onPress={() => setExperienceLevel(level.value)}
          >
            <Text style={[styles.optionLabel, experienceLevel === level.value && styles.optionLabelSelected]}>
              {level.label}
            </Text>
            <Text style={styles.optionDescription}>{level.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 2: Primary Goal
  const renderGoalStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your primary goal?</Text>
      <Text style={styles.stepSubtitle}>I'll periodize your training accordingly</Text>

      <View style={styles.optionsContainer}>
        {goals.map(goal => (
          <TouchableOpacity
            key={goal.value}
            style={[styles.goalCard, primaryGoal === goal.value && styles.goalCardSelected]}
            onPress={() => setPrimaryGoal(goal.value)}
          >
            <Text style={styles.goalEmoji}>{goal.emoji}</Text>
            <Text style={[styles.goalLabel, primaryGoal === goal.value && styles.goalLabelSelected]}>
              {goal.label}
            </Text>
            <Text style={styles.goalDescription}>{goal.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Step 3: Training Days
  const renderTrainingDaysStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How many days can you train?</Text>
      <Text style={styles.stepSubtitle}>Per week, consistently</Text>

      <View style={styles.daysContainer}>
        {[3, 4, 5, 6].map(days => (
          <TouchableOpacity
            key={days}
            style={[styles.dayButton, trainingDays === days && styles.dayButtonSelected]}
            onPress={() => setTrainingDays(days)}
          >
            <Text style={[styles.dayNumber, trainingDays === days && styles.dayNumberSelected]}>
              {days}
            </Text>
            <Text style={[styles.dayLabel, trainingDays === days && styles.dayLabelSelected]}>
              days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {trainingDays === 3 && '3 days: Full body or upper/lower split'}
          {trainingDays === 4 && '4 days: Upper/lower or push/pull split'}
          {trainingDays === 5 && '5 days: Push/pull/legs or body part split'}
          {trainingDays === 6 && '6 days: PPL or advanced body part split'}
        </Text>
      </View>
    </View>
  );

  // Step 4: Time Per Session
  const renderTimeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How long per session?</Text>
      <Text style={styles.stepSubtitle}>Realistic training time in minutes</Text>

      <View style={styles.timeContainer}>
        {[30, 45, 60, 90].map(time => (
          <TouchableOpacity
            key={time}
            style={[styles.timeButton, timePerSession === time && styles.timeButtonSelected]}
            onPress={() => setTimePerSession(time)}
          >
            <Text style={[styles.timeNumber, timePerSession === time && styles.timeNumberSelected]}>
              {time}
            </Text>
            <Text style={[styles.timeLabel, timePerSession === time && styles.timeLabelSelected]}>
              min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {timePerSession === 30 && 'Quick & efficient: 4-5 exercises, minimal rest'}
          {timePerSession === 45 && 'Standard: 5-6 exercises, good intensity'}
          {timePerSession === 60 && 'Solid session: 6-7 exercises, optimal volume'}
          {timePerSession === 90 && 'Extended: 7-9 exercises, high volume'}
        </Text>
      </View>
    </View>
  );

  // Step 5: Workout Location
  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Where do you work out?</Text>
      <Text style={styles.stepSubtitle}>I'll pre-select equipment for you</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.optionCard, workoutLocation === 'home' && styles.optionCardSelected]}
          onPress={() => {
            setWorkoutLocation('home');
            // Home preset: basic equipment
            setEquipment(['Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Bench (Flat)']);
          }}
        >
          <Text style={[styles.optionLabel, workoutLocation === 'home' && styles.optionLabelSelected]}>
            Home
          </Text>
          <Text style={styles.optionDescription}>
            Basic equipment: dumbbells, bands, pull-up bar, bench
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, workoutLocation === 'gym' && styles.optionCardSelected]}
          onPress={() => {
            setWorkoutLocation('gym');
            // Gym preset: all equipment
            setEquipment(EQUIPMENT_OPTIONS);
          }}
        >
          <Text style={[styles.optionLabel, workoutLocation === 'gym' && styles.optionLabelSelected]}>
            Gym
          </Text>
          <Text style={styles.optionDescription}>
            Full gym access: all equipment selected
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, workoutLocation === 'both' && styles.optionCardSelected]}
          onPress={() => {
            setWorkoutLocation('both');
            // Both preset: common equipment
            setEquipment(['Barbell', 'Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Bench (Flat)', 'Squat Rack / Power Rack']);
          }}
        >
          <Text style={[styles.optionLabel, workoutLocation === 'both' && styles.optionLabelSelected]}>
            Both
          </Text>
          <Text style={styles.optionDescription}>
            Mix of home and gym: versatile equipment selection
          </Text>
        </TouchableOpacity>
      </View>

      {workoutLocation && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✅ {equipment.length} items selected (you can customize in the next step)
          </Text>
        </View>
      )}
    </View>
  );

  // Step 6: Equipment
  const renderEquipmentStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Customize your equipment</Text>
      <Text style={styles.stepSubtitle}>Pre-selected based on your location - adjust as needed</Text>

      <View style={styles.equipmentGrid}>
        {EQUIPMENT_OPTIONS.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.equipmentChip, equipment.includes(item) && styles.equipmentChipSelected]}
            onPress={() => toggleEquipment(item)}
          >
            <Text style={[styles.equipmentText, equipment.includes(item) && styles.equipmentTextSelected]}>
              {equipment.includes(item) ? '✓ ' : ''}{item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectedCount}>{equipment.length} selected</Text>
    </ScrollView>
  );

  // Step 6: Injury History (Optional)
  const renderInjuryStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Any injury history?</Text>
      <Text style={styles.stepSubtitle}>Optional - I'll program around these</Text>

      <View style={styles.injuryGrid}>
        {COMMON_INJURIES.map(item => (
          <TouchableOpacity
            key={item}
            style={[styles.injuryChip, injuries.includes(item) && styles.injuryChipSelected]}
            onPress={() => toggleInjury(item)}
          >
            <Text style={[styles.injuryText, injuries.includes(item) && styles.injuryTextSelected]}>
              {injuries.includes(item) ? '✓ ' : ''}{item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.customInjuryContainer}>
        <TextInput
          style={styles.customInjuryInput}
          value={customInjury}
          onChangeText={setCustomInjury}
          placeholder="Add custom injury/limitation..."
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={addCustomInjury}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={addCustomInjury}
          disabled={!customInjury.trim()}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {injuries.length > 0 && (
        <View style={styles.selectedInjuries}>
          <Text style={styles.selectedInjuriesLabel}>Will program around:</Text>
          {injuries.map((injury, idx) => (
            <View key={idx} style={styles.selectedInjuryChip}>
              <Text style={styles.selectedInjuryText}>{injury}</Text>
              <TouchableOpacity onPress={() => setInjuries(prev => prev.filter(i => i !== injury))}>
                <Text style={styles.removeInjuryText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {injuries.length === 0 && (
        <Text style={styles.noInjuriesText}>No worries! You can skip this if you're injury-free.</Text>
      )}
    </ScrollView>
  );

  // Step 7: Review & Generate
  const renderReviewStep = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Ready to generate your plan?</Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Experience</Text>
        <Text style={styles.reviewValue}>{experienceLevel}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Goal</Text>
        <Text style={styles.reviewValue}>{primaryGoal}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Schedule</Text>
        <Text style={styles.reviewValue}>{trainingDays} days/week, {timePerSession} min/session</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>Equipment</Text>
        <Text style={styles.reviewValue}>{equipment.join(', ')}</Text>
      </View>

      {injuries.length > 0 && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>Injury Considerations</Text>
          <Text style={styles.reviewValue}>{injuries.join(', ')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.generateButton, generating && styles.generateButtonDisabled]}
        onPress={handleGeneratePlan}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={styles.generateButtonText}>🚀 Generate My Training Plan</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.generateNote}>
        This will take 5-10 minutes as I design your custom 12-week program. You can navigate away and come back.
      </Text>
    </ScrollView>
  );

  // Progress Modal
  const renderProgressModal = () => (
    <Modal
      visible={generating}
      transparent
      animationType="fade"
      onRequestClose={handleDismissProgress}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleDismissProgress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.modalCloseButtonText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Generating Your Training Plan</Text>
          <Text style={styles.modalSubtitle}>This will take 5-10 minutes...</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
          </View>

          {/* Progress Percentage */}
          <Text style={styles.progressPercentageText}>{progressPercentage}%</Text>

          {/* Current Step */}
          <View style={styles.currentStepContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.currentStepText}>{generationStepMessage || 'Initializing...'}</Text>
          </View>

          {/* Info */}
          <View style={styles.modalInfoBox}>
            <Text style={styles.modalInfoText}>
              I'm designing your custom 12-week program with progressive overload, periodization, and exercise selection tailored to your goals.
            </Text>
          </View>

          <Text style={styles.modalFooterText}>
            You can close this app and come back - your plan will be ready!
          </Text>
        </View>
      </View>
    </Modal>
  );

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      {/* Progress Modal */}
      {renderProgressModal()}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Training Setup</Text>
          <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>

      {/* Step Content */}
      <View style={styles.content}>
        {currentStep === 1 && renderExperienceStep()}
        {currentStep === 2 && renderGoalStep()}
        {currentStep === 3 && renderTrainingDaysStep()}
        {currentStep === 4 && renderTimeStep()}
        {currentStep === 5 && renderLocationStep()}
        {currentStep === 6 && renderEquipmentStep()}
        {currentStep === 7 && renderInjuryStep()}
        {currentStep === 8 && renderReviewStep()}
      </View>

      {/* Navigation Buttons */}
      {currentStep < 8 && (
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.navButtonSecondary}
              onPress={handleBack}
            >
              <Text style={styles.navButtonSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navButton,
              (currentStep === 1 && !experienceLevel) && styles.navButtonDisabled,
              (currentStep === 2 && !primaryGoal) && styles.navButtonDisabled,
              (currentStep === 5 && !workoutLocation) && styles.navButtonDisabled,
              (currentStep === 6 && equipment.length === 0) && styles.navButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={
              (currentStep === 1 && !experienceLevel) ||
              (currentStep === 2 && !primaryGoal) ||
              (currentStep === 5 && !workoutLocation) ||
              (currentStep === 6 && equipment.length === 0)
            }
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  skipButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  skipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
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

  // Experience Level
  optionsContainer: {
    gap: theme.spacing.md,
  },
  optionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  optionLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionLabelSelected: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  // Goal
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  goalCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  goalEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  goalLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  goalLabelSelected: {
    color: theme.colors.primary,
  },
  goalDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Training Days
  daysContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  dayButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  dayButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  dayNumber: {
    fontSize: 36,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  dayNumberSelected: {
    color: theme.colors.background,
  },
  dayLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  dayLabelSelected: {
    color: theme.colors.background,
  },

  // Time Per Session
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  timeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  timeButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  timeNumber: {
    fontSize: 32,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  timeNumberSelected: {
    color: theme.colors.background,
  },
  timeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  timeLabelSelected: {
    color: theme.colors.background,
  },

  // Info Box
  infoBox: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    textAlign: 'center',
  },

  // Equipment
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  equipmentChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  equipmentChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  equipmentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  equipmentTextSelected: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  selectedCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Injury
  injuryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  injuryChip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  injuryChipSelected: {
    backgroundColor: theme.colors.warning + '40',
    borderColor: theme.colors.warning,
  },
  injuryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  injuryTextSelected: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
  },
  customInjuryContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  customInjuryInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  selectedInjuries: {
    marginTop: theme.spacing.md,
  },
  selectedInjuriesLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  selectedInjuryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.warning + '20',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  selectedInjuryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  removeInjuryText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
  },
  noInjuriesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: theme.spacing.lg,
  },

  // Review
  reviewCard: {
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
  generateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.neon,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  generateNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
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

  // Progress Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  progressPercentageText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  currentStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
  },
  currentStepText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  modalInfoBox: {
    backgroundColor: theme.colors.primary + '15',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  modalInfoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  modalFooterText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalCloseButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.bold,
  },
});
