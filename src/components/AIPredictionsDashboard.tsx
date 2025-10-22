// AI Predictions Dashboard - Replaces broken ML Dashboard
// Shows GPT-4o-mini powered predictions with auto-adjustments
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { predictionsAPI, checkinAPI } from '../services/api';
import { theme } from '../theme';
import { useUser } from '../contexts/UserContext';

// Import SVG icons
import ProgressIcon from '../../assets/icons/progress-icon.svg';
import SleepIcon from '../../assets/icons/sleep-icon.svg';
import GoalsIcon from '../../assets/icons/goals-milestones-icon.svg';
import LightBulbIcon from '../../assets/icons/light-bulb-icon.svg';

const PREDICTIONS_CACHE_KEY = '@predictions_cache';
const CACHE_TIMESTAMP_KEY = '@predictions_cache_timestamp';
const PROFILE_SNAPSHOT_KEY = '@predictions_profile_snapshot';

interface WeightPrediction {
  predictedChange: number;
  confidence: number;
  reasoning: string;
  contributingFactors: {
    trendStrength: number;
    adherence: number;
    volatility: number;
    dataQuality: number;
  };
  autoAdjustment?: {
    shouldAdjust: boolean;
    calorieChange: number;
    reason: string;
  };
}

interface DeloadPrediction {
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  reasoning: string;
  fatigueFactors: {
    rpeScore: number;
    volumeTrend: number;
    completionRate: number;
    recoveryIndicators: number;
  };
  autoAdjustment?: {
    shouldDeload: boolean;
    volumeReduction: number;
    durationWeeks: number;
    reason: string;
  };
}

interface GoalPrediction {
  weeksToGoal: number;
  confidenceInterval: [number, number];
  trajectory: 'on_track' | 'ahead' | 'behind';
  confidence: 'high' | 'medium' | 'low';
  weeklyRateActual: number;
  weeklyRateTarget: number;
  recommendation: string;
}

