// Weekly Summary Report screen
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { foodLogAPI } from '../src/services/api';
import { generateWeeklySummary, WeeklySummaryReport } from '../src/utils/weeklySummaryReport';

// Import SVG icons
import PredictionIcon from '../assets/icons/prediction-icon.svg';
import ProgressIcon from '../assets/icons/progress-icon.svg';
import StarIcon from '../assets/icons/star-icon.svg';
import LightBulbIcon from '../assets/icons/light-bulb-icon.svg';
import GoalsIcon from '../assets/icons/goals-milestones-icon.svg';
import CoachIcon from '../assets/icons/coach-icon.svg';

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummaryReport | null>(null);

  useEffect(() => {
    loadWeeklySummary();
  }, []);

  const loadWeeklySummary = async () => {
    try {
      const response = await foodLogAPI.getWeek();
      if (response.success && response.data) {
        const report = generateWeeklySummary(response.data);
        setSummary(report);
      }
    } catch (error) {
      console.error('[WEEKLY_SUMMARY] Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return theme.colors.encouragement;
      case 'B': return theme.colors.primary;
      case 'C': return theme.colors.warning;
      case 'D': return theme.colors.error;
      case 'F': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Weekly Summary', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>📊 Analyzing your week...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Weekly Summary', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Unable to load summary</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Weekly Summary', headerShown: true }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PredictionIcon width={28} height={28} fill={theme.colors.primary} />
          <Text style={styles.title}>Your Week in Review</Text>
        </View>
        <Text style={styles.subtitle}>{summary.weekRange}</Text>
      </View>

      {/* Overall Grade */}
      <View style={styles.gradeCard}>
        <Text style={styles.gradeLabel}>Overall Grade</Text>
        <Text style={[styles.gradeText, { color: getGradeColor(summary.overallGrade) }]}>
          {summary.overallGrade}
        </Text>
        <Text style={styles.adherenceText}>
          {summary.targetAdherence}% Target Adherence
        </Text>
      </View>

      {/* Motivational Message */}
      <View style={styles.messageCard}>
        <Text style={styles.messageText}>{summary.motivationalMessage}</Text>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ProgressIcon width={20} height={20} fill={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Weekly Stats</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.totalDaysLogged}/7</Text>
            <Text style={styles.statLabel}>Days Logged</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.averageCalories}</Text>
            <Text style={styles.statLabel}>Avg Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.protein }]}>
              {summary.averageProtein}g
            </Text>
            <Text style={styles.statLabel}>Avg Protein</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.carbs }]}>
              {summary.averageCarbs}g
            </Text>
            <Text style={styles.statLabel}>Avg Carbs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.fat }]}>
              {summary.averageFat}g
            </Text>
            <Text style={styles.statLabel}>Avg Fat</Text>
          </View>
        </View>
      </View>

      {/* Best Day */}
      {summary.bestDay && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <StarIcon width={24} height={24} fill={theme.colors.encouragement} style={{ marginTop: -17 }} />
            <Text style={styles.sectionTitle}>Best Day</Text>
          </View>
          <View style={styles.bestDayCard}>
            <Text style={styles.bestDayDate}>{summary.bestDay.date}</Text>
            <Text style={styles.bestDayReason}>{summary.bestDay.reason}</Text>
          </View>
        </View>
      )}

      {/* Achievements */}
      {summary.achievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Achievements</Text>
          {summary.achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementCard}>
              <Text style={styles.achievementText}>{achievement}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Insights */}
      {summary.insights.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <LightBulbIcon width={24} height={24} fill={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Insights</Text>
          </View>
          {summary.insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Areas to Improve */}
      {summary.areasToImprove.length > 0 && (
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <GoalsIcon width={24} height={24} fill={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Areas to Improve</Text>
          </View>
          {summary.areasToImprove.map((area, index) => (
            <View key={index} style={styles.improveCard}>
              <Text style={styles.improveText}>{area}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <CoachIcon width={20} height={20} fill={theme.colors.background} />
            <Text style={styles.ctaButtonText}>Talk to Your Coach</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  header: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  gradeCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  gradeLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  gradeText: {
    fontSize: 72,
    fontWeight: theme.fontWeight.extrabold,
    marginBottom: theme.spacing.sm,
  },
  adherenceText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  messageCard: {
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  messageText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: theme.fontWeight.semibold,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    width: '30%',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bestDayCard: {
    backgroundColor: theme.colors.encouragement + '15',
    borderWidth: 2,
    borderColor: theme.colors.encouragement,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  bestDayDate: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bestDayReason: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  achievementCard: {
    backgroundColor: theme.colors.encouragement + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.encouragement,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  achievementText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  insightCard: {
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  insightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  improveCard: {
    backgroundColor: theme.colors.warning + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  improveText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  ctaSection: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.neon,
  },
  ctaButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
});
