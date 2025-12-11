// Root layout for Expo Router
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
// theme is accessed via ThemeContext - no static import needed
import { UserProvider } from '../src/contexts/UserContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

// Global error handler with Toast (safe, won't crash like Alert.alert)
(global as any).ErrorUtils?.setGlobalHandler?.((error: Error, isFatal: boolean) => {
  console.error('🔴 GLOBAL ERROR CAUGHT:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    isFatal,
  });

  // Show error via Toast (won't crash iOS like Alert does)
  setTimeout(() => {
    Toast.show({
      type: 'error',
      text1: '🔴 ERROR',
      text2: error.message || 'Unknown error',
      visibilityTime: 15000,
      position: 'top',
    });
  }, 100);

  // Don't re-throw - let app continue
});

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

// Sentry completely disabled - Sentry.wrap() was re-enabling network tracking
export default RootLayout;