export function AIPredictionsDashboard() {
  const { profile } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weightPred, setWeightPred] = useState<WeightPrediction | null>(null);
  const [deloadPred, setDeloadPred] = useState<DeloadPrediction | null>(null);
  const [goalPred, setGoalPred] = useState<GoalPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckinDate, setLastCheckinDate] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    loadPredictionsWithCache();
  }, []);

  // Check for profile changes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkProfileChanges();
    }, [profile])
  );

  const checkProfileChanges = async () => {
    if (!profile) return;

    try {
      // Create snapshot of relevant profile fields
      const currentSnapshot = {
        goalWeight: profile.goal_weight,
        goalDate: profile.goal_date,
        currentWeight: profile.weight,
      };

      // Get cached snapshot
      const cachedSnapshotStr = await AsyncStorage.getItem(PROFILE_SNAPSHOT_KEY);

      if (cachedSnapshotStr) {
        const cachedSnapshot = JSON.parse(cachedSnapshotStr);

        // Check if any relevant field changed
        const profileChanged =
          cachedSnapshot.goalWeight !== currentSnapshot.goalWeight ||
          cachedSnapshot.goalDate !== currentSnapshot.goalDate ||
          cachedSnapshot.currentWeight !== currentSnapshot.currentWeight;

        if (profileChanged) {
          console.log('[PREDICTIONS] Profile changed, invalidating cache and refreshing...');
          // Clear cache and refresh
          await AsyncStorage.removeItem(PREDICTIONS_CACHE_KEY);
          await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
          await AsyncStorage.setItem(PROFILE_SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
          loadPredictionsWithCache(true);
          return;
        }
      } else {
        // No cached snapshot, save current one
        await AsyncStorage.setItem(PROFILE_SNAPSHOT_KEY, JSON.stringify(currentSnapshot));
      }
    } catch (error) {
      console.error('[PREDICTIONS] Error checking profile changes:', error);
    }
  };

  const loadPredictionsWithCache = async (forceRefresh: boolean = false) => {
    try {
      setError(null);

      // Get last check-in date to determine if we need new predictions
      const checkinsResponse = await checkinAPI.getHistory();
      const latestCheckin = checkinsResponse.data?.checkins?.[0];
      const latestCheckinDate = latestCheckin?.checked_at;

      if (!latestCheckinDate) {
        setError('No check-ins found. Complete your first weekly check-in to get predictions.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check cache timestamp
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cacheIsValid = cachedTimestamp === latestCheckinDate && !forceRefresh;

      if (cacheIsValid) {
        // Load from cache
        console.log('[PREDICTIONS] Using cached predictions (no new check-ins)');
        const cachedData = await AsyncStorage.getItem(PREDICTIONS_CACHE_KEY);

        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setWeightPred(parsed.weightPrediction || null);
          setDeloadPred(parsed.deloadPrediction || null);
          setGoalPred(parsed.goalPrediction || null);
          setLastCheckinDate(latestCheckinDate);
          setUsingCache(true);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Fetch fresh predictions (new check-in detected or forced refresh)
      console.log('[PREDICTIONS] Fetching fresh predictions (new data available)');
      setUsingCache(false);
      const response = await predictionsAPI.getAllPredictions();

      if (response.success && response.data) {
        const predictionData = {
          weightPrediction: response.data.weightPrediction || null,
          deloadPrediction: response.data.deloadPrediction || null,
          goalPrediction: response.data.goalPrediction || null,
        };

        setWeightPred(predictionData.weightPrediction);
        setDeloadPred(predictionData.deloadPrediction);
        setGoalPred(predictionData.goalPrediction);
        setLastCheckinDate(latestCheckinDate);

        // Cache the results
        await AsyncStorage.setItem(PREDICTIONS_CACHE_KEY, JSON.stringify(predictionData));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, latestCheckinDate);
      } else {
        setError('Failed to load predictions');
      }
    } catch (err: any) {
      console.error('[PREDICTIONS] Error loading:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPredictionsWithCache(true); // Force refresh
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading AI predictions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Load Predictions</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadPredictionsWithCache(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      default: return theme.colors.textMuted;
    }
  };

  const getTrajectoryColor = (trajectory: string) => {
    switch (trajectory) {
      case 'on_track': return '#10b981';
      case 'ahead': return '#3b82f6';
      case 'behind': return '#f59e0b';
      default: return theme.colors.textMuted;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 AI Predictions</Text>
        <Text style={styles.headerSubtitle}>
          GPT-4 powered insights with auto-adjustments
          {usingCache && ' • Cached results'}
        </Text>
        {lastCheckinDate && (
          <Text style={styles.headerDate}>
            Last updated: {new Date(lastCheckinDate).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Weight Prediction Card */}
      {weightPred && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ProgressIcon width={20} height={20} fill={theme.colors.primary} />
              <Text style={styles.cardTitle}>Weight Prediction</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{Math.round(weightPred.confidence * 100)}% confident</Text>
            </View>
          </View>

          <View style={styles.predictionValue}>
            <Text style={styles.predictionLabel}>Next Week:</Text>
            <Text style={[styles.predictionNumber, { color: weightPred.predictedChange < 0 ? '#10b981' : '#ef4444' }]}>
              {weightPred.predictedChange > 0 ? '+' : ''}{weightPred.predictedChange.toFixed(2)} lbs
            </Text>
          </View>

          <Text style={styles.reasoning}>{weightPred.reasoning}</Text>

          {/* Contributing Factors */}
          <View style={styles.factorsGrid}>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Trend</Text>
              <Text style={styles.factorValue}>{weightPred.contributingFactors.trendStrength}%</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Adherence</Text>
              <Text style={styles.factorValue}>{weightPred.contributingFactors.adherence || 'N/A'}</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Data Quality</Text>
              <Text style={styles.factorValue}>{weightPred.contributingFactors.dataQuality}%</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Volatility</Text>
              <Text style={styles.factorValue}>{weightPred.contributingFactors.volatility}/100</Text>
            </View>
          </View>

          {/* Auto-Adjustment */}
          {weightPred.autoAdjustment && (
            <View style={styles.autoAdjustment}>
              <Text style={styles.autoAdjustmentTitle}>🔧 Auto-Adjustment Applied</Text>
              <Text style={styles.autoAdjustmentCalories}>
                {weightPred.autoAdjustment.calorieChange > 0 ? '+' : ''}{weightPred.autoAdjustment.calorieChange} cal/day
              </Text>
              <Text style={styles.autoAdjustmentReason}>{weightPred.autoAdjustment.reason}</Text>
            </View>
          )}
        </View>
      )}

      {/* Deload Prediction Card */}
      {deloadPred && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SleepIcon width={20} height={20} fill={theme.colors.primary} />
              <Text style={styles.cardTitle}>Fatigue Analysis</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(deloadPred.riskLevel) }]}>
              <Text style={styles.riskBadgeText}>{deloadPred.riskLevel} RISK</Text>
            </View>
          </View>

          <View style={styles.predictionValue}>
            <Text style={styles.predictionLabel}>Deload Probability:</Text>
            <Text style={[styles.predictionNumber, { color: getRiskColor(deloadPred.riskLevel) }]}>
              {Math.round(deloadPred.probability * 100)}%
            </Text>
          </View>

          <Text style={styles.reasoning}>{deloadPred.reasoning}</Text>

          {/* Fatigue Factors */}
          <View style={styles.factorsGrid}>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>RPE</Text>
              <Text style={styles.factorValue}>{deloadPred.fatigueFactors.rpeScore}/100</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Volume</Text>
              <Text style={styles.factorValue}>{deloadPred.fatigueFactors.volumeTrend > 0 ? '+' : ''}{deloadPred.fatigueFactors.volumeTrend}%</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Completion</Text>
              <Text style={styles.factorValue}>{deloadPred.fatigueFactors.completionRate}%</Text>
            </View>
            <View style={styles.factorItem}>
              <Text style={styles.factorLabel}>Recovery</Text>
              <Text style={styles.factorValue}>{deloadPred.fatigueFactors.recoveryIndicators}/100</Text>
            </View>
          </View>

          {/* Auto-Adjustment */}
          {deloadPred.autoAdjustment && (
            <View style={styles.autoAdjustment}>
              <Text style={styles.autoAdjustmentTitle}>🔧 Auto-Adjustment Applied</Text>
              <Text style={styles.autoAdjustmentCalories}>
                -{deloadPred.autoAdjustment.volumeReduction}% volume for {deloadPred.autoAdjustment.durationWeeks} week(s)
              </Text>
              <Text style={styles.autoAdjustmentReason}>{deloadPred.autoAdjustment.reason}</Text>
            </View>
          )}
        </View>
      )}

      {/* Goal Timeline Card */}
      {goalPred && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <GoalsIcon width={20} height={20} fill={theme.colors.primary} />
              <Text style={styles.cardTitle}>Goal Timeline</Text>
            </View>
            <View style={[styles.trajectoryBadge, { backgroundColor: getTrajectoryColor(goalPred.trajectory) }]}>
              <Text style={styles.trajectoryBadgeText}>{goalPred.trajectory.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.predictionValue}>
            <Text style={styles.predictionLabel}>12-Week Projection:</Text>
            <Text style={styles.predictionNumber}>
              {goalPred.weeksToGoal} weeks
            </Text>
          </View>

          <Text style={styles.confidenceInterval}>
            95% Confidence: {goalPred.confidenceInterval[0]}-{goalPred.confidenceInterval[1]} weeks
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
            <LightBulbIcon width={14} height={14} fill={theme.colors.textMuted} style={{ marginTop: 2 }} />
            <Text style={styles.goalNote}>
              Set a goal weight in your profile for personalized timeline predictions
            </Text>
          </View>

          <View style={styles.rateComparison}>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Actual Rate</Text>
              <Text style={styles.rateValue}>{goalPred.weeklyRateActual.toFixed(2)} lbs/week</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Target Rate</Text>
              <Text style={styles.rateValue}>{goalPred.weeklyRateTarget.toFixed(2)} lbs/week</Text>
            </View>
          </View>

          <Text style={styles.reasoning}>{goalPred.recommendation}</Text>
        </View>
      )}

      {/* Empty State */}
      {!weightPred && !deloadPred && !goalPred && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No Predictions Available</Text>
          <Text style={styles.emptyText}>
            Complete at least 3 weekly check-ins and log some workouts to get AI-powered predictions.
          </Text>
        </View>
      )}

      {/* Footer Note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🤖 Powered by GPT-4 • Predictions update with each weekly check-in
        </Text>
      </View>
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
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  headerDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confidenceBadge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  trajectoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trajectoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  predictionValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  predictionLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginRight: 8,
  },
  predictionNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  reasoning: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  factorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  factorItem: {
    width: '50%',
    marginBottom: 12,
  },
  factorLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  factorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  autoAdjustment: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  autoAdjustmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  autoAdjustmentCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  autoAdjustmentReason: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  confidenceInterval: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 12,
  },
  rateComparison: {
    flexDirection: 'row',
    marginVertical: 12,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
  },
  rateDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  rateLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  goalNote: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
