// Auth layout
import { Stack } from 'expo-router';
import { theme } from '../../src/theme';

// Re-export ErrorBoundary from expo-router to fix undefined error
export { ErrorBoundary } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
