// Profile screen with account management
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { authAPI } from '../../src/services/api';
import { theme } from '../../src/theme';
import { getUserFriendlyError } from '../../src/utils/errorMessages';
import { HamburgerMenu } from '../../src/components/HamburgerMenu';

console.log('[PROFILE] Component file loaded');

export default function ProfileScreen() {
  console.log('[PROFILE] ProfileScreen component rendering');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    console.log('[PROFILE] useEffect triggered, calling loadProfile');
    console.log('[PROFILE] loadProfile type:', typeof loadProfile);
    console.log('[PROFILE] loadProfile is:', loadProfile);
    try {
      loadProfile();
    } catch (error) {
      console.error('[PROFILE] Error calling loadProfile:', error);
    }
  }, []);

  const loadProfile = async () => {
    console.log('[PROFILE] loadProfile function started');
    try {
      console.log('[PROFILE] Calling backend API to get profile');
      const response = await authAPI.getProfile();

      console.log('[PROFILE] Backend response:', response);

      if (!response.success || !response.data) {
        console.error('[PROFILE] No profile data returned');
        router.replace('/');
        return;
      }

      console.log('[PROFILE] Profile data loaded:', {
        hasData: !!response.data,
        full_name: response.data?.full_name,
        weight: response.data?.weight,
        goal: response.data?.goal,
        meals_per_day: response.data?.meals_per_day,
      });

      setProfile(response.data);
    } catch (error) {
      console.error('[PROFILE] Exception:', error);
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
              // Clear backend JWT token
              await authAPI.logout();
              // Clear Supabase session
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error: any) {
              console.error('[PROFILE] Logout error:', error);
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

              // Delete user profile
              const { error: profileError } = await supabase
                .from('user_profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) {
                console.error('[PROFILE] Delete profile error:', profileError);
              }

              // Delete auth user (requires admin API, will fail - user should contact support)
              await supabase.auth.signOut();
              await authAPI.logout();

              Alert.alert('Account Deleted', 'Your data has been removed. If you need help with anything, contact support.');
              router.replace('/');
            } catch (error: any) {
              console.error('[PROFILE] Delete account error:', error);
              const friendlyError = getUserFriendlyError(error);
              Alert.alert(friendlyError.title, 'Had trouble deleting your account. Please contact support for help.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>💭 Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerGlass}>
        <View style={styles.headerGlow} />
        <HamburgerMenu style={styles.menuButton} />
        <View style={styles.headerContent}>
          <Text style={styles.systemLabel}>YOUR PROFILE</Text>
          <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
          <Text style={styles.headerSubtext}>You're doing great! Keep crushing your goals 💪</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <View style={[styles.statGlow, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.statLabel}>Current Weight</Text>
          <Text style={styles.statValue}>{profile?.weight || '-'}</Text>
          <Text style={styles.statUnit}>lbs</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statGlow, { backgroundColor: theme.colors.secondary }]} />
          <Text style={styles.statLabel}>Your Goal</Text>
          <Text style={[styles.statValue, { fontSize: theme.fontSize.lg }]}>
            {profile?.goal ? profile.goal.charAt(0).toUpperCase() + profile.goal.slice(1) : '-'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statGlow, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles.statLabel}>Daily Meals</Text>
          <Text style={styles.statValue}>{profile?.meals_per_day || '-'}</Text>
        </View>
      </View>

      {/* Menu Options */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>⚙️</Text>
          </View>
          <Text style={styles.menuLabel}>Edit Your Profile</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon! 💎', 'I\'m working on adding subscription features. Stay tuned!')}>
          <View style={styles.menuIconContainer}>
            <Text style={styles.menuIcon}>💎</Text>
          </View>
          <Text style={styles.menuLabel}>Subscription</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon! 🔔', 'Smart notifications are on the way. I\'ll remind you at the perfect times!')}>
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
      <View style={styles.dangerSection}>
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
  headerGlass: {
    backgroundColor: theme.colors.surface + '80',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '30',
    padding: theme.spacing.xl,
    paddingTop: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  menuButton: {
    position: 'absolute',
    top: 64,
    left: theme.spacing.xl,
    zIndex: 10,
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 150,
    backgroundColor: theme.colors.primary,
    opacity: 0.1,
    borderRadius: 200,
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  systemLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: 3,
    marginBottom: theme.spacing.sm,
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
  },
  headerSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  statsSection: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  statGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    height: 60,
    opacity: 0.1,
    borderRadius: 100,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  statUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  menuSection: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  dangerSection: {
    padding: theme.spacing.lg,
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
