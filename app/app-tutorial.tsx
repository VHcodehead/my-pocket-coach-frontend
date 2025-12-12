// Interactive App Tutorial - Shows after first signup
import { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useTheme } from '../src/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface Slide {
  key: string;
  title: string;
  text: string;
  icon: string;
  backgroundColor: string;
}

const slides: Slide[] = [
  {
    key: '1',
    title: 'Welcome to My Pocket Coach! 🎉',
    text: 'Your complete fitness and nutrition platform that adapts to YOU. Let\'s explore what makes this app different.',
    icon: '💪',
    backgroundColor: '#4A90D9',
  },
  {
    key: '2',
    title: 'Home: Your Command Center 🏠',
    text: 'Real-time macro tracking with progress bars, daily streak calendar, motivational quotes, and quick-log shortcuts. Everything you need at a glance.',
    icon: '📊',
    backgroundColor: '#6C63FF',
  },
  {
    key: '3',
    title: 'Nutrition: Complete Meal Management 🍎',
    text: 'View your custom meal plan curated to your macros, log food manually, scan barcodes, or snap a photo. Access 4,500+ restaurant items and 800k+ whole foods database. Track daily totals and meal-by-meal breakdown.',
    icon: '🍽️',
    backgroundColor: '#FF6B6B',
  },
  {
    key: '4',
    title: 'Photo Meal Logging 📸',
    text: 'Take a photo of any meal and get instant macro estimates. Works for home-cooked meals, restaurant dishes, and even complex plates. No more manual searching or guessing.',
    icon: '📷',
    backgroundColor: '#4ECDC4',
  },
  {
    key: '5',
    title: 'Training: Evidence-Based Programs 🏋️',
    text: 'Generate custom training programs based on your experience level, equipment access, time availability, and injury history. Programs adapt as you progress.',
    icon: '💪',
    backgroundColor: '#95E1D3',
  },
  {
    key: '6',
    title: 'Workout Tracking & Progressive Overload ✅',
    text: 'Log every set with weight and reps. The app automatically suggests progressive overload based on your performance history, ensuring continuous strength and muscle gains.',
    icon: '📝',
    backgroundColor: '#F38181',
  },
  {
    key: '7',
    title: 'Coach Chat: Expert Guidance 🤖',
    text: 'Get instant answers to nutrition questions, form checks, meal ideas, and workout modifications. The coach knows your profile, goals, and progress history.',
    icon: '💬',
    backgroundColor: '#AA96DA',
  },
  {
    key: '8',
    title: 'Apple Watch & Oura Integration ⌚',
    text: 'Sync sleep quality, HRV, resting heart rate, steps, and workout data from Apple Watch or Oura Ring. Your coach uses this biometric data to optimize recovery recommendations.',
    icon: '📱',
    backgroundColor: '#FCBAD3',
  },
  {
    key: '9',
    title: 'Progress Tracking & Analytics 📈',
    text: 'Weekly progress photos with side-by-side comparisons, body measurements, weight trend graphs, and milestone celebrations. Visualize your transformation over time.',
    icon: '📸',
    backgroundColor: '#FFA726', // Changed from light yellow to orange for better contrast
  },
  {
    key: '10',
    title: 'Adaptive Weekly Check-ins ✨',
    text: 'Complete weekly check-ins with progress photos and feedback. The system automatically adjusts your nutrition macros AND training volume based on your rate of progress, timeline goals, and biometric data to keep you on track - safely.',
    icon: '📋',
    backgroundColor: '#A8E6CF',
  },
  {
    key: '11',
    title: 'Intelligent Adaptation System 🧠',
    text: 'The app monitors your training performance, body composition changes, sleep quality, and recovery metrics. It makes data-driven adjustments to both nutrition and training to optimize results while preventing burnout.',
    icon: '🎯',
    backgroundColor: '#9B59B6',
  },
  {
    key: '12',
    title: 'You\'re All Set! 🚀',
    text: 'Start by viewing your meal plan, logging your first meal, or exploring your training program. The app learns and adapts as you use it!',
    icon: '✨',
    backgroundColor: '#4A90D9',
  },
];

export default function AppTutorial() {
  const router = useRouter();
  const { theme } = useTheme();
  const [showSkipButton, setShowSkipButton] = useState(true);

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <Text style={styles.icon}>{item.icon}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>
      </View>
    );
  };

  const onDone = async () => {
    // Mark tutorial as completed
    await AsyncStorage.setItem('tutorial_completed', 'true');
    router.replace('/(tabs)');
  };

  const onSkip = async () => {
    // Mark tutorial as completed (skipped)
    await AsyncStorage.setItem('tutorial_completed', 'true');
    router.replace('/(tabs)');
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Text style={styles.buttonText}>→</Text>
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Get Started!</Text>
      </View>
    );
  };

  const renderSkipButton = () => {
    if (!showSkipButton) return null;

    return (
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <AppIntroSlider
        data={slides}
        renderItem={renderSlide}
        onDone={onDone}
        renderNextButton={renderNextButton}
        renderDoneButton={renderDoneButton}
        showSkipButton={showSkipButton}
        renderSkipButton={renderSkipButton}
        activeDotStyle={styles.activeDot}
        dotStyle={styles.dot}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  icon: {
    fontSize: 120,
    marginBottom: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  text: {
    fontSize: theme.fontSize.lg,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xxl,
    lineHeight: 28,
  },
  buttonCircle: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, .3)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.bold,
  },
  doneButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
  },
  doneButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  skipButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    color: '#FFFFFF',
    fontWeight: theme.fontWeight.semibold,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, .3)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
