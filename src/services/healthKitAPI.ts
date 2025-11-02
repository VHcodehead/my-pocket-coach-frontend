// Apple Watch HealthKit Integration API
// Syncs biometric data from HealthKit to backend
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import config from '../config';

const API_URL = config.API_URL;

export interface HealthKitDailyData {
  date: string; // YYYY-MM-DD

  // Sleep (HKCategoryType)
  totalSleepHours: number | null;
  deepSleepHours: number | null;
  remSleepHours: number | null;
  coreSleepHours: number | null;
  awakeTimeMinutes: number | null;

  // Heart (HKQuantityType)
  restingHeartRate: number | null;
  avgHRV: number | null;

  // Activity (HKQuantityType)
  steps: number | null;
  activeCalories: number | null;

  // Respiratory (HKQuantityType)
  respiratoryRate: number | null;

  // Temperature (HKQuantityType - Series 8+ only)
  wristTemperatureDelta: number | null;
}

export interface AppleWatchStatus {
  connected: boolean;
  weekSummary?: AppleWatchWeekSummary | null;
}

export interface AppleWatchWeekSummary {
  avgSleep: number;
  avgReadiness: number;
  avgHRV: number | null;
  avgSteps: number;
  avgRestingHR: number | null;
  dataAvailable: boolean;
}

/**
 * Request HealthKit permissions
 * Must be called before syncing data
 */
export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.warn('[HEALTHKIT] Not available on', Platform.OS);
    return false;
  }

  try {
    // Check if react-native-health is available (requires custom dev build)
    const healthModule = require('react-native-health');

    if (!healthModule || !healthModule.default) {
      console.error('[HEALTHKIT] Module not found - requires custom development build');
      console.error('[HEALTHKIT] Run: npx expo run:ios to build with native modules');
      return false;
    }

    const AppleHealthKit = healthModule.default;

    if (!AppleHealthKit || !AppleHealthKit.Constants) {
      console.error('[HEALTHKIT] Module loaded but Constants undefined');
      return false;
    }

    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRateVariability,
          AppleHealthKit.Constants.Permissions.RestingHeartRate,
          AppleHealthKit.Constants.Permissions.StepCount,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.RespiratoryRate,
          // Optional: Temperature (requires Series 8+)
          // AppleHealthKit.Constants.Permissions.AppleSleepingWristTemperature,
        ],
        write: [
          // Optional: Allow saving workouts to Health
          // AppleHealthKit.Constants.Permissions.Workout,
        ],
      }
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (err: string) => {
        if (err) {
          console.error('[HEALTHKIT] Permission error:', err);
          resolve(false);
        } else {
          console.log('[HEALTHKIT] ✅ Permissions granted');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('[HEALTHKIT] Permission request error:', error);
    console.error('[HEALTHKIT] This feature requires a custom development build');
    console.error('[HEALTHKIT] Run: npx expo run:ios');
    return false;
  }
}

/**
 * Sync HealthKit data to backend
 * Fetches last 7 days and sends to server
 */
export async function syncHealthKitData(daysBack: number = 7): Promise<{
  success: boolean;
  daysSynced?: number;
  error?: string;
}> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'HealthKit only available on iOS' };
  }

  try {
    console.log(`[HEALTHKIT] Syncing ${daysBack} days of data...`);

    const healthModule = require('react-native-health');
    if (!healthModule || !healthModule.default) {
      console.error('[HEALTHKIT] Module not available - requires custom development build');
      return { success: false, error: 'HealthKit module not available. Build with: npx expo run:ios' };
    }

    const AppleHealthKit = healthModule.default;
    if (!AppleHealthKit) {
      return { success: false, error: 'HealthKit not initialized' };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch all data types in parallel
    const [sleepData, hrvData, rhrData, stepsData, caloriesData, respiratoryData] = await Promise.all([
      fetchSleepData(AppleHealthKit, startDate, endDate),
      fetchHRVData(AppleHealthKit, startDate, endDate),
      fetchRestingHRData(AppleHealthKit, startDate, endDate),
      fetchStepsData(AppleHealthKit, startDate, endDate),
      fetchActiveCaloriesData(AppleHealthKit, startDate, endDate),
      fetchRespiratoryRateData(AppleHealthKit, startDate, endDate),
    ]);

    // Merge all data by date
    const dailyData = mergeDailyData(
      sleepData,
      hrvData,
      rhrData,
      stepsData,
      caloriesData,
      respiratoryData,
      daysBack
    );

    console.log(`[HEALTHKIT] Collected data for ${dailyData.length} days`);

    // Send to backend
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/apple-watch/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: dailyData }),
    });

    if (response.status === 401) {
      throw new Error('Session expired');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to sync data');
    }

    console.log(`[HEALTHKIT] ✅ Synced ${result.data.daysSynced} days`);
    return {
      success: true,
      daysSynced: result.data.daysSynced,
    };
  } catch (error: any) {
    console.error('[HEALTHKIT] Sync error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Helper: Fetch sleep data with stages (iOS 16+)
 */
async function fetchSleepData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getSleepSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] Sleep error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} sleep samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Fetch HRV data (SDNN)
 */
