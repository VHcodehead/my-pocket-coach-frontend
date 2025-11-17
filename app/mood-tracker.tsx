// Emotional state tracking - Quick mood check-ins
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { haptic } from '../src/utils/haptics';
import { showToast } from '../src/utils/toast';

type MoodType = 'great' | 'good' | 'okay' | 'low' | 'stressed';

interface MoodEntry {
  mood: MoodType;
  note?: string;
  timestamp: string;
}

const MOODS = [
  { value: 'great' as MoodType, emoji: '😄', label: 'Great', color: '#10b981' },
  { value: 'good' as MoodType, emoji: '😊', label: 'Good', color: '#84cc16' },
  { value: 'okay' as MoodType, emoji: '😐', label: 'Okay', color: '#eab308' },
  { value: 'low' as MoodType, emoji: '😔', label: 'Low', color: '#f97316' },
  { value: 'stressed' as MoodType, emoji: '😰', label: 'Stressed', color: '#ef4444' },
];

export default function MoodTrackerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [todayEntries, setTodayEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayMoods();
  }, []);

  const loadTodayMoods = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `moods_${today}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setTodayEntries(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[MOOD] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMood = async () => {
    if (!selectedMood) return;

    try {
      const entry: MoodEntry = {
        mood: selectedMood,
        note: note.trim(),
        timestamp: new Date().toISOString(),
      };

      const today = new Date().toISOString().split('T')[0];
      const key = `moods_${today}`;
      const updatedEntries = [...todayEntries, entry];

      await AsyncStorage.setItem(key, JSON.stringify(updatedEntries));
      setTodayEntries(updatedEntries);

      haptic.success();
      showToast.success('Mood Logged! 💭', 'Thanks for checking in with yourself');

      // Reset form
      setSelectedMood(null);
      setNote('');
    } catch (error) {
      console.error('[MOOD] Error saving:', error);
      showToast.error('Oops!', 'Had trouble saving that mood check-in');
    }
  };

  const getMoodStats = () => {
    if (todayEntries.length === 0) return null;

    const moodCounts = todayEntries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<MoodType, number>);

    const dominantMood = Object.entries(moodCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0] as MoodType;

    return {
      total: todayEntries.length,
      dominantMood,
      moodCounts,
    };
  };

  const stats = getMoodStats();

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
        <Text style={styles.title}>Mood Tracker 💭</Text>
        <Text style={styles.subtitle}>How are you feeling right now?</Text>
      </View>

      {/* Mood Selection */}
      <View style={styles.moodGrid}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.value}
            style={[
              styles.moodButton,
              selectedMood === mood.value && {
                backgroundColor: mood.color + '20',
                borderColor: mood.color,
                borderWidth: 3,
              }
            ]}
            onPress={() => {
              setSelectedMood(mood.value);
              haptic.selection();
            }}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Optional Note */}
      {selectedMood && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Want to add a note? (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveMood}
          >
            <Text style={styles.saveButtonText}>Log Mood 💭</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Today's Check-ins */}
      {todayEntries.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Today's Check-ins ({todayEntries.length})</Text>

          {stats && (
            <View style={styles.statsCard}>
              <Text style={styles.statsText}>
                Your day has been mostly{' '}
                <Text style={styles.statsBold}>
                  {MOODS.find(m => m.value === stats.dominantMood)?.label.toLowerCase()}
                </Text>
                {' '}
                {MOODS.find(m => m.value === stats.dominantMood)?.emoji}
              </Text>
            </View>
          )}

          <View style={styles.entriesList}>
            {todayEntries.slice().reverse().map((entry, index) => {
              const moodData = MOODS.find(m => m.value === entry.mood)!;
              const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <View key={index} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={styles.entryMood}>
                      <Text style={styles.entryEmoji}>{moodData.emoji}</Text>
                      <Text style={[styles.entryLabel, { color: moodData.color }]}>
                        {moodData.label}
                      </Text>
                    </View>
                    <Text style={styles.entryTime}>{time}</Text>
                  </View>
                  {entry.note && (
                    <Text style={styles.entryNote}>{entry.note}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Why Track Mood?</Text>
        <Text style={styles.tip}>• Notice patterns between mood and eating</Text>
        <Text style={styles.tip}>• Build awareness of emotional triggers</Text>
        <Text style={styles.tip}>• Celebrate your good moments</Text>
        <Text style={styles.tip}>• Track progress in mental wellness</Text>
      </View>

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
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  moodButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  moodEmoji: {
    fontSize: 40,
    marginBottom: theme.spacing.xs,
  },
  moodLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  noteContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  noteLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  noteInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  saveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  historyContainer: {
    marginBottom: theme.spacing.xl,
  },
  historyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsCard: {
    backgroundColor: theme.colors.primary + '15',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  statsText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  statsBold: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  entriesList: {
    gap: theme.spacing.sm,
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  entryMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  entryEmoji: {
    fontSize: 24,
  },
  entryLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  entryTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  entryNote: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  tipsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
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
});
