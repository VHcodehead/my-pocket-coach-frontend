// Me Tab - Progress Hub with profile and tracking
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { authAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { getUserFriendlyError } from '../../src/utils/errorMessages';

console.log('[ME] Component file loaded');

export default function MeScreen() {
  console.log('[ME] MeScreen component rendering');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    console.log('[ME] useEffect triggered, calling loadProfile');
    try {
      loadProfile();
    } catch (error) {
      console.error('[ME] Error calling loadProfile:', error);
    }
  }, []);

  const loadProfile = async () => {
    console.log('[ME] loadProfile function started');
    try {
      console.log('[ME] Calling backend API to get profile');
      const response = await authAPI.getProfile();

      console.log('[ME] Backend response:', response);

      if (!response.success || !response.data) {
        console.error('[ME] No profile data returned');
        router.replace('/');
        return;
      }

      console.log('[ME] Profile data loaded:', {
        hasData: !!response.data,
        full_name: response.data?.full_name,
        weight: response.data?.weight,
        goal: response.data?.goal,
      });

      setProfile(response.data);
    } catch (error) {
      console.error('[ME] Exception:', error);
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out?',
      'I\'ll be here when you come back! See you soon?',
      [
        { text: 'Stay Logged In', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.logout();
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error: any) {
              console.error('[ME] Logout error:', error);
              const friendlyError = getUserFriendlyError(error);
              Alert.alert(friendlyError.title, friendlyError.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Your Account?',
      'This will permanently delete all your data - food logs, progress, everything. This can\'t be undone. Are you absolutely sure?',
      [
        { text: 'Keep My Account', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error: profileError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) {
                console.error('[ME] Delete profile error:', profileError);
              }

              await supabase.auth.signOut();
              await authAPI.logout();

              Alert.alert('Account Deleted', 'Your data has been removed.');
              router.replace('/');
            } catch (error: any) {
              console.error('[ME] Delete account error:', error);
              const friendlyError = getUserFriendlyError(error);
              Alert.alert(friendlyError.title, 'Had trouble deleting your account. Please contact support.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header - Profile Card */}
      <View style={styles.header}>
        <View style={styles.profileCard}>
          <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.weight || '-'}</Text>
              <Text style={styles.statLabel}>lbs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.goal ? profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1) : '-'}
              </Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Tracking Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Tracking</Text>

        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => router.push('/photo-timeline')}
        >
          <View style={styles.progressIcon}>
            <Text style={styles.progressEmoji}>📸</Text>
          </View>
          <View style={styles.progressContent}>
            <Text style={styles.progressTitle}>Progress Photos</Text>
            <Text style={styles.progressSubtitle}>Visual timeline of your transformation</Text>
          </View>
          <Text style={styles.progressArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => router.push('/weekly-summary')}
        >
          <View style={styles.progressIcon}>
            <Text style={styles.progressEmoji}>📊</Text>
          </View>
          <View style={styles.progressContent}>
            <Text style={styles.progressTitle}>Weekly Summaries</Text>
            <Text style={styles.progressSubtitle}>See your weekly trends and insights</Text>
          </View>
          <Text style={styles.progressArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => Alert.alert('Coming Soon! 🎯', 'Goals & milestones tracking is on the way!')}
        >
          <View style={styles.progressIcon}>
            <Text style={styles.progressEmoji}>🎯</Text>
          </View>
          <View style={styles.progressContent}>
            <Text style={styles.progressTitle}>Goals & Milestones</Text>
            <Text style={styles.progressSubtitle}>Track achievements and set new targets</Text>
          </View>
          <Text style={styles.progressArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.progressCard}
          onPress={() => Alert.alert('Coming Soon! 💧', 'Wellness tracking for water, mood, and sleep is coming!')}
        >
          <View style={styles.progressIcon}>
            <Text style={styles.progressEmoji}>💧</Text>
          </View>
          <View style={styles.progressContent}>
            <Text style={styles.progressTitle}>Wellness Tracking</Text>
            <Text style={styles.progressSubtitle}>Water intake, mood, and sleep quality</Text>
          </View>
          <Text style={styles.progressArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Account & App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account & App</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/weekly-checkin')}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>📝</Text>
          </View>
          <Text style={styles.menuLabel}>Weekly Check-in</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>⚙️</Text>
          </View>
          <Text style={styles.menuLabel}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Coming Soon! 🎨', 'Theme customization is on the way!')}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>🎨</Text>
          </View>
          <Text style={styles.menuLabel}>Theme Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert('Coming Soon! 🔔', 'Notification settings coming soon!')}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>🔔</Text>
          </View>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemDanger]}
          onPress={handleLogout}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>⏻</Text>
          </View>
          <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Sign Out</Text>
          <Text style={[styles.menuArrow, styles.menuLabelDanger]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.dangerButtonText}>Delete My Account</Text>
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
  loadingText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.shadows.md,
  },
  userName: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginTop: theme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  section: {
    padding: theme.spacing.xl,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  progressIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  progressEmoji: {
    fontSize: 24,
  },
  progressContent: {
    flex: 1,
  },
  progressTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  progressSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  progressArrow: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  menuItemDanger: {
    borderColor: theme.colors.secondary + '50',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuLabel: {
    flex: 1,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  menuLabelDanger: {
    color: theme.colors.secondary,
  },
  menuArrow: {
    fontSize: 24,
    color: theme.colors.textMuted,
  },
  dangerButton: {
    backgroundColor: theme.colors.secondary + '20',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
});
