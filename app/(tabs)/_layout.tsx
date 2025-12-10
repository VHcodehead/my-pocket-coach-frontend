// Tabs layout - Futuristic design
import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { theme } from '../../src/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import SVG icons
import HomeIcon from '../../assets/icons/home-icon.svg';
import NutritionIcon from '../../assets/icons/nutrition-icon.svg';
import CoachIcon from '../../assets/icons/coach-icon.svg';
import TrainingIcon from '../../assets/icons/training-icon.svg';
import MeIcon from '../../assets/icons/me-icon.svg';

// Re-export ErrorBoundary from expo-router to fix undefined error
export { ErrorBoundary } from 'expo-router';

export default function TabsLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    try {
      const tutorialCompleted = await AsyncStorage.getItem('tutorial_completed');

      // If tutorial not completed, redirect to tutorial
      if (!tutorialCompleted) {
        router.replace('/app-tutorial');
      }
    } catch (error) {
      console.error('[TABS] Error checking tutorial status:', error);
    } finally {
      setIsReady(true);
    }
  };

  // Show loading while checking tutorial status
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.primary + '40',
          borderTopWidth: 2,
          height: 85,
          paddingBottom: 28,
          paddingTop: 8,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 20,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <HomeIcon
              width={focused ? 26 : 22}
              height={focused ? 26 : 22}
              fill={focused ? theme.colors.primary : theme.colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarLabel: 'Nutrition',
          tabBarIcon: ({ focused }) => (
            <NutritionIcon
              width={focused ? 26 : 22}
              height={focused ? 26 : 22}
              fill={focused ? theme.colors.primary : theme.colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: 'Coach',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ focused }) => (
            <CoachIcon
              width={focused ? 26 : 22}
              height={focused ? 26 : 22}
              fill={focused ? theme.colors.primary : theme.colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarLabel: 'Train',
          tabBarIcon: ({ focused }) => (
            <TrainingIcon
              width={focused ? 26 : 22}
              height={focused ? 26 : 22}
              fill={focused ? theme.colors.primary : theme.colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarLabel: 'Me',
          tabBarIcon: ({ focused }) => (
            <MeIcon
              width={focused ? 26 : 22}
              height={focused ? 26 : 22}
              fill={focused ? theme.colors.primary : theme.colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 22,
  },
  iconActive: {
    fontSize: 26,
    textShadowColor: theme.colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
