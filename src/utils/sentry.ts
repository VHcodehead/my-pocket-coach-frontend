import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  // PERMANENTLY DISABLED - SentryBaggageSerialization crashes even with network tracking disabled
  // Sentry.wrap() and Sentry.init() both try to intercept network requests
  // Using Toast error handler + Railway logs instead
  console.log('⚠️  Sentry completely disabled - using Toast error handler');
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
