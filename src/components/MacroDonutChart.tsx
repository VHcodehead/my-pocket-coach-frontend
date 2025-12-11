// Macro balance donut chart visualization
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../contexts/ThemeContext';

interface MacroDonutChartProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
}

export function MacroDonutChart({
  protein,
  carbs,
  fat,
  proteinTarget = 150,
  carbsTarget = 200,
  fatTarget = 65,
}: MacroDonutChartProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const screenWidth = Dimensions.get('window').width;

  // Calculate percentages
  const total = protein + carbs + fat;
  const proteinPercent = total > 0 ? Math.round((protein / total) * 100) : 0;
  const carbsPercent = total > 0 ? Math.round((carbs / total) * 100) : 0;
  const fatPercent = total > 0 ? Math.round((fat / total) * 100) : 0;

  // Calculate target percentages
  const totalTarget = proteinTarget + carbsTarget + fatTarget;
  const proteinTargetPercent = Math.round((proteinTarget / totalTarget) * 100);
  const carbsTargetPercent = Math.round((carbsTarget / totalTarget) * 100);
  const fatTargetPercent = Math.round((fatTarget / totalTarget) * 100);

  // Define colors
  const colors = {
    protein: '#FF6B9D', // Pink
    carbs: '#4ECDC4',   // Teal
    fat: '#FFE66D',     // Yellow
  };

  const chartData = [
    {
      name: 'Protein',
      amount: protein,
      color: colors.protein,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Carbs',
      amount: carbs,
      color: colors.carbs,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Fat',
      amount: fat,
      color: colors.fat,
      legendFontColor: theme.colors.text,
      legendFontSize: 12,
    },
  ];

  const chartConfig = {
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Macro Balance</Text>

      {total > 0 ? (
        <>
          <PieChart
            data={chartData}
            width={screenWidth - 40}
            height={160}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute={false}
            hasLegend={true}
          />

          {/* Macro breakdown with target comparison */}
          <View style={styles.breakdown}>
            <View style={styles.macroRow}>
              <View style={[styles.colorDot, { backgroundColor: colors.protein }]} />
              <View style={styles.macroInfo}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>
                  {Math.round(protein)}g / {proteinTarget}g
                </Text>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={styles.currentPercent}>{proteinPercent}%</Text>
                <Text style={styles.targetPercent}>({proteinTargetPercent}% target)</Text>
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={[styles.colorDot, { backgroundColor: colors.carbs }]} />
              <View style={styles.macroInfo}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>
                  {Math.round(carbs)}g / {carbsTarget}g
                </Text>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={styles.currentPercent}>{carbsPercent}%</Text>
                <Text style={styles.targetPercent}>({carbsTargetPercent}% target)</Text>
              </View>
            </View>

            <View style={styles.macroRow}>
              <View style={[styles.colorDot, { backgroundColor: colors.fat }]} />
              <View style={styles.macroInfo}>
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>
                  {Math.round(fat)}g / {fatTarget}g
                </Text>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={styles.currentPercent}>{fatPercent}%</Text>
                <Text style={styles.targetPercent}>({fatTargetPercent}% target)</Text>
              </View>
            </View>
          </View>

          {/* Balance feedback */}
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>💡 Balance Tips</Text>
            {proteinPercent < proteinTargetPercent - 5 && (
              <Text style={styles.feedbackText}>• Add more protein-rich foods</Text>
            )}
            {carbsPercent > carbsTargetPercent + 5 && (
              <Text style={styles.feedbackText}>• Consider reducing carbs slightly</Text>
            )}
            {fatPercent < fatTargetPercent - 5 && (
              <Text style={styles.feedbackText}>• Include healthy fats like nuts or avocado</Text>
            )}
            {Math.abs(proteinPercent - proteinTargetPercent) <= 5 &&
              Math.abs(carbsPercent - carbsTargetPercent) <= 5 &&
              Math.abs(fatPercent - fatTargetPercent) <= 5 && (
                <Text style={styles.feedbackTextGood}>✅ Great macro balance today!</Text>
              )}
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No macros logged yet today</Text>
          <Text style={styles.emptySubtext}>Start logging meals to see your balance!</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  breakdown: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroInfo: {
    flex: 1,
  },
  macroLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  macroValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  percentageContainer: {
    alignItems: 'flex-end',
  },
  currentPercent: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  targetPercent: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  feedbackContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  feedbackTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  feedbackText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  feedbackTextGood: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.encouragement,
    fontWeight: theme.fontWeight.semibold,
    marginTop: theme.spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
});
