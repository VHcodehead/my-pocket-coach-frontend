// Progress Photo Capture - Take and save transformation photos
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { theme } from '../src/theme';
import { supabase } from '../src/services/supabase';
import { decode } from 'base64-arraybuffer';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';

export default function ProgressPhotoCaptureScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(ErrorMessages.photoLibraryPermission.title, ErrorMessages.photoLibraryPermission.message);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(ErrorMessages.cameraPermission.title, ErrorMessages.cameraPermission.message);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadProgressPhoto = async () => {
    if (!image) {
      Alert.alert('No Photo 📷', 'Please take or select a photo first!');
      return;
    }

    setUploading(true);

    try {
      console.log('[PROGRESS_PHOTO] Starting upload...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(ErrorMessages.notLoggedIn.title, ErrorMessages.notLoggedIn.message);
        return;
      }

      // Read image as base64
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1]; // Remove data:image/jpeg;base64, prefix

          // Generate unique filename
          const fileName = `${user.id}/${Date.now()}.jpg`;

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('progress-photos')
            .upload(fileName, decode(base64String), {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('[PROGRESS_PHOTO] Upload error:', uploadError);
            Alert.alert(ErrorMessages.photoUploadFailed.title, ErrorMessages.photoUploadFailed.message);
            return;
          }

          console.log('[PROGRESS_PHOTO] Upload successful:', uploadData);

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('progress-photos')
            .getPublicUrl(fileName);

          console.log('[PROGRESS_PHOTO] Public URL:', publicUrl);

          // Save to progress_photos table
          const { error: dbError } = await supabase
            .from('progress_photos')
            .insert({
              user_id: user.id,
              image_url: publicUrl,
              weight: weight ? parseFloat(weight) : null,
              notes: notes || null,
            });

          if (dbError) {
            console.error('[PROGRESS_PHOTO] Database error:', dbError);
            const friendlyError = getUserFriendlyError(dbError);
            Alert.alert(friendlyError.title, 'Photo uploaded but had trouble saving to database. Please try again!');
            return;
          }

          console.log('[PROGRESS_PHOTO] Successfully saved to database');

          Alert.alert(
            SuccessMessages.photoSaved.title,
            SuccessMessages.photoSaved.message,
            [
              { text: 'View Timeline', onPress: () => router.push('/photo-timeline') },
              { text: 'Take Another', onPress: () => { setImage(null); setWeight(''); setNotes(''); } },
              { text: 'Done', onPress: () => router.back() }
            ]
          );
        } catch (error: any) {
          console.error('[PROGRESS_PHOTO] Error in upload process:', error);
          const friendlyError = getUserFriendlyError(error);
          Alert.alert(friendlyError.title, friendlyError.message);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error('[PROGRESS_PHOTO] Error:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Progress Photo 📸</Text>
        <Text style={styles.subtitle}>Document your transformation journey!</Text>
      </View>

      {!image ? (
        <View style={styles.emptyState}>
          <View style={styles.iconContainer}>
            <Text style={styles.emptyIcon}>📷</Text>
          </View>
          <Text style={styles.emptyTitle}>Capture Your Progress</Text>
          <Text style={styles.instructions}>
            Take regular progress photos to track your transformation. I recommend taking photos in the same location, lighting, and pose each time for best comparison!
          </Text>

          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>Same time of day (morning works best)</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>📐</Text>
              <Text style={styles.tipText}>Same pose and angle each time</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>Good natural lighting</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>📅</Text>
              <Text style={styles.tipText}>Weekly or bi-weekly frequency</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
              <Text style={styles.cameraButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Text style={styles.galleryButtonText}>🖼️ Choose Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.photoContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {!uploading && (
            <>
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Add Details (Optional)</Text>

                <Text style={styles.inputLabel}>Current Weight (lbs)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 180"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="How are you feeling? Any milestones?"
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setImage(null)}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={uploadProgressPhoto}
                >
                  <Text style={styles.saveButtonText}>Save Progress Photo 💪</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.uploadingText}>📤 Saving your progress...</Text>
              <Text style={styles.uploadingSubtext}>This will just take a moment!</Text>
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
  },
  backButton: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyIcon: {
    fontSize: 60,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructions: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  tipsList: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
  },
  tipText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  cameraButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  cameraButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  galleryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  galleryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  photoContainer: {
    padding: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: 400,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  detailsSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  saveButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  uploadingContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
  },
  uploadingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
});
