// Tabs layout - Futuristic design
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.primary + '40',
          borderTopWidth: 2,
          height: 70,
          paddingBottom: 12,
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
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="food-log"
        options={{
          title: 'Food Log',
          tabBarLabel: 'Log',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Meal Plan',
          tabBarLabel: 'Plan',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>🍽️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'Training',
          tabBarLabel: 'Train',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>💪</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: '24/7 Coach Chat',
          tabBarLabel: 'Coach',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.icon, focused && styles.iconActive]}>👤</Text>
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
