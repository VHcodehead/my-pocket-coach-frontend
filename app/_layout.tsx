// Root layout for Expo Router
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
// theme is accessed via ThemeContext - no static import needed
import { UserProvider } from '../src/contexts/UserContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { Alert } from 'react-native';

// CRITICAL: Catch all errors BEFORE they crash
(global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
  console.error('🔴 GLOBAL ERROR CAUGHT:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    isFatal,
  });

  // Show alert so we can see it before crash
  Alert.alert(
    'Error Caught!',
    `${error.name}: ${error.message}\n\nCheck console for stack trace`,
    [{ text: 'OK' }]
  );

  // Re-throw to let Sentry catch it too
  throw error;
});

// Initialize Sentry
import { initSentry, Sentry } from '../src/utils/sentry';
initSentry();

function AppContent() {
  const { isDark, theme: activeTheme } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: activeTheme.colors.background },
          animation: 'slide_from_right',
          gestureEnabled: false, // Disable swipe-back gesture to prevent accidental logout
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast />
    </>
  );
}

function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}

// Wrap with Sentry for error tracking
export default Sentry.wrap(RootLayout);
