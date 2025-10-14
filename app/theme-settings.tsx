// Theme settings screen for dark mode toggle
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { useTheme } from '../src/contexts/ThemeContext';
import { haptic } from '../src/utils/haptics';

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();

  const modes = [
    { value: 'auto' as const, label: 'Auto (System)', icon: '🌓', description: 'Follows your device setting' },
    { value: 'light' as const, label: 'Light Mode', icon: '☀️', description: 'Always use light theme' },
    { value: 'dark' as const, label: 'Dark Mode', icon: '🌙', description: 'Always use dark theme' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Theme Settings 🎨</Text>
        <Text style={styles.subtitle}>Choose your preferred appearance</Text>
      </View>

      <View style={styles.optionsContainer}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.value}
            style={[
              styles.optionCard,
              themeMode === mode.value && styles.optionCardActive
            ]}
            onPress={() => {
              setThemeMode(mode.value);
              haptic.selection();
            }}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionIcon}>{mode.icon}</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionLabel,
                  themeMode === mode.value && styles.optionLabelActive
                ]}>
                  {mode.label}
                </Text>
                <Text style={styles.optionDescription}>{mode.description}</Text>
              </View>
            </View>
            {themeMode === mode.value && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 About Dark Mode</Text>
        <Text style={styles.infoText}>
          • Reduces eye strain in low light{'\n'}
          • Saves battery on OLED screens{'\n'}
          • Easier on the eyes at night{'\n'}
          • Auto mode switches based on your device's system settings
        </Text>
      </View>

      <View style={{ height: 40 }} />
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
  },
  header: {
    marginBottom: theme.spacing.xl,
    paddingTop: 40,
  },
  backButton: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  optionsContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  optionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  optionLabelActive: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  checkmark: {
    fontSize: 24,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  infoTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
});
