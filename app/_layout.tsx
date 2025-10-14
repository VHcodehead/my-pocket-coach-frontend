// Root layout for Expo Router
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { theme } from '../src/theme';
import { UserProvider } from '../src/contexts/UserContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
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

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}
