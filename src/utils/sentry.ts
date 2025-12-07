// Sentry COMPLETELY REMOVED - @sentry/react-native causes ErrorBoundary undefined crash
// with Expo SDK 54 and expo-router 6.x even when just importing the package
// See: https://github.com/getsentry/sentry-react-native/issues/4341

export function initSentry() {
  console.log('⚠️  Sentry removed - using Toast error handler + Railway logs');
}

// Stub functions that do nothing
export function setBreadcrumb(_category: string, _message: string, _data?: any) {}
export function setUser(_userId: string, _email?: string) {}
export function captureError(_error: Error, _context: { feature: string; action: string; extra?: any }) {}
export function captureMessage(_message: string, _level?: string) {}
export function startTransaction(_name: string, _op: string) { return null; }

// Empty Sentry export for any code that references it
export const Sentry = {
  wrap: (component: any) => component,
  init: () => {},
  captureException: () => {},
  captureMessage: () => {},
  setUser: () => {},
  addBreadcrumb: () => {},
  startTransaction: () => null,
};
