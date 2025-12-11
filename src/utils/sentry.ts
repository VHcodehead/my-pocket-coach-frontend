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

    // Performance monitoring - 100% during TestFlight
    tracesSampleRate: 1.0,

    // Enable auto session tracking
    enableAutoSessionTracking: true,

    // Track app hangs
    enableAppHangTracking: true,

    // Enhanced error context
    beforeSend(event) {
      // Add device info
      event.contexts = event.contexts || {};
      event.contexts.device = {
        ...event.contexts.device,
        battery_level: (global as any).batteryLevel,
        orientation: (global as any).orientation,
      };

      return event;
    },

    // Ignore common noise
    ignoreErrors: [
      /Network request failed/i,
      /timeout/i,
    ],
  });

  console.log('✅ Sentry initialized for frontend');
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
