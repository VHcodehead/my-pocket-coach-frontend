// Root layout for Expo Router
import { Stack, ErrorBoundary as ExpoErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
// theme is accessed via ThemeContext - no static import needed
import { UserProvider } from '../src/contexts/UserContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

// Export ErrorBoundary for expo-router to use
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{error.message}</Text>
      <TouchableOpacity style={errorStyles.button} onPress={retry}>
        <Text style={errorStyles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#0a0a0a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  message: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#00d4ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#000', fontWeight: 'bold' },
});

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
