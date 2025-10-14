// DeloadModal - Deload week recommendation modal
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';

interface DeloadModalProps {
  visible: boolean;
  deloadId: number;
  reason: string;
  fatigueIndicators?: {
    consecutiveFailedSets?: number;
    avgRpe?: number;
    volumeIncrease?: number;
    weeksWithoutDeload?: number;
  };
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export default function DeloadModal({
  visible,
  deloadId,
  reason,
  fatigueIndicators,
  onAccept,
  onDecline,
  onClose,
}: DeloadModalProps) {
  const handleAccept = () => {
    onAccept();
    onClose();
  };

  const handleDecline = () => {
    onDecline();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.icon}>⚠️</Text>
              <Text style={styles.title}>Deload Week Recommended</Text>
            </View>

            {/* Main Reason */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why now?</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>

            {/* Fatigue Indicators */}
            {fatigueIndicators && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Fatigue Indicators</Text>
                <View style={styles.indicatorsContainer}>
                  {fatigueIndicators.consecutiveFailedSets !== undefined && (
                    <View style={styles.indicatorRow}>
                      <Text style={styles.indicatorLabel}>Failed sets:</Text>
                      <Text style={styles.indicatorValue}>
                        {fatigueIndicators.consecutiveFailedSets} in a row
                      </Text>
                    </View>
                  )}
                  {fatigueIndicators.avgRpe !== undefined && (
                    <View style={styles.indicatorRow}>
                      <Text style={styles.indicatorLabel}>Average RPE:</Text>
                      <Text style={styles.indicatorValue}>
                        {fatigueIndicators.avgRpe}/10 (high)
                      </Text>
                    </View>
                  )}
                  {fatigueIndicators.volumeIncrease !== undefined && (
                    <View style={styles.indicatorRow}>
                      <Text style={styles.indicatorLabel}>Volume increase:</Text>
                      <Text style={styles.indicatorValue}>
                        +{fatigueIndicators.volumeIncrease}% this week
                      </Text>
                    </View>
                  )}
                  {fatigueIndicators.weeksWithoutDeload !== undefined && (
                    <View style={styles.indicatorRow}>
                      <Text style={styles.indicatorLabel}>Time since deload:</Text>
                      <Text style={styles.indicatorValue}>
                        {fatigueIndicators.weeksWithoutDeload} weeks
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Benefits Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Benefits of Deloading</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Reduces accumulated fatigue and prevents overtraining
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Allows muscles and nervous system to fully recover
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Improves performance in the following training weeks
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitBullet}>•</Text>
                  <Text style={styles.benefitText}>
                    Reduces injury risk and joint stress
                  </Text>
                </View>
              </View>
            </View>

            {/* What Happens */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔄 What Happens Next?</Text>
              <Text style={styles.infoText}>
                Your next week's workouts will be adjusted to 50-60% of your usual
                volume and intensity. You'll maintain the same exercises but with
                lighter weights and fewer sets. This strategic reduction allows your
                body to supercompensate, leading to better gains.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAccept}
              >
                <Text style={styles.acceptButtonText}>
                  ✓ Accept Deload Week
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.declineButton}
                onPress={handleDecline}
              >
                <Text style={styles.declineButtonText}>
                  Continue Current Program
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Decide Later</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    ...theme.shadows.lg,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  reasonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
  },
  indicatorsContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  indicatorLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  indicatorValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  benefitsList: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  benefitBullet: {
    fontSize: theme.fontSize.md,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
    fontWeight: theme.fontWeight.bold,
  },
  benefitText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  infoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 22,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  actionsContainer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#FFFFFF',
  },
  declineButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  declineButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});
