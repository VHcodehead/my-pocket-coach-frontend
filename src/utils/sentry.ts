import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

export function initSentry() {
  if (__DEV__) {
    console.log('⚠️  Sentry disabled in development');
    return;
  }

  if (!SENTRY_DSN) {
    console.error('❌ SENTRY_DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',

    // DISABLE network tracking - it was causing SentryBaggageSerialization crashes
    enableAutoSessionTracking: false,
    enableAppHangTracking: false,
    integrations: [],

    // Only capture errors, no performance/network tracking
    tracesSampleRate: 0,

    beforeSend(event) {
      // Minimal processing
      return event;
    },

    ignoreErrors: [
      /Network request failed/i,
      /timeout/i,
    ],
  });

  console.log('✅ Sentry initialized (errors only, no network tracking)');
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
