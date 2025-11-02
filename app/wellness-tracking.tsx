import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { supabase } from '../src/services/supabase';

interface WellnessEntry {
  id: string;
  date: string;
  mood: number; // 1-5
  energy: number; // 1-5
  stress: number; // 1-5
  sleep_quality: number; // 1-5
  notes?: string;
}

export default function WellnessTrackingScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [todayEntry, setTodayEntry] = useState<WellnessEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Load last 7 days
      const { data, error } = await supabase
        .from('wellness_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      const today_entry = data?.find(e => e.date.startsWith(today));
      setTodayEntry(today_entry || null);
    } catch (error) {
      console.error('Failed to load wellness entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const logWellness = async (metric: 'mood' | 'energy' | 'stress' | 'sleep_quality', value: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      if (todayEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('wellness_entries')
          .update({ [metric]: value })
          .eq('id', todayEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('wellness_entries')
          .insert({
            user_id: user.id,
            date: today,
            [metric]: value,
          })
          .select()
          .single();

        if (error) throw error;
        setTodayEntry(data);
      }

      await loadEntries();
      Alert.alert('Logged!', `${metric.replace('_', ' ')} logged successfully`);
    } catch (error) {
      console.error('Failed to log wellness:', error);
      Alert.alert('Error', 'Failed to log wellness metric. Please check your connection.');
    }
  };

  const getAverages = () => {
    if (entries.length === 0) return { mood: 0, energy: 0, stress: 0, sleep: 0 };

    const sum = entries.reduce((acc, entry) => ({
      mood: acc.mood + (entry.mood || 0),
      energy: acc.energy + (entry.energy || 0),
      stress: acc.stress + (entry.stress || 0),
      sleep: acc.sleep + (entry.sleep_quality || 0),
    }), { mood: 0, energy: 0, stress: 0, sleep: 0 });

    const count = entries.length;
    return {
      mood: (sum.mood / count).toFixed(1),
      energy: (sum.energy / count).toFixed(1),
      stress: (sum.stress / count).toFixed(1),
      sleep: (sum.sleep / count).toFixed(1),
    };
  };

  const renderRatingButtons = (
    label: string,
    metric: 'mood' | 'energy' | 'stress' | 'sleep_quality',
    currentValue: number | undefined
  ) => (
    <View style={styles.metricSection}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map(value => (
          <TouchableOpacity
            key={value}
            style={[
              styles.ratingButton,
              currentValue === value && styles.ratingButtonActive
            ]}
            onPress={() => logWellness(metric, value)}
          >
            <Text style={[
              styles.ratingText,
              currentValue === value && styles.ratingTextActive
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.primary,
            headerTitle: 'Wellness Tracking',
            headerTitleStyle: {
              fontWeight: theme.fontWeight.bold,
              fontSize: theme.fontSize.xl,
              color: theme.colors.text,
            },
            headerShadowVisible: false,
          }}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const averages = getAverages();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitle: 'Wellness Tracking',
          headerTitleStyle: {
            fontWeight: theme.fontWeight.bold,
            fontSize: theme.fontSize.xl,
            color: theme.colors.text,
          },
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.container}>
        {/* Today's Logging */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How are you feeling today?</Text>
          <Text style={styles.sectionSubtitle}>Rate each area from 1 (low) to 5 (high)</Text>

          {renderRatingButtons('😊 Mood', 'mood', todayEntry?.mood)}
          {renderRatingButtons('⚡ Energy', 'energy', todayEntry?.energy)}
          {renderRatingButtons('😰 Stress', 'stress', todayEntry?.stress)}
          {renderRatingButtons('😴 Sleep Quality', 'sleep_quality', todayEntry?.sleep_quality)}
        </View>

        {/* 7-Day Averages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-Day Averages</Text>
          <View style={styles.averagesGrid}>
            <View style={styles.averageCard}>
              <Text style={styles.averageEmoji}>😊</Text>
              <Text style={styles.averageValue}>{averages.mood}</Text>
              <Text style={styles.averageLabel}>Mood</Text>
            </View>
            <View style={styles.averageCard}>
              <Text style={styles.averageEmoji}>⚡</Text>
              <Text style={styles.averageValue}>{averages.energy}</Text>
              <Text style={styles.averageLabel}>Energy</Text>
            </View>
            <View style={styles.averageCard}>
              <Text style={styles.averageEmoji}>😰</Text>
              <Text style={styles.averageValue}>{averages.stress}</Text>
              <Text style={styles.averageLabel}>Stress</Text>
            </View>
            <View style={styles.averageCard}>
              <Text style={styles.averageEmoji}>😴</Text>
              <Text style={styles.averageValue}>{averages.sleep}</Text>
              <Text style={styles.averageLabel}>Sleep</Text>
            </View>
          </View>
        </View>

        {/* Recent Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No entries yet. Start tracking above!</Text>
          ) : (
            entries.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <Text style={styles.entryDate}>
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                <View style={styles.entryMetrics}>
                  {entry.mood && <Text style={styles.entryMetric}>😊 {entry.mood}</Text>}
                  {entry.energy && <Text style={styles.entryMetric}>⚡ {entry.energy}</Text>}
                  {entry.stress && <Text style={styles.entryMetric}>😰 {entry.stress}</Text>}
                  {entry.sleep_quality && <Text style={styles.entryMetric}>😴 {entry.sleep_quality}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
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
  section: {
    padding: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  metricSection: {
    marginBottom: theme.spacing.xl,
  },
  metricLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.xs,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  ratingButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
  },
  ratingText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.bold,
  },
  ratingTextActive: {
    color: theme.colors.primary,
  },
  averagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  averageCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  averageEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  averageValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  averageLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  entryDate: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  entryMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  entryMetric: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
