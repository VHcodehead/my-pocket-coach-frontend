// Login screen
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
import { signInWithGoogle, signInWithApple } from '../../src/services/supabase';
import { ConsentFlow } from '../../src/components/ConsentFlow';
import { useTheme } from '../../src/contexts/ThemeContext';
import { ErrorMessages, getUserFriendlyError } from '../../src/utils/errorMessages';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConsentFlow, setShowConsentFlow] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(ErrorMessages.missingFields.title, 'Please fill in email and password');
      return;
    }

    setLoading(true);
    console.log('[LOGIN] Attempting login for:', email);

    try {
      const response = await authAPI.login(email, password);

      if (!response.success) {
        console.error('[LOGIN] Error:', response.error);
        Alert.alert(ErrorMessages.invalidCredentials.title, ErrorMessages.invalidCredentials.message);
        return;
      }

      console.log('[LOGIN] Success:', response.data?.user?.email);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[LOGIN] Exception:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setLoading(false);
    }
  };

  const checkConsentAndNavigate = async () => {
    try {
      // Check if user needs to accept Terms/Privacy
      const consentStatus = await authAPI.checkConsentStatus();

      if (consentStatus.success && consentStatus.data?.needsConsent) {
        console.log('[LOGIN] User needs consent, showing consent flow');
        setShowConsentFlow(true);
      } else {
        console.log('[LOGIN] User has consented, navigating to app');
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('[LOGIN] Failed to check consent status:', error);
      // If check fails, navigate anyway (don't block user)
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    console.log('[LOGIN] Attempting Google OAuth');

    try {
      const result = await signInWithGoogle();

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Could not sign in with Google');
        return;
      }

      console.log('[LOGIN] Google OAuth success, needsConsent:', result.data?.needsConsent);

      // Check consent status from OAuth response (no separate API call needed)
      if (result.data?.needsConsent) {
        setShowConsentFlow(true);
      } else {
        await checkOnboardingAndNavigate();
      }
    } catch (error: any) {
      console.error('[LOGIN] Google OAuth exception:', error);
      Alert.alert('Error', 'An error occurred during Google sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    console.log('[LOGIN] Attempting Apple OAuth');

    try {
      const result = await signInWithApple();

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Could not sign in with Apple');
        return;
      }

      console.log('[LOGIN] Apple OAuth success, needsConsent:', result.data?.needsConsent);

      // Check consent status from OAuth response (no separate API call needed)
      if (result.data?.needsConsent) {
        setShowConsentFlow(true);
      } else {
        await checkOnboardingAndNavigate();
      }
    } catch (error: any) {
      console.error('[LOGIN] Apple OAuth exception:', error);
      Alert.alert('Error', 'An error occurred during Apple sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentComplete = async () => {
    console.log('[LOGIN] Consent flow completed, checking onboarding status');
    setShowConsentFlow(false);
    await checkOnboardingAndNavigate();
  };

  const checkOnboardingAndNavigate = async () => {
    try {
      console.log('[LOGIN] Checking if user has completed onboarding');

      // Check if user has a training plan (indicates onboarding complete)
      const trainingResponse = await authAPI.getProfile();

      if (!trainingResponse.success) {
        console.error('[LOGIN] Failed to fetch profile:', trainingResponse.error);
        router.replace('/settings');
        return;
      }

      // Check multiple indicators of completed onboarding
      const profile = trainingResponse.data;
      const hasGoalWeight = profile?.goal_weight != null;
      const hasTargetMacros = profile?.target_protein != null;

      // Also check for training plan
      const trainingAPI = require('../../src/services/api').trainingAPI;
      const planResponse = await trainingAPI.getCurrentPlan();
      const hasTrainingPlan = planResponse.success && planResponse.data?.plan != null;

      console.log('[LOGIN] Onboarding status:', { hasGoalWeight, hasTargetMacros, hasTrainingPlan });

      if (hasGoalWeight && hasTargetMacros && hasTrainingPlan) {
        console.log('[LOGIN] Onboarding complete, navigating to app');
        router.replace('/(tabs)');
      } else {
        console.log('[LOGIN] Onboarding incomplete, navigating to settings');
        router.replace('/settings');
      }
    } catch (error) {
      console.error('[LOGIN] Error checking onboarding:', error);
      // Default to settings if check fails
      router.replace('/settings');
    }
  };

  const handleConsentCancel = async () => {
    console.log('[LOGIN] User declined consent, logging out');
    setShowConsentFlow(false);
    await authAPI.logout();
    Alert.alert(
      'Account Removed',
      'You must accept the Terms of Service and Privacy Policy to use Pocket Coach. Your account has been logged out.'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome Back! 👋</Text>
      <Text style={styles.subtitle}>Let's continue your transformation journey</Text>

      {/* Social Proof */}
      <View style={styles.socialProof}>
        <Text style={styles.socialProofText}>
          🌟 Join 10,000+ users crushing their nutrition goals
        </Text>
      </View>

      {/* Social Login Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton, loading && styles.buttonDisabled]}
          onPress={handleAppleLogin}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>

      {/* Terms & Privacy for OAuth */}
      <Text style={styles.oauthTermsText}>
        By continuing, you agree to our{' '}
        <Text
          style={styles.oauthTermsLink}
          onPress={() => Linking.openURL('https://www.integrativeaisolutions.com/terms-of-service.html')}
        >
          Terms of Service
        </Text>
        {' '}and{' '}
        <Text
          style={styles.oauthTermsLink}
          onPress={() => Linking.openURL('https://www.integrativeaisolutions.com/privacy-policy.html')}
        >
          Privacy Policy
        </Text>
      </Text>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? '💭 Signing you in...' : "Let's Go! 🚀"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.link}>New here? Start Your Journey →</Text>
        </TouchableOpacity>
      </View>

      {/* Consent Flow for OAuth users */}
      <ConsentFlow
        visible={showConsentFlow}
        onComplete={handleConsentComplete}
        onCancel={handleConsentCancel}
      />
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: 80,
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
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.lg,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
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
  socialButtons: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  socialButton: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginHorizontal: theme.spacing.md,
    fontWeight: theme.fontWeight.semibold,
  },
  oauthTermsText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  oauthTermsLink: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
    textDecorationLine: 'underline',
  },
});
