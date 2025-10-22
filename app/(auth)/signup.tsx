// Signup screen with onboarding
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { authAPI, mealPlanAPI, goalDateAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { ErrorMessages, getUserFriendlyError } from '../../src/utils/errorMessages';
import { GoalDateValidationResult } from '../../src/types';

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  // Account info
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Onboarding info
  const [weight, setWeight] = useState('');
  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('8');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | ''>('');
  const [bodyfat, setBodyfat] = useState('');
  const [goal, setGoal] = useState<'cut' | 'recomp' | 'bulk' | ''>('');
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

  const ALLERGEN_OPTIONS = ['dairy', 'nuts', 'peanuts', 'shellfish', 'soy', 'eggs', 'gluten', 'fish'];

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please fill in email and password');
      return;
    }

    if (password.length < 6) {
      Alert.alert(ErrorMessages.passwordTooShort.title, ErrorMessages.passwordTooShort.message);
      return;
    }

    if (!agreedToPrivacy) {
      Alert.alert('Privacy Policy Required', 'Please agree to the Privacy Policy to continue');
      return;
    }

    setLoading(true);
    console.log('[SIGNUP] Creating account for:', email);

    try {
      const response = await authAPI.register(email, password, fullName);

      if (!response.success) {
        console.error('[SIGNUP] Error:', response.error);
        const friendlyError = getUserFriendlyError(response);
        Alert.alert(friendlyError.title, friendlyError.message);
        setLoading(false);
        return;
      }

      console.log('[SIGNUP] Account created:', response.data?.user?.email);
      setUserId(response.data?.user?.id || '');
      setStep(2); // Move to onboarding
    } catch (error: any) {
      console.error('[SIGNUP] Exception:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setLoading(false);
    }
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
      console.error('[SIGNUP] Error validating goal date:', error);
    } finally {
      setIsValidatingDate(false);
    }
  };

  const handleOnboarding = async () => {
    if (!weight || !goal) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please fill in weight and goal');
      return;
    }

    // Require goal_weight for cut/bulk goals
    if ((goal === 'cut' || goal === 'bulk') && !goalWeight) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please enter your goal weight');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 50 || weightNum > 500) {
      Alert.alert(ErrorMessages.invalidWeight.title, ErrorMessages.invalidWeight.message);
      return;
    }

    // Validate goal weight if provided
    if (goalWeight) {
      const goalWeightNum = parseFloat(goalWeight);
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

    setLoading(true);
    console.log('[SIGNUP] Saving onboarding data');

    try {
      if (!userId) {
        Alert.alert(ErrorMessages.generic.title, 'User ID not found. Please try signing up again.');
        return;
      }

      // Convert feet/inches to cm: (feet * 12 + inches) * 2.54
      const totalInches = parseInt(heightFeet) * 12 + parseInt(heightInches);
      const heightCm = Math.round(totalInches * 2.54);

      const response = await authAPI.updateProfile({
        email: email,
        full_name: fullName || '',
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
        console.error('[SIGNUP] Profile update error:', response.error);
        const friendlyError = getUserFriendlyError(response.error);
        Alert.alert(friendlyError.title, friendlyError.message);
        return;
      }

      console.log('[SIGNUP] Onboarding complete, generating initial meal plan...');

      // Auto-generate initial meal plan
      try {
        const profile = response.data;
        await mealPlanAPI.generate({
          profile: {
            weight: profile.weight,
            bodyfat: profile.bodyfat,
            activity: profile.activity || 1.5,
            goal: profile.goal || 'recomp',
            mealsPerDay: profile.meals_per_day || 3,
            sex: profile.sex,
            age: profile.age,
            height_cm: profile.height_cm,
          },
          diet: {
            keto: profile.diet_type === 'keto',
            vegetarian: profile.diet_type === 'vegetarian',
            vegan: profile.diet_type === 'vegan',
            halal: profile.diet_type === 'halal',
            kosher: profile.diet_type === 'kosher',
            allergens: profile.allergens || [],
            mustInclude: profile.must_include || [],
            avoid: profile.dislikes || [],
          },
        });
        console.log('[SIGNUP] Initial meal plan generated');
      } catch (error) {
        console.error('[SIGNUP] Meal plan generation failed (non-critical):', error);
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[SIGNUP] Exception:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 of 2</Text>
        </View>

        <Text style={styles.title}>Let's Get to Know You! 💪</Text>
        <Text style={styles.subtitle}>I'll use this to create your personalized plan</Text>

        <View style={styles.form}>
          {/* Weight */}
          <Text style={styles.label}>Weight (lbs) *</Text>
          <TextInput
            style={styles.input}
            placeholder="150"
            placeholderTextColor={theme.colors.textMuted}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
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
            placeholder="30"
            placeholderTextColor={theme.colors.textMuted}
            value={age}
            onChangeText={setAge}
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
            placeholder="20"
            placeholderTextColor={theme.colors.textMuted}
            value={bodyfat}
            onChangeText={setBodyfat}
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
              <Text style={styles.label}>Goal Weight (lbs) {goal === 'cut' || goal === 'bulk' ? '*' : ''}</Text>
              <TextInput
                style={styles.input}
                placeholder={goal === 'cut' ? "140" : "180"}
                placeholderTextColor={theme.colors.textMuted}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="numeric"
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
            placeholder="e.g., chicken, rice, broccoli (comma separated)"
            placeholderTextColor={theme.colors.textMuted}
            value={mustIncludeFoods}
            onChangeText={setMustIncludeFoods}
          />

          {/* Dislikes/Avoid Foods */}
          <Text style={styles.label}>Foods to Avoid (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., beef, pork, mushrooms (comma separated)"
            placeholderTextColor={theme.colors.textMuted}
            value={dislikes}
            onChangeText={setDislikes}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleOnboarding}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? '💭 Creating your plan...' : "Let's Begin! 🚀"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.progressText}>Step 1 of 2</Text>
      </View>

      <Text style={styles.title}>Start Your Journey! 🌟</Text>
      <Text style={styles.subtitle}>Let's transform together</Text>

      {/* Social Proof */}
      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>
          🌟 Join 10,000+ users crushing their nutrition goals
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          placeholderTextColor={theme.colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Privacy Policy Agreement */}
        <TouchableOpacity
          style={styles.privacyCheckbox}
          onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
        >
          <View style={[styles.checkbox, agreedToPrivacy && styles.checkboxChecked]}>
            {agreedToPrivacy && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.privacyText}>
            I agree to the{' '}
            <Text
              style={styles.privacyLink}
              onPress={() => Linking.openURL('https://integrativeaisolutions.com/privacy-policy.html')}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '💭 Setting up...' : 'Next Step →'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.link}>Already started? Welcome back →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: 80,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxl,
  },
  form: {
    width: '100%',
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
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
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
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.neon,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  link: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
  socialProof: {
    backgroundColor: theme.colors.primary + '15',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  socialProofText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    fontWeight: theme.fontWeight.semibold,
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
  privacyCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  privacyText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  privacyLink: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
