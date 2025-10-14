// Login screen
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '../../src/services/api';
import { signInWithGoogle, signInWithApple } from '../../src/services/supabase';
import { theme } from '../../src/theme';
import { ErrorMessages, getUserFriendlyError } from '../../src/utils/errorMessages';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    console.log('[LOGIN] Attempting Google OAuth');

    try {
      const result = await signInWithGoogle();

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Could not sign in with Google');
        return;
      }

      console.log('[LOGIN] Google OAuth success');
      router.replace('/(tabs)');
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

      console.log('[LOGIN] Apple OAuth success');
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[LOGIN] Apple OAuth exception:', error);
      Alert.alert('Error', 'An error occurred during Apple sign in');
    } finally {
      setLoading(false);
    }
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
});
