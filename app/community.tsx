// Community Leaderboard Screen
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { leaderboardAPI } from '../src/services/api';

interface LeaderboardEntry {
  rank: number;
  name: string;
  displayValue: string;
  isCurrentUser?: boolean;
}

interface LeaderboardCategory {
  id: string;
  title: string;
  icon: string;
  entries: LeaderboardEntry[];
}

export default function CommunityScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<LeaderboardEntry[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const response = await leaderboardAPI.getAll();
      if (response.success && response.data?.categories) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('[COMMUNITY] Error loading leaderboards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboards();
  };

  const loadExpandedCategory = async (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setExpandedData([]);
      return;
    }

    setSelectedCategory(categoryId);
    setLoadingExpanded(true);

    try {
      let response;
      if (categoryId === 'weight-loss') {
        response = await leaderboardAPI.getWeightLoss(20);
      } else if (categoryId === 'weight-gain') {
        response = await leaderboardAPI.getWeightGain(20);
      } else if (categoryId.startsWith('lift-')) {
        const exercise = categoryId.replace('lift-', '') as 'squat' | 'bench' | 'deadlift';
        response = await leaderboardAPI.getLifts(exercise, 20);
      }

      if (response?.success && response.data?.entries) {
        setExpandedData(response.data.entries.map((entry: any) => ({
          rank: entry.rank,
          name: entry.name,
          displayValue: entry.displayValue ||
            (categoryId === 'weight-loss' ? `-${entry.weightLost} lbs` :
             categoryId === 'weight-gain' ? `+${entry.weightGained} lbs` :
             `${entry.estimated1RM} lbs`),
          isCurrentUser: entry.isCurrentUser,
        })));
      }
    } catch (error) {
      console.error('[COMMUNITY] Error loading expanded category:', error);
    } finally {
      setLoadingExpanded(false);
    }
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) return <Text style={styles.rankBadge}>🥇</Text>;
    if (rank === 2) return <Text style={styles.rankBadge}>🥈</Text>;
    if (rank === 3) return <Text style={styles.rankBadge}>🥉</Text>;
    return <Text style={styles.rankNumber}>{rank}</Text>;
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, index: number) => (
    <View
      key={`${entry.rank}-${index}`}
      style={[
        styles.entryRow,
        entry.isCurrentUser && styles.currentUserRow,
      ]}
    >
      <View style={styles.rankContainer}>
        {renderRankBadge(entry.rank)}
      </View>
      <Text style={[styles.entryName, entry.isCurrentUser && styles.currentUserText]} numberOfLines={1}>
        {entry.name}
        {entry.isCurrentUser && ' (You)'}
      </Text>
      <Text style={[styles.entryValue, entry.isCurrentUser && styles.currentUserText]}>
        {entry.displayValue}
      </Text>
    </View>
  );

  const renderCategory = (category: LeaderboardCategory) => {
    const isExpanded = selectedCategory === category.id;

    return (
      <View key={category.id} style={styles.categoryCard}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => loadExpandedCategory(category.id)}
        >
          <View style={styles.categoryTitleRow}>
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryTitle}>{category.title}</Text>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {/* Preview - Top 3 */}
        {!isExpanded && category.entries.length > 0 && (
          <View style={styles.previewContainer}>
            {category.entries.slice(0, 3).map((entry, index) => renderLeaderboardEntry(entry, index))}
            {category.entries.length === 0 && (
              <Text style={styles.noDataText}>No entries yet - be the first!</Text>
            )}
          </View>
        )}

        {/* Expanded View - Full Leaderboard */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            {loadingExpanded ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
            ) : expandedData.length > 0 ? (
              expandedData.map((entry, index) => renderLeaderboardEntry(entry, index))
            ) : (
              <Text style={styles.noDataText}>No entries yet - be the first!</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboards...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Leaderboards</Text>
          <Text style={styles.introText}>
            See how you stack up against the community! Compete in weight loss, muscle building, and strength categories.
          </Text>
        </View>

        {categories.map(category => renderCategory(category))}

        {categories.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No leaderboard data available yet.</Text>
            <Text style={styles.emptyStateSubtext}>Start tracking your progress to appear on the leaderboards!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 60,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  introCard: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  introTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  introText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  categoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: theme.spacing.sm,
  },
  categoryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  expandIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  previewContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  expandedContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '50',
  },
  currentUserRow: {
    backgroundColor: theme.colors.primary + '20',
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  rankBadge: {
    fontSize: 20,
  },
  rankNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  entryName: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  entryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  currentUserText: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  noDataText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
