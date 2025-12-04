import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  // PERMANENTLY DISABLED - Sentry has bugs causing crashes (SentryBaggageSerialization)
  // Using Apple's native crash logs + user feedback instead
  console.log('⚠️  Sentry disabled - using Apple crash logs');
  return;
}

// Helper functions
export function setBreadcrumb(category: string, message: string, data?: any) {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

export function setUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function captureError(error: Error, context: {
  feature: string;
  action: string;
  extra?: any;
}) {
  Sentry.captureException(error, {
    tags: {
      feature: context.feature,
      action: context.action,
    },
    extra: context.extra,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}

export { Sentry };
