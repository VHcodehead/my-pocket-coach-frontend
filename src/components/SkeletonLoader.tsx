// Skeleton loading placeholders for better perceived performance
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  marginBottom?: number;
  style?: any;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = theme.borderRadius.md,
  marginBottom = theme.spacing.md,
  style,
}: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          marginBottom,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Preset skeleton patterns
export function FoodEntrySkeleton() {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <SkeletonLoader width={80} height={12} marginBottom={8} />
        <SkeletonLoader width={50} height={12} marginBottom={8} />
      </View>
      <SkeletonLoader width="60%" height={16} marginBottom={8} />
      <View style={styles.macroRow}>
        <SkeletonLoader width={60} height={12} marginBottom={0} />
        <SkeletonLoader width={60} height={12} marginBottom={0} />
        <SkeletonLoader width={60} height={12} marginBottom={0} />
      </View>
    </View>
  );
}

export function DashboardCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader width={120} height={18} marginBottom={12} />
      <SkeletonLoader width="100%" height={60} marginBottom={12} />
      <SkeletonLoader width="80%" height={14} marginBottom={0} />
    </View>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <SkeletonLoader width={80} height={80} borderRadius={40} marginBottom={12} />
      <SkeletonLoader width={150} height={24} marginBottom={8} />
      <SkeletonLoader width={100} height={16} marginBottom={0} />
    </View>
  );
}

export function MealPlanSkeleton() {
  return (
    <View style={styles.mealPlanCard}>
      <SkeletonLoader width={100} height={16} marginBottom={12} />
      <SkeletonLoader width="100%" height={14} marginBottom={8} />
      <SkeletonLoader width="100%" height={14} marginBottom={8} />
      <SkeletonLoader width="80%" height={14} marginBottom={12} />
      <SkeletonLoader width="100%" height={40} marginBottom={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.border,
  },
  entryCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  mealPlanCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
});