async function fetchHRVData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000,
    };

    AppleHealthKit.getHeartRateVariabilitySamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] HRV error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} HRV samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Fetch resting heart rate data
 */
async function fetchRestingHRData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000,
    };

    AppleHealthKit.getRestingHeartRateSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] Resting HR error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} resting HR samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Fetch step count data
 */
async function fetchStepsData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getDailyStepCountSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] Steps error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} step count samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Fetch active energy burned data
 */
async function fetchActiveCaloriesData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] Active calories error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} active calorie samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Fetch respiratory rate data (sleep only)
 */
async function fetchRespiratoryRateData(AppleHealthKit: any, startDate: Date, endDate: Date): Promise<any[]> {
  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000,
    };

    // Note: Respiratory rate requires watchOS 8+ and is only measured during sleep
    AppleHealthKit.getRespiratoryRateSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('[HEALTHKIT] Respiratory rate error:', err);
        resolve([]);
      } else {
        console.log(`[HEALTHKIT] Fetched ${results.length} respiratory rate samples`);
        resolve(results || []);
      }
    });
  });
}

/**
 * Helper: Merge all data sources into daily summaries
 */
function mergeDailyData(
  sleepSamples: any[],
  hrvSamples: any[],
  rhrSamples: any[],
  stepsSamples: any[],
  caloriesSamples: any[],
  respiratorySamples: any[],
  daysBack: number
): HealthKitDailyData[] {
  const dailyMap: Record<string, HealthKitDailyData> = {};

  // Initialize empty data for each day
  const endDate = new Date();
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    dailyMap[dateStr] = {
      date: dateStr,
      totalSleepHours: null,
      deepSleepHours: null,
      remSleepHours: null,
      coreSleepHours: null,
      awakeTimeMinutes: null,
      restingHeartRate: null,
      avgHRV: null,
      steps: null,
      activeCalories: null,
      respiratoryRate: null,
      wristTemperatureDelta: null,
    };
  }

  // Process sleep data (grouped by date)
  sleepSamples.forEach((sample) => {
    const dateStr = sample.startDate.split('T')[0];
    if (!dailyMap[dateStr]) return;

    const durationHours = (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60 * 60);

    // Sleep stage values from react-native-health
    switch (sample.value) {
      case 'ASLEEP_DEEP':
        dailyMap[dateStr].deepSleepHours = (dailyMap[dateStr].deepSleepHours || 0) + durationHours;
        dailyMap[dateStr].totalSleepHours = (dailyMap[dateStr].totalSleepHours || 0) + durationHours;
        break;
      case 'ASLEEP_REM':
        dailyMap[dateStr].remSleepHours = (dailyMap[dateStr].remSleepHours || 0) + durationHours;
        dailyMap[dateStr].totalSleepHours = (dailyMap[dateStr].totalSleepHours || 0) + durationHours;
        break;
      case 'ASLEEP_CORE':
        dailyMap[dateStr].coreSleepHours = (dailyMap[dateStr].coreSleepHours || 0) + durationHours;
        dailyMap[dateStr].totalSleepHours = (dailyMap[dateStr].totalSleepHours || 0) + durationHours;
        break;
      case 'AWAKE':
        dailyMap[dateStr].awakeTimeMinutes = (dailyMap[dateStr].awakeTimeMinutes || 0) + (durationHours * 60);
        break;
      case 'ASLEEP':
      case 'ASLEEP_UNSPECIFIED':
        // Old data without stages
        dailyMap[dateStr].totalSleepHours = (dailyMap[dateStr].totalSleepHours || 0) + durationHours;
        break;
    }
  });

  // Process HRV data (average per day)
  Object.keys(dailyMap).forEach((dateStr) => {
    const daySamples = hrvSamples.filter(s => s.startDate.split('T')[0] === dateStr);
    if (daySamples.length > 0) {
      const avgHRV = daySamples.reduce((sum, s) => sum + s.value, 0) / daySamples.length;
      dailyMap[dateStr].avgHRV = Math.round(avgHRV);
    }
  });

  // Process resting HR data (average per day)
  Object.keys(dailyMap).forEach((dateStr) => {
    const daySamples = rhrSamples.filter(s => s.startDate.split('T')[0] === dateStr);
    if (daySamples.length > 0) {
      const avgRHR = daySamples.reduce((sum, s) => sum + s.value, 0) / daySamples.length;
      dailyMap[dateStr].restingHeartRate = Math.round(avgRHR);
    }
  });

  // Process steps data (sum per day)
  Object.keys(dailyMap).forEach((dateStr) => {
    const daySamples = stepsSamples.filter(s => s.startDate.split('T')[0] === dateStr);
    if (daySamples.length > 0) {
      const totalSteps = daySamples.reduce((sum, s) => sum + s.value, 0);
      dailyMap[dateStr].steps = Math.round(totalSteps);
    }
  });

  // Process active calories data (sum per day)
  Object.keys(dailyMap).forEach((dateStr) => {
    const daySamples = caloriesSamples.filter(s => s.startDate.split('T')[0] === dateStr);
    if (daySamples.length > 0) {
      const totalCalories = daySamples.reduce((sum, s) => sum + s.value, 0);
      dailyMap[dateStr].activeCalories = Math.round(totalCalories);
    }
  });

  // Process respiratory rate data (average per day)
  Object.keys(dailyMap).forEach((dateStr) => {
    const daySamples = respiratorySamples.filter(s => s.startDate.split('T')[0] === dateStr);
    if (daySamples.length > 0) {
      const avgRespRate = daySamples.reduce((sum, s) => sum + s.value, 0) / daySamples.length;
      dailyMap[dateStr].respiratoryRate = Math.round(avgRespRate * 10) / 10; // 1 decimal
    }
  });

  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Auto-sync: Check if sync is needed and sync in background
 * Called when app loads (similar to Oura auto-sync)
 */
