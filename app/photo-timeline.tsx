// Progress Photos Timeline - Side-by-side comparison view
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { checkinAPI } from '../src/services/api';
import { ErrorMessages } from '../src/utils/errorMessages';

interface CheckinPhotos {
  id: string;
  checked_at: string;
  weight?: number;
  notes?: string;
  photos: {
    front?: string;
    side1?: string;
    side2?: string;
    back?: string;
  };
}

export default function PhotoTimelineScreen() {
  console.log('[PHOTO_TIMELINE] Component rendering');
  const router = useRouter();
  const { theme } = useTheme();
  const [checkins, setCheckins] = useState<CheckinPhotos[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[PHOTO_TIMELINE] useEffect triggered, calling loadPhotos');
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      console.log('[PHOTO_TIMELINE] Fetching progress photos from backend');

      // Fetch check-ins with photos from backend API
      const response = await checkinAPI.getProgressPhotos();

      console.log('[PHOTO_TIMELINE] API response:', {
        success: response.success,
        dataCount: response.data?.length,
      });

      if (!response.success || !response.data) {
        console.error('[PHOTO_TIMELINE] Failed to fetch photos');
        return;
      }

      // Convert check-in data to checkin photos format with all 4 photos
      const checkinPhotos: CheckinPhotos[] = response.data.map((checkin: any) => ({
        id: checkin.id.toString(),
        checked_at: checkin.checked_at,
        weight: checkin.weight,
        notes: checkin.notes,
        photos: {
          front: checkin.photo_front_url,
          side1: checkin.photo_side1_url,
          side2: checkin.photo_side2_url,
          back: checkin.photo_back_url,
        },
      }));

      console.log('[PHOTO_TIMELINE] Created checkin entries:', checkinPhotos.length);
      setCheckins(checkinPhotos);
    } catch (error) {
      console.error('[PHOTO_TIMELINE] Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysSince = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getWeekOf = (dateString: string): string => {
    const date = new Date(dateString);
    return `Week of ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTintColor: theme.colors.primary,
            headerTitle: 'Progress Photos',
            headerTitleStyle: {
              fontWeight: theme.fontWeight.bold,
              fontSize: theme.fontSize.xl,
              color: theme.colors.text,
            },
            headerShadowVisible: false,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.primary,
          headerTitle: 'Progress Photos',
          headerTitleStyle: {
            fontWeight: theme.fontWeight.bold,
            fontSize: theme.fontSize.xl,
            color: theme.colors.text,
          },
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Transformation Journey 📸</Text>
        <Text style={styles.subtitle}>
          {checkins.length === 0 ? 'Start documenting your progress!' : `${checkins.length} check-ins captured`}
        </Text>
      </View>

      {/* Check-ins Timeline */}
      {checkins.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📷</Text>
          <Text style={styles.emptyText}>No progress photos yet</Text>
          <Text style={styles.emptySubtext}>
            Start capturing your journey! Tap the camera button on your dashboard to take your first progress photo.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/photo-logger')}
          >
            <Text style={styles.emptyButtonText}>Take First Photo 📸</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.timelineSection}>
          {checkins.map((checkin) => (
            <View key={checkin.id} style={styles.checkinCard}>
              {/* Check-in Header */}
              <View style={styles.checkinHeader}>
                <Text style={styles.weekLabel}>{getWeekOf(checkin.checked_at)}</Text>
                <Text style={styles.checkinDate}>{formatDate(checkin.checked_at)}</Text>
              </View>

              {/* Check-in Info */}
              <View style={styles.checkinInfo}>
                {checkin.weight && (
                  <Text style={styles.checkinWeight}>Weight: {checkin.weight} lbs</Text>
                )}
                {checkin.notes && (
                  <Text style={styles.checkinNotes}>{checkin.notes}</Text>
                )}
                <Text style={styles.checkinDays}>{getDaysSince(checkin.checked_at)} days ago</Text>
              </View>

              {/* 2x2 Photo Grid */}
              <View style={styles.photoGrid}>
                {/* Row 1: Front and Side1 */}
                <View style={styles.photoRow}>
                  {checkin.photos.front && (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: checkin.photos.front }} style={styles.photoImage} />
                      <Text style={styles.photoLabel}>Front</Text>
                    </View>
                  )}
                  {checkin.photos.side1 && (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: checkin.photos.side1 }} style={styles.photoImage} />
                      <Text style={styles.photoLabel}>Side</Text>
                    </View>
                  )}
                </View>

                {/* Row 2: Side2 and Back */}
                <View style={styles.photoRow}>
                  {checkin.photos.side2 && (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: checkin.photos.side2 }} style={styles.photoImage} />
                      <Text style={styles.photoLabel}>Side</Text>
                    </View>
                  )}
                  {checkin.photos.back && (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: checkin.photos.back }} style={styles.photoImage} />
                      <Text style={styles.photoLabel}>Back</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xxl,
    marginHorizontal: theme.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  emptyButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
  },
  timelineSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  checkinCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  checkinHeader: {
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  weekLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  checkinDate: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
  },
  checkinInfo: {
    marginBottom: theme.spacing.lg,
  },
  checkinWeight: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing.xs,
  },
  checkinNotes: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontStyle: 'italic',
  },
  checkinDays: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  photoGrid: {
    gap: theme.spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  photoContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  photoImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.borderLight,
  },
  photoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
  },
});
