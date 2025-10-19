// ML Predictions Dashboard - Proprietary Machine Learning Insights
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LineChart, ProgressChart } from 'react-native-chart-kit';
import { theme } from '../theme';
import { mlPredictionsAPI } from '../services/api';

const screenWidth = Dimensions.get('window').width;

interface MLPrediction {
  date: string;
  predictedWeight: number;
  actualWeight?: number;
  deloadRisk: number;
  confidence: number;
}

export function MLDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [predictions, setPredictions] = useState<MLPrediction[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);
  const [selectedView, setSelectedView] = useState<'weight' | 'deload'>('weight');

  useEffect(() => {
    loadMLData();
  }, []);

  const loadMLData = async () => {
    try {
      setLoading(true);

      // Load latest prediction
      const latestResponse = await mlPredictionsAPI.getLatest();
      if (latestResponse.success && latestResponse.data) {
        setLatestPrediction(latestResponse.data);
      }

      // Load weight trends
      const trendsResponse = await mlPredictionsAPI.getWeightTrends();
      if (trendsResponse.success && trendsResponse.data) {
        setPredictions(trendsResponse.data);
      }
    } catch (error) {
      console.error('[ML_DASHBOARD] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMLData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading ML Insights...</Text>
      </View>
    );
  }

  // Prepare chart data
  const weightChartData = {
    labels: predictions.slice(-7).map(p => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        data: predictions.slice(-7).map(p => p.predictedWeight),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // Primary color
        strokeWidth: 3,
      },
      {
        data: predictions.slice(-7).map(p => p.actualWeight || p.predictedWeight),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Success color
        strokeWidth: 2,
        withDots: true,
      },
    ],
    legend: ['ML Prediction', 'Actual Weight'],
  };

  const deloadRiskData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    data: latestPrediction?.deloadRisk
      ? [
          latestPrediction.deloadRisk.probability < 0.3 ? latestPrediction.deloadRisk.probability : 0.3,
          latestPrediction.deloadRisk.probability >= 0.3 && latestPrediction.deloadRisk.probability < 0.7 ? latestPrediction.deloadRisk.probability : 0,
          latestPrediction.deloadRisk.probability >= 0.7 ? latestPrediction.deloadRisk.probability : 0,
        ]
      : [0.3, 0.3, 0.3],
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    style: {
      borderRadius: theme.borderRadius.lg,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: theme.colors.border,
      strokeWidth: 1,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖 ML Insights</Text>
        <Text style={styles.subtitle}>Proprietary machine learning predictions</Text>
      </View>

      {/* Latest Prediction Card */}
      {latestPrediction && (
        <View style={styles.latestCard}>
          <Text style={styles.cardTitle}>Latest Prediction</Text>

          {/* Weight Prediction */}
          {latestPrediction.weightChange && (
            <View style={styles.predictionSection}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionLabel}>🔮 Next Week Weight</Text>
                <View style={[styles.badge, styles.mlBadge]}>
                  <Text style={styles.badgeText}>ML</Text>
                </View>
              </View>
              <Text style={styles.predictionValue}>
                {latestPrediction.weightChange.predictedChange > 0 ? '+' : ''}
                {latestPrediction.weightChange.predictedChange.toFixed(1)} lbs
              </Text>
              <Text style={styles.predictionInterpretation}>
                {latestPrediction.weightChange.interpretation}
              </Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    { width: `${(latestPrediction.weightChange.confidence * 100)}%` },
                  ]}
                />
                <Text style={styles.confidenceText}>
                  {(latestPrediction.weightChange.confidence * 100).toFixed(0)}% confident
                </Text>
              </View>
            </View>
          )}

          {/* Deload Risk */}
          {latestPrediction.deloadRisk && (
            <View style={styles.predictionSection}>
              <View style={styles.predictionHeader}>
                <Text style={styles.predictionLabel}>😴 Deload Risk</Text>
                <View
                  style={[
                    styles.badge,
                    latestPrediction.deloadRisk.recommendation === 'HIGH'
                      ? styles.highRiskBadge
                      : latestPrediction.deloadRisk.recommendation === 'MEDIUM'
                      ? styles.mediumRiskBadge
                      : styles.lowRiskBadge,
                  ]}
                >
                  <Text style={styles.badgeText}>{latestPrediction.deloadRisk.recommendation}</Text>
                </View>
              </View>
              <Text style={styles.predictionValue}>
                {(latestPrediction.deloadRisk.probability * 100).toFixed(0)}% probability
              </Text>
              {latestPrediction.deloadRisk.factors && (
                <View style={styles.factorsContainer}>
                  <Text style={styles.factorText}>📊 Avg RPE: {latestPrediction.deloadRisk.factors.avgRPE}/10</Text>
                  <Text style={styles.factorText}>
                    ✅ Completion: {(latestPrediction.deloadRisk.factors.completionRate * 100).toFixed(0)}%
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* View Switcher */}
      <View style={styles.viewSwitcher}>
        <TouchableOpacity
          style={[styles.viewButton, selectedView === 'weight' && styles.viewButtonActive]}
          onPress={() => setSelectedView('weight')}
        >
          <Text style={[styles.viewButtonText, selectedView === 'weight' && styles.viewButtonTextActive]}>
            Weight Trends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, selectedView === 'deload' && styles.viewButtonActive]}
          onPress={() => setSelectedView('deload')}
        >
          <Text style={[styles.viewButtonText, selectedView === 'deload' && styles.viewButtonTextActive]}>
            Fatigue Analysis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Charts */}
      {selectedView === 'weight' && predictions.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Prediction Accuracy</Text>
          <Text style={styles.chartSubtitle}>Predicted vs Actual (Last 7 Days)</Text>
          <LineChart
            data={weightChartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(99, 102, 241, 1)' }]} />
              <Text style={styles.legendText}>ML Prediction</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(34, 197, 94, 1)' }]} />
              <Text style={styles.legendText}>Actual Weight</Text>
            </View>
          </View>
        </View>
      )}

      {selectedView === 'deload' && latestPrediction?.deloadRisk && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Fatigue Risk Analysis</Text>
          <Text style={styles.chartSubtitle}>Current deload probability</Text>
          <ProgressChart
            data={deloadRiskData}
            width={screenWidth - 48}
            height={220}
            strokeWidth={16}
            radius={32}
            chartConfig={chartConfig}
            hideLegend={false}
            style={styles.chart}
          />
          <View style={styles.deloadInfoContainer}>
            <Text style={styles.deloadInfoText}>
              {latestPrediction.deloadRisk.probability >= 0.7
                ? '⚠️ High fatigue detected. Consider a deload week to prevent overtraining.'
                : latestPrediction.deloadRisk.probability >= 0.4
                ? '⚡ Moderate fatigue. Monitor your recovery and consider reducing volume.'
                : '✅ Low fatigue. You're recovering well and can continue progressive overload.'}
            </Text>
          </View>
        </View>
      )}

      {/* Info Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>📚 About ML Predictions</Text>
        <Text style={styles.footerText}>
          These predictions are powered by proprietary neural networks trained on exercise physiology data.
          The models analyze your check-ins, training logs, and recovery patterns to provide personalized insights.
        </Text>
        <Text style={styles.footerNote}>
          Note: ML predictions complement, but don't replace, listening to your body and professional coaching.
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
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  latestCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.neon,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  predictionSection: {
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  predictionLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  predictionValue: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  predictionInterpretation: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  mlBadge: {
    backgroundColor: theme.colors.primary,
  },
  highRiskBadge: {
    backgroundColor: theme.colors.error,
  },
  mediumRiskBadge: {
    backgroundColor: '#f59e0b',
  },
  lowRiskBadge: {
    backgroundColor: theme.colors.success,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  confidenceBar: {
    height: 24,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  confidenceText: {
    position: 'absolute',
    top: 4,
    left: theme.spacing.sm,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  factorsContainer: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  factorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  viewSwitcher: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  viewButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  viewButtonActive: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.neon,
  },
  viewButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
  viewButtonTextActive: {
    color: theme.colors.background,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  chartTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  chartSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  chart: {
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  deloadInfoContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  deloadInfoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  footer: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
  },
  footerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  footerNote: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});