export async function autoSyncHealthKitData(): Promise<{
  syncNeeded: boolean;
  syncTriggered: boolean;
  reason: string;
}> {
  if (Platform.OS !== 'ios') {
    return {
      syncNeeded: false,
      syncTriggered: false,
      reason: 'iOS only',
    };
  }

  try {
    // Check backend to see if sync is needed
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) {
      return {
        syncNeeded: false,
        syncTriggered: false,
        reason: 'Not authenticated',
      };
    }

    const response = await fetch(`${API_URL}/apple-watch/auto-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (result.success && result.data.syncNeeded) {
      // Trigger sync in background
      console.log('[HEALTHKIT] Auto-sync triggered');
      syncHealthKitData().catch(err =>
        console.error('[HEALTHKIT] Auto-sync failed:', err)
      );

      return {
        syncNeeded: true,
        syncTriggered: true,
        reason: 'Background sync started',
      };
    }

    return {
      syncNeeded: false,
      syncTriggered: false,
      reason: result.data.reason || 'Data is fresh',
    };
  } catch (error: any) {
    console.error('[HEALTHKIT] Auto-sync check error:', error);
    return {
      syncNeeded: false,
      syncTriggered: false,
      reason: 'Error checking sync status',
    };
  }
}

/**
 * Get Apple Watch connection status and 7-day summary
 */
export async function getAppleWatchStatus(): Promise<AppleWatchStatus> {
  const token = await SecureStore.getItemAsync('auth_token');

  if (!token) {
    return { connected: false };
  }

  const response = await fetch(`${API_URL}/apple-watch/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    console.warn('[HEALTHKIT] Token expired, returning not connected');
    return { connected: false };
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to check Apple Watch status');
  }

  return data.data;
}

/**
 * Get 7-day Apple Watch metrics summary
 */
export async function getAppleWatchSummary(): Promise<AppleWatchWeekSummary | null> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/apple-watch/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to get Apple Watch summary');
  }

  return data.data;
}

/**
 * Disconnect Apple Watch
 */
export async function disconnectAppleWatch(): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/apple-watch/disconnect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to disconnect Apple Watch');
  }
}

console.log('[HEALTHKIT_API] Service initialized');
