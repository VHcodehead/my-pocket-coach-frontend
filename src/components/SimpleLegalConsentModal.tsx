// Simplified Legal Consent Modal - Text-based (no WebView issues)
import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '../theme';
import { FULL_TERMS_TEXT, FULL_PRIVACY_TEXT } from './FullLegalText';

interface SimpleLegalConsentModalProps {
  visible: boolean;
  documentType: 'terms' | 'privacy';
  onAccept: () => void;
  onDecline?: () => void;
}

const DOCUMENT_TITLES = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

const DOCUMENT_TEXT = {
  terms: FULL_TERMS_TEXT,
  privacy: FULL_PRIVACY_TEXT,
};

export function SimpleLegalConsentModal({
  visible,
  documentType,
  onAccept,
  onDecline,
}: SimpleLegalConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Check if scrolled to within 20px of bottom
    const paddingToBottom = 20;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isAtBottom && !hasScrolledToBottom) {
      console.log('[CONSENT] User scrolled to bottom');
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDecline}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {DOCUMENT_TITLES[documentType]}
          </Text>
          <Text style={styles.headerSubtitle}>
            Please read carefully and scroll to the bottom to continue
          </Text>
        </View>

        {/* Full Legal Document */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.textContent}>
            <Text style={styles.documentText}>{DOCUMENT_TEXT[documentType]}</Text>
          </View>
        </ScrollView>

        {/* Scroll Indicator */}
        {!hasScrolledToBottom && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>
              ↓ Scroll to bottom to continue ↓
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {onDecline && (
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
              !hasScrolledToBottom && styles.buttonDisabled,
            ]}
            onPress={onAccept}
            disabled={!hasScrolledToBottom}
          >
            <Text
              style={[
                styles.acceptButtonText,
                !hasScrolledToBottom && styles.buttonTextDisabled,
              ]}
            >
              I Agree
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  textContent: {
    padding: theme.spacing.lg,
  },
  documentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  scrollIndicator: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primary + '20',
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary,
    alignItems: 'center',
  },
  scrollIndicatorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.semibold,
  },
  button: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  declineButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.neon,
  },
  acceptButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
