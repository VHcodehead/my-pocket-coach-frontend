// Welcome/Landing screen
import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../src/services/supabase';
import { theme } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[WELCOME] Session check:', session ? 'Logged in' : 'Not logged in');

      if (session) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('[WELCOME] Error checking auth:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>My Pocket Coach</Text>
        <Text style={styles.subtitle}>Your AI-Powered Nutrition & Fitness Companion</Text>

        <View style={styles.features}>
          <Text style={styles.feature}>• Personalized meal plans tailored to your goals</Text>
          <Text style={styles.feature}>• Track macros with smart food logging</Text>
          <Text style={styles.feature}>• AI coach available 24/7 for guidance</Text>
          <Text style={styles.feature}>• Weekly check-ins with automatic adjustments</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xxl,
    textAlign: 'center',
  },
  features: {
    marginBottom: theme.spacing.xxl,
    width: '100%',
  },
  feature: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    marginBottom: theme.spacing.md,
    ...theme.shadows.neon,
  },
  primaryButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  },
});
