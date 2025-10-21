// Account settings screen - edit profile and onboarding data
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/theme';
import { foodLogAPI, trainingAPI, goalDateAPI } from '../src/services/api';
import { GoalDateValidationResult } from '../src/types';
import {
  scheduleSmartReminders,
  scheduleEndOfDayReminder,
  cancelAllReminders,
  MealReminderTime,
  analyzeEatingPatterns,
} from '../src/utils/smartNotifications';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [upcomingReminders, setUpcomingReminders] = useState<MealReminderTime[]>([]);

  // Profile data - matching signup exactly
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('8');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [bodyfat, setBodyfat] = useState('');
  const [goal, setGoal] = useState<'cut' | 'recomp' | 'bulk'>('recomp');
  const [goalWeight, setGoalWeight] = useState('');
  const [activity, setActivity] = useState('1.55');
  const [mealsPerDay, setMealsPerDay] = useState('3');
  const [dietType, setDietType] = useState('');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [mustIncludeFoods, setMustIncludeFoods] = useState('');
  const [dislikes, setDislikes] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalDateValidation, setGoalDateValidation] = useState<GoalDateValidationResult | null>(null);
  const [isValidatingDate, setIsValidatingDate] = useState(false);

  // Training preferences
  const [workoutLocation, setWorkoutLocation] = useState<'home' | 'gym' | 'both' | ''>('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [primaryGoal, setPrimaryGoal] = useState<'strength' | 'hypertrophy' | 'hybrid' | ''>('');
  const [trainingDays, setTrainingDays] = useState('4');
  const [timePerSession, setTimePerSession] = useState('60');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState<string[]>([]);

  const ALLERGEN_OPTIONS = ['dairy', 'nuts', 'peanuts', 'shellfish', 'soy', 'eggs', 'gluten', 'fish'];
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
  const COMMON_INJURIES = ['Lower Back', 'Knee', 'Shoulder', 'Elbow', 'Wrist', 'Hip', 'Ankle', 'Neck', 'Rotator Cuff', 'Achilles', 'Hamstring'];

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
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

  const validateGoalDateAsync = async (dateString: string) => {
    if (!weight || !goalWeight || !goal) return;

    try {
      setIsValidatingDate(true);

      const weightNum = parseFloat(weight);
      const goalWeightNum = parseFloat(goalWeight);
      const bodyfatNum = bodyfat ? parseFloat(bodyfat) : undefined;
      const totalInches = parseInt(heightFeet) * 12 + parseInt(heightInches);
      const heightCm = Math.round(totalInches * 2.54);

      const response = await goalDateAPI.validateGoalDate({
        currentWeight: weightNum,
        goalWeight: goalWeightNum,
        goalDate: dateString,
        goal: goal as 'cut' | 'bulk' | 'recomp',
        bodyfat: bodyfatNum,
        height_cm: heightCm,
      });

      if (response.success && response.data) {
        setGoalDateValidation(response.data);

        // If adjusted, auto-update to safe date
        if (response.data.wasAdjusted && response.data.adjustedDate) {
          setGoalDate(response.data.adjustedDate);
        }
      }
    } catch (error) {
      console.error('[SETTINGS] Error validating goal date:', error);
    } finally {
      setIsValidatingDate(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadUpcomingReminders();
  }, []);

  const loadProfile = async () => {
    try {
      console.log('[SETTINGS] Loading profile from backend API');
      const { authAPI: auth } = await import('../src/services/api');
      const response = await auth.getProfile();

      if (!response.success || !response.data) {
        console.error('[SETTINGS] No profile data returned');
        Alert.alert(ErrorMessages.notLoggedIn.title, ErrorMessages.notLoggedIn.message);
        router.replace('/');
        return;
      }

      const data = response.data;
      console.log('[SETTINGS] Profile loaded successfully');

      setUserId(data.id);
      setEmail(data.email || '');

      if (data) {
        setFullName(data.full_name || '');
        setWeight(data.weight?.toString() || '');
        setGoal(data.goal || 'recomp');
        setGoalWeight(data.goal_weight?.toString() || '');
        setGoalDate(data.goal_date || '');
        setDietType(data.diet_type || '');
        setSelectedAllergens(data.allergens || []);
        setMustIncludeFoods(data.must_include ? data.must_include.join(', ') : '');
        setDislikes(data.dislikes ? data.dislikes.join(', ') : '');
        setAge(data.age?.toString() || '');
        setSex(data.sex || '');
        setBodyfat(data.bodyfat?.toString() || '');
        setActivity(data.activity?.toString() || '1.55');
        setMealsPerDay(data.meals_per_day?.toString() || '3');
        setNotificationsEnabled(data.notifications_enabled || false);

        // Convert height_cm back to feet/inches
        if (data.height_cm) {
          const totalInches = Math.round(data.height_cm / 2.54);
          const feet = Math.floor(totalInches / 12);
          const inches = totalInches % 12;
          setHeightFeet(feet.toString());
          setHeightInches(inches.toString());
        }

        // Load training preferences (stored locally, not in backend)
        setWorkoutLocation('');
        setExperienceLevel('');
        setPrimaryGoal('');
        setTrainingDays('4');
        setTimePerSession('60');
        setEquipment([]);
        setInjuries([]);
      }
    } catch (error) {
      console.error('[SETTINGS] Exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingReminders = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data) {
        const reminders = analyzeEatingPatterns(response.data);
        setUpcomingReminders(reminders);
      }
    } catch (error) {
      console.error('[SETTINGS] Error loading reminders:', error);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    try {
      if (!userId) {
        console.error('[SETTINGS] No userId available for notifications toggle');
        return;
      }

      if (enabled) {
        // Enable notifications - schedule based on eating patterns
        const response = await foodLogAPI.getWeek();
        if (response.success && response.data) {
          await scheduleSmartReminders(response.data);
          await scheduleEndOfDayReminder();
          await loadUpcomingReminders();

          Alert.alert(
            'Reminders Enabled! 🔔',
            "I've set up personalized reminders based on your eating patterns. You can disable them anytime!",
            [{ text: 'Sounds Good!' }]
          );
        }
      } else {
        // Disable notifications
        await cancelAllReminders();
        setUpcomingReminders([]);

        Alert.alert(
          'Reminders Disabled',
          "No worries! You can always re-enable them when you're ready.",
          [{ text: 'Got It' }]
        );
      }

      // Save preference to database
      await supabase
        .from('user_profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', userId);

      setNotificationsEnabled(enabled);
    } catch (error: any) {
      console.error('[SETTINGS] Error toggling notifications:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    }
  };

  const formatReminderTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please enter your full name');
      return;
    }

    if (!weight || isNaN(parseFloat(weight))) {
      Alert.alert(ErrorMessages.invalidWeight.title, ErrorMessages.invalidWeight.message);
      return;
    }

    // Require goal_weight for cut/bulk goals
    if ((goal === 'cut' || goal === 'bulk') && !goalWeight) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please enter your goal weight');
      return;
    }

    // Validate goal weight if provided
    if (goalWeight) {
      const goalWeightNum = parseFloat(goalWeight);
      const weightNum = parseFloat(weight);

      if (isNaN(goalWeightNum) || goalWeightNum < 50 || goalWeightNum > 500) {
        Alert.alert('Invalid Goal Weight', 'Please enter a valid goal weight between 50-500 lbs');
        return;
      }

      // Validate goal weight makes sense for the goal
      if (goal === 'cut' && goalWeightNum >= weightNum) {
        Alert.alert('Invalid Goal Weight', 'For cutting, goal weight should be less than current weight');
        return;
      }
      if (goal === 'bulk' && goalWeightNum <= weightNum) {
        Alert.alert('Invalid Goal Weight', 'For bulking, goal weight should be more than current weight');
        return;
      }
    }

    setSaving(true);
    try {
      // Convert feet/inches to cm
      const totalInches = parseInt(heightFeet) * 12 + parseInt(heightInches);
      const heightCm = Math.round(totalInches * 2.54);

      console.log('[SETTINGS] Updating profile via backend API');
      const { authAPI: auth } = await import('../src/services/api');
      const response = await auth.updateProfile({
        email,
        full_name: fullName.trim(),
        weight: parseFloat(weight),
        height_cm: heightCm,
        age: age ? parseInt(age) : null,
        sex: sex || null,
        bodyfat: bodyfat ? parseFloat(bodyfat) : null,
        goal,
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
        goal_date: goalDate || null,
        activity: parseFloat(activity),
        meals_per_day: parseInt(mealsPerDay),
        diet_type: dietType || null,
        allergens: selectedAllergens,
        must_include: mustIncludeFoods ? mustIncludeFoods.split(',').map(f => f.trim()).filter(Boolean) : [],
        dislikes: dislikes ? dislikes.split(',').map(d => d.trim()).filter(Boolean) : [],
        updated_at: new Date().toISOString(),
      });

      if (!response.success) {
        console.error('[SETTINGS] Save error:', response.error);
        const friendlyError = getUserFriendlyError(response.error || response);
        Alert.alert(friendlyError.title, friendlyError.message);
      } else {
        console.log('[SETTINGS] Profile updated successfully');
        Alert.alert(SuccessMessages.profileUpdated.title, SuccessMessages.profileUpdated.message, [
          { text: 'Perfect!', onPress: () => router.back() }
        ]);
      }
    } catch (error: any) {
      console.error('[SETTINGS] Save exception:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>💭 Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.subtitle}>Keep your info up to date so I can support you better ✨</Text>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>🎨 Appearance</Text>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push('/theme-settings')}
        >
          <Text style={styles.settingLabel}>Theme Settings</Text>
          <Text style={styles.settingChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Section */}
      <View style={styles.notificationsSection}>
        <Text style={styles.sectionHeader}>📱 Notifications</Text>
        <View style={styles.notificationCard}>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationLabel}>Smart Meal Reminders 🔔</Text>
            <Text style={styles.notificationDescription}>
              Get personalized reminders based on when you usually eat
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary + '50' }}
            thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textMuted}
          />
        </View>

        {notificationsEnabled && upcomingReminders.length > 0 && (
          <View style={styles.remindersPreview}>
            <Text style={styles.remindersTitle}>📅 Your Reminder Schedule</Text>
            {upcomingReminders.map((reminder, index) => (
              <View key={index} style={styles.reminderItem}>
                <Text style={styles.reminderMeal}>
                  {reminder.mealType.charAt(0).toUpperCase() + reminder.mealType.slice(1)}
                </Text>
                <Text style={styles.reminderTime}>
                  {formatReminderTime(reminder.hour, reminder.minute)}
                </Text>
              </View>
            ))}
            <Text style={styles.remindersNote}>
              💡 Based on your eating patterns from the past week
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.form}>
        {/* Email (read-only) */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={email}
          editable={false}
        />
        <Text style={styles.hint}>Email cannot be changed</Text>

        {/* Full Name */}
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Weight */}
        <Text style={styles.label}>Weight (lbs) *</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          placeholder="150"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="decimal-pad"
        />

        {/* Height */}
        <Text style={styles.label}>Height *</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Feet</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['4', '5', '6', '7'].map(ft => (
                  <TouchableOpacity
                    key={ft}
                    style={[styles.pickerOption, heightFeet === ft && styles.pickerOptionActive]}
                    onPress={() => setHeightFeet(ft)}
                  >
                    <Text style={[styles.pickerText, heightFeet === ft && styles.pickerTextActive]}>{ft}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Inches</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map(inch => (
                  <TouchableOpacity
                    key={inch}
                    style={[styles.pickerOption, heightInches === inch && styles.pickerOptionActive]}
                    onPress={() => setHeightInches(inch)}
                  >
                    <Text style={[styles.pickerText, heightInches === inch && styles.pickerTextActive]}>{inch}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Age */}
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="30"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
        />

        {/* Sex */}
        <Text style={styles.label}>Sex</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, sex === 'male' && styles.chipActive]}
            onPress={() => setSex('male')}
          >
            <Text style={[styles.chipText, sex === 'male' && styles.chipTextActive]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, sex === 'female' && styles.chipActive]}
            onPress={() => setSex('female')}
          >
            <Text style={[styles.chipText, sex === 'female' && styles.chipTextActive]}>Female</Text>
          </TouchableOpacity>
        </View>

        {/* Body Fat % */}
        <Text style={styles.label}>Body Fat % (optional)</Text>
        <TextInput
          style={styles.input}
          value={bodyfat}
          onChangeText={setBodyfat}
          placeholder="20"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="numeric"
        />

        {/* Goal */}
        <Text style={styles.label}>Goal *</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, goal === 'cut' && styles.chipActive]}
            onPress={() => setGoal('cut')}
          >
            <Text style={[styles.chipText, goal === 'cut' && styles.chipTextActive]}>Cut</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, goal === 'recomp' && styles.chipActive]}
            onPress={() => setGoal('recomp')}
          >
            <Text style={[styles.chipText, goal === 'recomp' && styles.chipTextActive]}>Recomp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, goal === 'bulk' && styles.chipActive]}
            onPress={() => setGoal('bulk')}
          >
            <Text style={[styles.chipText, goal === 'bulk' && styles.chipTextActive]}>Bulk</Text>
          </TouchableOpacity>
        </View>

        {/* Goal Weight (only for cut/bulk) */}
        {(goal === 'cut' || goal === 'bulk') && (
          <>
            <Text style={styles.label}>Goal Weight (lbs) *</Text>
            <TextInput
              style={styles.input}
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder={goal === 'cut' ? "140" : "180"}
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />

            {/* Goal Date (optional) */}
            <Text style={styles.label}>When do you want to reach your goal? (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (e.g., 2026-06-01)"
              placeholderTextColor={theme.colors.textMuted}
              value={goalDate}
              onChangeText={(text) => {
                setGoalDate(text);
                // Trigger validation when user enters a complete date
                if (text.length === 10 && weight && goalWeight) {
                  validateGoalDateAsync(text);
                }
              }}
            />

            {/* Validation status */}
            {isValidatingDate && (
              <Text style={styles.validatingText}>Validating timeline...</Text>
            )}

            {/* Adjusted timeline warning */}
            {goalDateValidation && goalDateValidation.wasAdjusted && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Timeline Adjusted for Safety</Text>
                <Text style={styles.warningText}>
                  Your original timeline required {Math.abs(goalDateValidation.requiredRate).toFixed(1)} lbs/week.
                </Text>
                <Text style={styles.warningText}>
                  Safe maximum: {Math.abs(goalDateValidation.safeLimits.maxSafeCutRate).toFixed(1)} lbs/week
                </Text>
                <Text style={styles.warningText}>
                  Adjusted date: {new Date(goalDateValidation.adjustedDate!).toLocaleDateString()}
                </Text>
                <Text style={styles.reasonText}>{goalDateValidation.reason}</Text>
              </View>
            )}

            {/* Safe timeline confirmation */}
            {goalDateValidation && !goalDateValidation.wasAdjusted && goalDateValidation.isValid && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✅ Timeline looks great! Safe and sustainable.</Text>
                <Text style={styles.successSubtext}>
                  Required pace: {Math.abs(goalDateValidation.requiredRate).toFixed(1)} lbs/week
                </Text>
              </View>
            )}
          </>
        )}

        {/* Activity Level */}
        <Text style={styles.label}>Activity Level</Text>
        <View style={styles.column}>
          {[
            { value: '1.2', label: 'Sedentary (little to no exercise)' },
            { value: '1.375', label: 'Light (1-3 days/week)' },
            { value: '1.55', label: 'Moderate (3-5 days/week)' },
            { value: '1.725', label: 'Active (6-7 days/week)' },
            { value: '1.9', label: 'Very Active (2x per day)' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.radioOption, activity === option.value && styles.radioOptionActive]}
              onPress={() => setActivity(option.value)}
            >
              <View style={[styles.radio, activity === option.value && styles.radioActive]}>
                {activity === option.value && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, activity === option.value && styles.radioTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meals Per Day */}
        <Text style={styles.label}>Meals Per Day</Text>
        <View style={styles.row}>
          {['2', '3', '4', '5', '6'].map(num => (
            <TouchableOpacity
              key={num}
              style={[styles.chip, mealsPerDay === num && styles.chipActive]}
              onPress={() => setMealsPerDay(num)}
            >
              <Text style={[styles.chipText, mealsPerDay === num && styles.chipTextActive]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Diet Type */}
        <Text style={styles.label}>Diet Type</Text>
        <View style={styles.column}>
          {[
            { value: '', label: 'No Restrictions' },
            { value: 'keto', label: 'Keto' },
            { value: 'vegetarian', label: 'Vegetarian' },
            { value: 'vegan', label: 'Vegan' },
            { value: 'pescatarian', label: 'Pescatarian' },
            { value: 'halal', label: 'Halal' },
            { value: 'kosher', label: 'Kosher' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.radioOption, dietType === option.value && styles.radioOptionActive]}
              onPress={() => setDietType(option.value)}
            >
              <View style={[styles.radio, dietType === option.value && styles.radioActive]}>
                {dietType === option.value && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.radioText, dietType === option.value && styles.radioTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Allergens */}
        <Text style={styles.label}>Allergens (select all that apply)</Text>
        <View style={styles.wrapRow}>
          {ALLERGEN_OPTIONS.map(allergen => (
            <TouchableOpacity
              key={allergen}
              style={[styles.checkbox, selectedAllergens.includes(allergen) && styles.checkboxActive]}
              onPress={() => toggleAllergen(allergen)}
            >
              <Text style={[styles.checkboxText, selectedAllergens.includes(allergen) && styles.checkboxTextActive]}>
                {allergen}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Must Include Foods */}
        <Text style={styles.label}>Must Include Foods (optional)</Text>
        <TextInput
          style={styles.input}
          value={mustIncludeFoods}
          onChangeText={setMustIncludeFoods}
          placeholder="e.g., chicken, rice, broccoli (comma separated)"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Dislikes/Avoid Foods */}
        <Text style={styles.label}>Foods to Avoid (optional)</Text>
        <TextInput
          style={styles.input}
          value={dislikes}
          onChangeText={setDislikes}
          placeholder="e.g., beef, pork, mushrooms (comma separated)"
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Training Preferences Section */}
        <View style={styles.divider} />
        <Text style={styles.sectionHeader}>💪 Training Preferences</Text>
        <Text style={styles.hint}>Set your training goals to generate a personalized workout program</Text>

        {/* Workout Location */}
        <Text style={styles.label}>Where do you work out?</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, workoutLocation === 'home' && styles.chipActive]}
            onPress={() => {
              setWorkoutLocation('home');
              // Home preset: minimal equipment
              setEquipment(['Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Bench (Flat)']);
            }}
          >
            <Text style={[styles.chipText, workoutLocation === 'home' && styles.chipTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, workoutLocation === 'gym' && styles.chipActive]}
            onPress={() => {
              setWorkoutLocation('gym');
              // Gym preset: all equipment
              setEquipment(EQUIPMENT_OPTIONS);
            }}
          >
            <Text style={[styles.chipText, workoutLocation === 'gym' && styles.chipTextActive]}>Gym</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, workoutLocation === 'both' && styles.chipActive]}
            onPress={() => {
              setWorkoutLocation('both');
              // Both preset: common equipment
              setEquipment(['Barbell', 'Dumbbells', 'Resistance Bands', 'Pull-up Bar', 'Bench (Flat)', 'Squat Rack / Power Rack']);
            }}
          >
            <Text style={[styles.chipText, workoutLocation === 'both' && styles.chipTextActive]}>Both</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {workoutLocation === 'gym' && '✅ All equipment selected (customize below if needed)'}
          {workoutLocation === 'home' && '✅ Basic home equipment selected (customize below)'}
          {workoutLocation === 'both' && '✅ Common equipment selected (customize below)'}
        </Text>

        {/* Experience Level */}
        <Text style={styles.label}>Experience Level</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, experienceLevel === 'beginner' && styles.chipActive]}
            onPress={() => setExperienceLevel('beginner')}
          >
            <Text style={[styles.chipText, experienceLevel === 'beginner' && styles.chipTextActive]}>Beginner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, experienceLevel === 'intermediate' && styles.chipActive]}
            onPress={() => setExperienceLevel('intermediate')}
          >
            <Text style={[styles.chipText, experienceLevel === 'intermediate' && styles.chipTextActive]}>Intermediate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, experienceLevel === 'advanced' && styles.chipActive]}
            onPress={() => setExperienceLevel('advanced')}
          >
            <Text style={[styles.chipText, experienceLevel === 'advanced' && styles.chipTextActive]}>Advanced</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Goal */}
        <Text style={styles.label}>Primary Training Goal</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.chip, primaryGoal === 'strength' && styles.chipActive]}
            onPress={() => setPrimaryGoal('strength')}
          >
            <Text style={[styles.chipText, primaryGoal === 'strength' && styles.chipTextActive]}>Strength</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, primaryGoal === 'hypertrophy' && styles.chipActive]}
            onPress={() => setPrimaryGoal('hypertrophy')}
          >
            <Text style={[styles.chipText, primaryGoal === 'hypertrophy' && styles.chipTextActive]}>Hypertrophy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, primaryGoal === 'hybrid' && styles.chipActive]}
            onPress={() => setPrimaryGoal('hybrid')}
          >
            <Text style={[styles.chipText, primaryGoal === 'hybrid' && styles.chipTextActive]}>Hybrid</Text>
          </TouchableOpacity>
        </View>

        {/* Training Days Per Week */}
        <Text style={styles.label}>Training Days Per Week</Text>
        <View style={styles.row}>
          {['3', '4', '5', '6'].map(days => (
            <TouchableOpacity
              key={days}
              style={[styles.chip, trainingDays === days && styles.chipActive]}
              onPress={() => setTrainingDays(days)}
            >
              <Text style={[styles.chipText, trainingDays === days && styles.chipTextActive]}>{days}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time Per Session */}
        <Text style={styles.label}>Time Per Session (minutes)</Text>
        <View style={styles.row}>
          {['30', '45', '60', '90'].map(time => (
            <TouchableOpacity
              key={time}
              style={[styles.chip, timePerSession === time && styles.chipActive]}
              onPress={() => setTimePerSession(time)}
            >
              <Text style={[styles.chipText, timePerSession === time && styles.chipTextActive]}>{time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Equipment Available */}
        <Text style={styles.label}>Equipment Available (select all that apply)</Text>
        <View style={styles.wrapRow}>
          {EQUIPMENT_OPTIONS.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.checkbox, equipment.includes(item) && styles.checkboxActive]}
              onPress={() => toggleEquipment(item)}
            >
              <Text style={[styles.checkboxText, equipment.includes(item) && styles.checkboxTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Injury History */}
        <Text style={styles.label}>Injury History (optional - I'll program around these)</Text>
        <View style={styles.wrapRow}>
          {COMMON_INJURIES.map(item => (
            <TouchableOpacity
              key={item}
              style={[styles.checkbox, injuries.includes(item) && styles.checkboxActive]}
              onPress={() => toggleInjury(item)}
            >
              <Text style={[styles.checkboxText, injuries.includes(item) && styles.checkboxTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '💭 Updating...' : 'Save Changes 🎯'}
          </Text>
        </TouchableOpacity>

        {/* Generate Training Plan Button */}
        {workoutLocation && experienceLevel && primaryGoal && equipment.length > 0 && (
          <TouchableOpacity
            style={styles.trainingPlanButton}
            onPress={async () => {
              try {
                setSaving(true);
                const onboardingData = {
                  experienceLevel,
                  primaryGoal,
                  trainingDays: parseInt(trainingDays),
                  timePerSession: parseInt(timePerSession),
                  equipment,
                  injuryHistory: injuries.length > 0 ? injuries : undefined,
                };

                const response = await trainingAPI.generatePlan(onboardingData);

                if (response.success) {
                  Alert.alert(
                    'Training Plan Created! 🎉',
                    `Your ${experienceLevel} ${primaryGoal} program is ready. ${trainingDays} workouts per week, ${timePerSession} minutes each. Location: ${workoutLocation}.`,
                    [
                      {
                        text: 'View My Program',
                        onPress: () => router.push('/(tabs)/training'),
                      },
                    ]
                  );
                } else {
                  throw new Error(response.error || 'Failed to generate plan');
                }
              } catch (error: any) {
                console.error('[SETTINGS] Training plan generation error:', error);
                Alert.alert('Error', error.message || 'Failed to generate training plan. Please try again.');
              } finally {
                setSaving(false);
              }
            }}
          >
            <Text style={styles.trainingPlanButtonText}>🚀 Generate My Training Plan</Text>
          </TouchableOpacity>
        )}

        {/* Helper text for incomplete training preferences */}
        {(!workoutLocation || !experienceLevel || !primaryGoal || equipment.length === 0) && (
          <Text style={styles.helperText}>
            💡 Fill out all training preferences above to generate your custom program
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
    marginTop: 100,
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
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  settingChevron: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  form: {
    padding: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  smallLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.md,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  hint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    marginTop: -8,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  column: {
    marginBottom: theme.spacing.md,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  chip: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    flex: 1,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  chipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  chipTextActive: {
    color: theme.colors.primary,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  radioOptionActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '15',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  radioText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  radioTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  checkbox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  checkboxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  checkboxText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize',
  },
  checkboxTextActive: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  pickerOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
  },
  pickerOptionActive: {
    backgroundColor: theme.colors.primary,
  },
  pickerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
  },
  pickerTextActive: {
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    ...theme.shadows.neon,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.5,
  },
  notificationsSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  sectionHeader: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  notificationInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  notificationLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  notificationDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  remindersPreview: {
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  remindersTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  reminderMeal: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  reminderTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  remindersNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
  },
  trainingPlanButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  trainingPlanButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1.5,
  },
  helperText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    fontStyle: 'italic',
  },
  validatingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  warningBox: {
    backgroundColor: '#FFA50020',
    borderWidth: 2,
    borderColor: '#FFA500',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  warningTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#FFA500',
    marginBottom: theme.spacing.sm,
  },
  warningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  reasonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  successBox: {
    backgroundColor: '#00FF0020',
    borderWidth: 2,
    borderColor: '#00CC00',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  successText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: '#00CC00',
    marginBottom: theme.spacing.xs,
  },
  successSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
});
