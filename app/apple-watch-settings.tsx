// Apple Watch Connection Settings
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  requestHealthKitPermissions,
  syncHealthKitData,
  getAppleWatchStatus,
  disconnectAppleWatch,
  AppleWatchStatus,
} from '../src/services/healthKitAPI';

export default function AppleWatchSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<AppleWatchStatus | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      setLoading(true);
      const appleWatchStatus = await getAppleWatchStatus();
      setStatus(appleWatchStatus);
    } catch (error: any) {
      console.error('[APPLE_WATCH_SETTINGS] Failed to load status:', error);
      Alert.alert('Error', 'Failed to load Apple Watch status');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS Only', 'Apple Watch integration is only available on iOS devices.');
      return;
    }

    try {
      setConnecting(true);

      // Request HealthKit permissions
      const granted = await requestHealthKitPermissions();

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Apple Watch integration requires access to your Health data. Please allow access to Activity, Workout, Heart Rate, and Sleep data in the permission prompt.\n\nIf you denied access, enable it in iPhone Settings:\nSettings > Privacy & Security > Health > My Pocket Coach',
          [{ text: 'Got It' }]
        );
        return;
      }

      // Initial sync
      Alert.alert('Syncing...', 'Syncing your Apple Watch data. This may take a moment...');
      const result = await syncHealthKitData(7);

      if (result.success) {
        Alert.alert('Success', `Apple Watch connected! Synced ${result.daysSynced || 0} days of data.`);
        await loadStatus();
      } else {
        throw new Error(result.error || 'Failed to sync data');
      }
    } catch (error: any) {
      console.error('[APPLE_WATCH_SETTINGS] Connection error:', error);
      Alert.alert('Connection Failed', error.message || 'Failed to connect Apple Watch');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Apple Watch?',
      'Your historical data will remain, but new data will not sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectAppleWatch();
              Alert.alert('Disconnected', 'Apple Watch has been disconnected');
              await loadStatus();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to disconnect');
            }
          },
        },
      ]
    );
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await syncHealthKitData(7);

      if (result.success) {
        Alert.alert('Synced', `Synced ${result.daysSynced || 0} days of Apple Watch data`);
        await loadStatus();
      } else {
        throw new Error(result.error || 'Failed to sync data');
      }
    } catch (error: any) {
      console.error('[APPLE_WATCH_SETTINGS] Sync error:', error);
      Alert.alert('Sync Failed', error.message || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Apple Watch</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  // Show iOS-only message on Android
  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Apple Watch</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.iosOnlyContainer}>
          <Text style={styles.iosOnlyEmoji}>⌚</Text>
          <Text style={styles.iosOnlyTitle}>iOS Only</Text>
          <Text style={styles.iosOnlyText}>
            Apple Watch integration requires an iOS device with HealthKit support.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Apple Watch</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, status?.connected ? styles.connectedDot : styles.disconnectedDot]} />
            <Text style={styles.statusText}>
              {status?.connected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>

        {/* Metrics Summary (if connected) */}
        {status?.connected && status.weekSummary?.dataAvailable && (
          <View style={styles.metricsCard}>
            <Text style={styles.sectionTitle}>7-Day Average</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{status.weekSummary.avgSleep.toFixed(1)}h</Text>
                <Text style={styles.metricLabel}>Sleep</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{status.weekSummary.avgReadiness}</Text>
                <Text style={styles.metricLabel}>Readiness</Text>
              </View>
              {status.weekSummary.avgHRV && (
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>{status.weekSummary.avgHRV}ms</Text>
                  <Text style={styles.metricLabel}>HRV</Text>
                </View>
              )}
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{Math.round(status.weekSummary.avgSteps)}</Text>
                <Text style={styles.metricLabel}>Steps</Text>
              </View>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⌚ Enhanced AI Coaching</Text>
          <Text style={styles.infoText}>
            Connect your Apple Watch to give your AI coach access to your sleep, recovery, and activity data via HealthKit.
          </Text>
          <Text style={styles.infoText} style={{ marginTop: 12 }}>
            This enables smarter adjustments based on:
          </Text>
          <Text style={styles.bulletText}>• Sleep stages (Deep, REM, Core)</Text>
          <Text style={styles.bulletText}>• Heart rate variability (HRV)</Text>
          <Text style={styles.bulletText}>• Resting heart rate</Text>
          <Text style={styles.bulletText}>• Daily steps and active calories</Text>
          <Text style={styles.bulletText}>• Respiratory rate (during sleep)</Text>
        </View>

        {/* Hardware Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>📱 Requirements</Text>
          <Text style={styles.requirementsText}>• iOS 16+ for sleep stages</Text>
          <Text style={styles.requirementsText}>• Apple Watch Series 3 or later</Text>
          <Text style={styles.requirementsText}>• watchOS 8+ for respiratory rate</Text>
          <Text style={styles.requirementsText}>• Sleep tracking enabled on Watch</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!status?.connected ? (
            <TouchableOpacity
              style={[styles.primaryButton, connecting && styles.buttonDisabled]}
              onPress={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Connect Apple Watch</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, syncing && styles.buttonDisabled]}
                onPress={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <ActivityIndicator color="#3B82F6" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Sync Data</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton} onPress={handleDisconnect}>
                <Text style={styles.dangerButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iosOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iosOnlyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  iosOnlyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  iosOnlyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#10B981',
  },
  disconnectedDot: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  metricsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 8,
    marginTop: 4,
  },
  requirementsCard: {
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
