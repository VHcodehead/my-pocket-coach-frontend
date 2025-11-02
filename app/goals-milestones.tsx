import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { theme } from '../src/theme';
import { authAPI, checkinAPI } from '../src/services/api';
import { UserProfile } from '../src/types';

export default function GoalsMilestonesScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [startingWeight, setStartingWeight] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load profile
      const profileResponse = await authAPI.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setProfile(profileResponse.data);
      }

      // Load ALL check-ins (not just ones with photos) to get accurate starting weight
      const checkinResponse = await checkinAPI.getHistory();
      if (checkinResponse.success && checkinResponse.data?.checkins && checkinResponse.data.checkins.length > 0) {
        // Filter check-ins with weight
        const checkinsWithWeight = checkinResponse.data.checkins
          .filter((c: any) => c.weight && c.weight > 0)
          .sort((a: any, b: any) => {
            // Sort by date ascending (oldest first)
            const dateA = new Date(a.checked_at || a.created_at).getTime();
            const dateB = new Date(b.checked_at || b.created_at).getTime();
            return dateA - dateB;
          });

        if (checkinsWithWeight.length > 0) {
          // First check-in = starting weight
          setStartingWeight(checkinsWithWeight[0].weight);
          // Last check-in = current weight
          setCurrentWeight(checkinsWithWeight[checkinsWithWeight.length - 1].weight);

          console.log('[GOALS] Starting weight:', checkinsWithWeight[0].weight, 'from', checkinsWithWeight[0].checked_at);
          console.log('[GOALS] Current weight:', checkinsWithWeight[checkinsWithWeight.length - 1].weight, 'from', checkinsWithWeight[checkinsWithWeight.length - 1].checked_at);
          console.log('[GOALS] Total check-ins with weight:', checkinsWithWeight.length);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!profile?.goal_weight) return 0;

    // Use check-in weights if available, otherwise fall back to profile weight
    const start = startingWeight || profile.weight || 0;
    const target = profile.goal_weight;
    const current = currentWeight || startingWeight || profile.weight || 0;

    // If we don't have actual data yet, return 0
    if (!start || !target) return 0;

    if (profile.goal === 'cut') {
      const totalLoss = start - target;
      const currentLoss = start - current;
      return Math.min(Math.max((currentLoss / totalLoss) * 100, 0), 100);
    } else if (profile.goal === 'bulk') {
      const totalGain = target - start;
      const currentGain = current - start;
      return Math.min(Math.max((currentGain / totalGain) * 100, 0), 100);
    }
    return 0;
  };

  const milestones = [
    { percent: 25, label: 'Quarter Way There', achieved: calculateProgress() >= 25, emoji: '🎯' },
    { percent: 50, label: 'Halfway Point', achieved: calculateProgress() >= 50, emoji: '💪' },
    { percent: 75, label: 'Almost There', achieved: calculateProgress() >= 75, emoji: '🔥' },
    { percent: 100, label: 'Goal Achieved!', achieved: calculateProgress() >= 100, emoji: '🏆' },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.primary,
            headerTitle: 'Goals & Milestones',
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

  const progress = calculateProgress();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitle: 'Goals & Milestones',
          headerTitleStyle: {
            fontWeight: theme.fontWeight.bold,
            fontSize: theme.fontSize.xl,
            color: theme.colors.text,
          },
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.container}>
        {/* Current Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Goal</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Goal Type:</Text>
              <Text style={styles.goalValue}>{profile?.goal?.toUpperCase() || 'RECOMP'}</Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Starting Weight:</Text>
              <Text style={styles.goalValue}>
                {startingWeight || profile?.weight || 0} lbs
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Current Weight:</Text>
              <Text style={[styles.goalValue, styles.currentWeight]}>
                {currentWeight || startingWeight || profile?.weight || 0} lbs
              </Text>
            </View>
            {profile?.goal_weight && (
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Target Weight:</Text>
                <Text style={styles.goalValue}>{profile.goal_weight} lbs</Text>
              </View>
            )}
            {profile?.goal_date && (
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Target Date:</Text>
                <Text style={styles.goalValue}>
                  {new Date(profile.goal_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {profile?.goal_weight && (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(Math.max(progress, 0), 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.toFixed(1)}% Complete
              </Text>
            </View>
          )}
        </View>

        {/* Milestones */}
        {profile?.goal_weight && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {milestones.map((milestone, index) => (
              <View
                key={index}
                style={[
                  styles.milestoneCard,
                  milestone.achieved && styles.milestoneAchieved
                ]}
              >
                <Text style={styles.milestoneIcon}>
                  {milestone.achieved ? '✓' : milestone.emoji}
                </Text>
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneLabel}>{milestone.label}</Text>
                  <Text style={styles.milestonePercent}>{milestone.percent}%</Text>
                </View>
                {milestone.achieved && (
                  <Text style={styles.achievedBadge}>🏆</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Edit Goal Button */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.editButtonText}>Edit Goal</Text>
        </TouchableOpacity>

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
    marginBottom: theme.spacing.lg,
  },
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  goalLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  goalValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  currentWeight: {
    color: theme.colors.primary,
  },
  progressSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  progressLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 20,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  milestoneAchieved: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  milestoneIcon: {
    fontSize: 32,
    marginRight: theme.spacing.md,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  milestonePercent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  achievedBadge: {
    fontSize: 24,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  editButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
