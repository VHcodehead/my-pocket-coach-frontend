// Water intake tracker - Quick tap hydration logging
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { supabase } from '../src/services/supabase';
import { haptic } from '../src/utils/haptics';
import { showToast } from '../src/utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import SVG icons
import WaterDropletIcon from '../assets/icons/water-droplet-icon.svg';

const WATER_GOAL = 8; // 8 glasses per day (64 oz)
const GLASS_SIZE = 8; // 8 oz per glass

export default function WaterTrackerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [glasses, setGlasses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayWater();
  }, []);

  const loadTodayWater = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `water_${today}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setGlasses(parseInt(stored));
      }
    } catch (error) {
      console.error('[WATER] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTodayWater = async (count: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `water_${today}`;
      await AsyncStorage.setItem(key, count.toString());
    } catch (error) {
      console.error('[WATER] Error saving:', error);
    }
  };

  const addGlass = () => {
    const newCount = glasses + 1;
    setGlasses(newCount);
    saveTodayWater(newCount);
    haptic.light();

    if (newCount === WATER_GOAL) {
      haptic.success();
      showToast.success('Goal Reached! 💧', 'Great hydration today!');
    }
  };

  const removeGlass = () => {
    if (glasses > 0) {
      const newCount = glasses - 1;
      setGlasses(newCount);
      saveTodayWater(newCount);
      haptic.light();
    }
  };

  const resetDay = () => {
    Alert.alert(
      'Reset Water Intake?',
      'This will reset today\'s water count to 0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setGlasses(0);
            saveTodayWater(0);
            haptic.medium();
          },
        },
      ]
    );
  };

  const percentage = Math.min((glasses / WATER_GOAL) * 100, 100);
  const ounces = glasses * GLASS_SIZE;

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>💭 Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.title}>Water Intake</Text>
          <WaterDropletIcon width={28} height={28} fill={theme.colors.primary} />
        </View>
        <Text style={styles.subtitle}>Stay hydrated, stay healthy!</Text>
      </View>

      {/* Water Visual */}
      <View style={styles.visualContainer}>
        <View style={styles.glassContainer}>
          <View style={styles.glass}>
            <View style={[styles.waterFill, { height: `${percentage}%` }]} />
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.glassCount}>{glasses}</Text>
          <Text style={styles.glassLabel}>of {WATER_GOAL} glasses</Text>
          <Text style={styles.ouncesText}>{ounces} oz / {WATER_GOAL * GLASS_SIZE} oz</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(percentage)}% of daily goal</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={removeGlass}
          disabled={glasses === 0}
        >
          <Text style={[styles.actionButtonText, glasses === 0 && styles.actionButtonTextDisabled]}>
            − 1 Glass
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, glasses >= WATER_GOAL && styles.addButtonComplete]}
          onPress={addGlass}
        >
          <Text style={styles.addButtonText}>
            {glasses >= WATER_GOAL ? '💪 Add More' : '+ 1 Glass'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Hydration Tips</Text>
        <Text style={styles.tip}>• Drink a glass when you wake up</Text>
        <Text style={styles.tip}>• Have water with every meal</Text>
        <Text style={styles.tip}>• Keep a bottle at your desk</Text>
        <Text style={styles.tip}>• Set hourly reminders</Text>
      </View>

      {/* Reset Button */}
      {glasses > 0 && (
        <TouchableOpacity style={styles.resetButton} onPress={resetDay}>
          <Text style={styles.resetButtonText}>Reset Today</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
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
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
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
  visualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
  },
  glassContainer: {
    marginRight: theme.spacing.xxl,
  },
  glass: {
    width: 100,
    height: 200,
    borderWidth: 4,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.surface,
  },
  waterFill: {
    backgroundColor: theme.colors.primary + '40',
    width: '100%',
  },
  statsContainer: {
    alignItems: 'center',
  },
  glassCount: {
    fontSize: 64,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
  },
  glassLabel: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  ouncesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  progressContainer: {
    marginBottom: theme.spacing.xl,
  },
  progressBar: {
    height: 12,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  actionButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
  addButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  addButtonComplete: {
    backgroundColor: theme.colors.encouragement,
  },
  addButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  tipsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  tip: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 22,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
  },
});
