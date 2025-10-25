// Legal Consent Modal - Scroll-to-Accept Pattern for Terms & Privacy
import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../theme';

interface LegalConsentModalProps {
  visible: boolean;
  documentType: 'terms' | 'privacy';
  onAccept: () => void;
  onDecline?: () => void;
}

const DOCUMENT_URLS = {
  terms: 'https://integrativeaisolutions.com/terms-of-service.html',
  privacy: 'https://integrativeaisolutions.com/privacy-policy.html',
};

const DOCUMENT_TITLES = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
};

export function LegalConsentModal({
  visible,
  documentType,
  onAccept,
  onDecline,
}: LegalConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Check if scrolled to within 20px of bottom
    const paddingToBottom = 20;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleWebViewLoad = () => {
    console.log('[CONSENT] WebView loaded successfully');
    setIsLoading(false);
  };

  const handleWebViewError = (error: any) => {
    console.error('[CONSENT] WebView load error:', error);
    setIsLoading(false);
  };

  const handleWebViewMessage = (event: any) => {
    const { data } = event.nativeEvent;
    console.log('[CONSENT] WebView message:', data);
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
            Please read and scroll to the bottom to continue
          </Text>
        </View>

        {/* Document Content */}
        <View style={styles.webviewContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          )}

          <WebView
            source={{ uri: DOCUMENT_URLS[documentType] }}
            style={styles.webview}
            onScroll={handleScroll}
            onLoad={handleWebViewLoad}
            onError={handleWebViewError}
            onMessage={handleWebViewMessage}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            originWhitelist={['*']}
            scalesPageToFit={true}
            bounces={false}
            allowsBackForwardNavigationGestures={false}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            cacheEnabled={false}
            incognito={true}
          />
        </View>

        {/* Scroll Indicator */}
        {!hasScrolledToBottom && !isLoading && (
          <View style={styles.scrollIndicator}>
            <Text style={styles.scrollIndicatorText}>
              ↓ Scroll to bottom to continue ↓
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.footer}>
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
  webviewContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
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
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
