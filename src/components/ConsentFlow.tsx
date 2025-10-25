// Consent Flow Manager - Sequential Terms → Privacy acceptance
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { SimpleLegalConsentModal } from './SimpleLegalConsentModal';
import { authAPI } from '../services/api';

interface ConsentFlowProps {
  visible: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

type ConsentStep = 'terms' | 'privacy' | 'complete';

export function ConsentFlow({ visible, onComplete, onCancel }: ConsentFlowProps) {
  const [currentStep, setCurrentStep] = useState<ConsentStep>('terms');
  const [isSaving, setIsSaving] = useState(false);

  const handleTermsAccept = () => {
    console.log('[CONSENT] Terms accepted, moving to Privacy Policy');
    setCurrentStep('privacy');
  };

  const handlePrivacyAccept = async () => {
    console.log('[CONSENT] Privacy Policy accepted, saving to database');
    setIsSaving(true);

    try {
      // Save consent timestamps to database
      const response = await authAPI.saveConsent({
        terms_version: '1.0',
        privacy_version: '1.0',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save consent');
      }

      console.log('[CONSENT] Consent saved successfully');
      setCurrentStep('complete');
      onComplete();
    } catch (error: any) {
      console.error('[CONSENT] Error saving consent:', error);
      Alert.alert(
        'Error',
        'Failed to save your consent. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => handlePrivacyAccept(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Terms Required',
      'You must accept the Terms of Service and Privacy Policy to use Pocket Coach.',
      [
        {
          text: 'Review Again',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: onCancel,
        },
      ]
    );
  };

  if (currentStep === 'complete') {
    return null;
  }

  return (
    <>
      <SimpleLegalConsentModal
        visible={visible && currentStep === 'terms'}
        documentType="terms"
        onAccept={handleTermsAccept}
        onDecline={handleDecline}
      />

      <SimpleLegalConsentModal
        visible={visible && currentStep === 'privacy'}
        documentType="privacy"
        onAccept={handlePrivacyAccept}
        onDecline={handleDecline}
      />
    </>
  );
}
