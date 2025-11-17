// Barcode scanner for food logging
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import config from '../src/config';
import { foodLogAPI } from '../src/services/api';
import { ErrorMessages, SuccessMessages, getUserFriendlyError } from '../src/utils/errorMessages';

export default function BarcodeScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const targetDate = params.date as string | undefined;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  // Use ref for immediate blocking (state updates are async)
  const isProcessingRef = useRef(false);
  const [scannedFood, setScannedFood] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Helper function to determine meal type based on current time
  const getMealTypeByTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    return 'dinner';
  };

  // Log scanned food to diary
  const logScannedFood = async (food: any) => {
    console.log('[BARCODE] Logging scanned food to diary:', food.food_name);
    console.log('[BARCODE] Food data:', JSON.stringify(food, null, 2));

    try {
      // Use targetDate if provided, otherwise current date
      let logTimestamp: string;
      if (targetDate) {
        const targetDateObj = new Date(targetDate);
        targetDateObj.setHours(12, 0, 0, 0); // Set to noon
        logTimestamp = targetDateObj.toISOString();
      } else {
        logTimestamp = new Date().toISOString();
      }

      await foodLogAPI.createEntry({
        food_name: food.food_name,
        meal_type: getMealTypeByTime(),
        serving_size: 1,
        serving_unit: 'serving',
        calories: food.calories_kcal || 0,
        protein: food.protein_g || 0,
        carbs: food.carbs_g || 0,
        fat: food.fat_g || 0,
        logged_at: logTimestamp,
      });

      console.log('[BARCODE] Successfully logged food');

      // Navigate immediately without showing another alert
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error('[BARCODE] Error logging food:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
      // Reset on error
      isProcessingRef.current = false;
      setScanned(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // CRITICAL: Use ref for immediate synchronous blocking (state is too slow!)
    if (isProcessingRef.current) {
      console.log('[BARCODE] BLOCKED - Already processing (ref check)');
      return;
    }

    // Set ref immediately to block subsequent scans
    isProcessingRef.current = true;
    setScanned(true);

    console.log('[BARCODE] Scanned:', data);

    try {
      const response = await fetch(`${config.API_URL}/api/barcode/search/${data}`);
      const result = await response.json();
      console.log('[BARCODE] API Response:', JSON.stringify(result, null, 2));

      if (result.success && result.data && result.data.food) {
        const food = result.data.food;
        console.log('[BARCODE] Food object:', JSON.stringify(food, null, 2));

        // Validate food data has required fields
        if (!food.food_name || food.calories_kcal === undefined) {
          console.error('[BARCODE] Invalid food data - missing name or calories');
          Alert.alert(
            'Incomplete Data',
            'Product found but nutritional data is incomplete. Try searching manually.',
            [
              {
                text: 'Scan Another',
                onPress: () => {
                  isProcessingRef.current = false;
                  setScanned(false);
                }
              },
              {
                text: 'Search Manually',
                onPress: () => router.replace('/food-search')
              }
            ]
          );
          return;
        }

        // Auto-log immediately without showing Alert to prevent duplicates
        setScannedFood(food);
        await logScannedFood(food);

      } else {
        console.log('[BARCODE] Product not found or invalid response');
        Alert.alert(
          ErrorMessages.barcodeNotFound.title,
          ErrorMessages.barcodeNotFound.message,
          [
            {
              text: 'Scan Another',
              onPress: () => {
                isProcessingRef.current = false;
                setScanned(false);
              }
            },
            {
              text: 'Search Manually',
              onPress: () => router.replace('/food-search')
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('[BARCODE] Error:', error);
      const friendlyError = getUserFriendlyError(error);
      Alert.alert(friendlyError.title, friendlyError.message);
      isProcessingRef.current = false;
      setScanned(false);
    }
  };

  const styles = createStyles(theme);

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Text style={styles.subtext}>Please enable camera permissions in settings</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame} />
            <Text style={styles.instructions}>
              {scanned ? '💭 Looking that up...' : 'Point camera at barcode 📱'}
            </Text>
          </View>

          {scanned && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                isProcessingRef.current = false;
                setScanned(false);
              }}
            >
              <Text style={styles.resetButtonText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}

          {/* Manual Entry Fallback - Always Visible */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => router.replace('/food-search')}
            >
              <Text style={styles.manualEntryText}>Can't find barcode? Search manually →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  backButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 60,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  instructions: {
    marginTop: theme.spacing.xl,
    fontSize: theme.fontSize.lg,
    color: '#fff',
    fontWeight: theme.fontWeight.bold,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  resetButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neon,
  },
  resetButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  manualEntryButton: {
    backgroundColor: theme.colors.surface + 'DD',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '50',
  },
  manualEntryText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
});
