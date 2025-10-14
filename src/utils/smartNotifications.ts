// Smart notification reminders based on user eating patterns
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DailyFoodLog } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface MealReminderTime {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  hour: number;
  minute: number;
  message: string;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export function analyzeEatingPatterns(weekLogs: DailyFoodLog[]): MealReminderTime[] {
  const mealTimes: { [key: string]: number[] } = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };

  // Collect all meal times from the week
  weekLogs.forEach(log => {
    if (!log.entries) return;

    log.entries.forEach(entry => {
      const loggedTime = new Date(entry.logged_at);
      const hour = loggedTime.getHours();
      const minute = loggedTime.getMinutes();
      const timeInMinutes = hour * 60 + minute;

      const mealType = entry.meal_type.toLowerCase();
      if (mealTimes[mealType]) {
        mealTimes[mealType].push(timeInMinutes);
      }
    });
  });

  const reminders: MealReminderTime[] = [];

  // Calculate average time for each meal type
  Object.keys(mealTimes).forEach(mealType => {
    const times = mealTimes[mealType];
    if (times.length === 0) return;

    // Calculate average time
    const avgTimeInMinutes = Math.round(
      times.reduce((sum, time) => sum + time, 0) / times.length
    );

    const hour = Math.floor(avgTimeInMinutes / 60);
    const minute = avgTimeInMinutes % 60;

    const messages = {
      breakfast: "Good morning! 🌅 Ready to log your breakfast?",
      lunch: "Lunch time! 🍽️ What are you eating?",
      dinner: "Dinner time! 🌙 Let's track your evening meal",
      snack: "Snack time! 🍎 Don't forget to log it",
    };

    reminders.push({
      mealType: mealType as any,
      hour,
      minute,
      message: messages[mealType as keyof typeof messages],
    });
  });

  // If no patterns found, use default times
  if (reminders.length === 0) {
    return getDefaultReminderTimes();
  }

  return reminders;
}

export function getDefaultReminderTimes(): MealReminderTime[] {
  return [
    {
      mealType: 'breakfast',
      hour: 8,
      minute: 0,
      message: "Good morning! 🌅 Ready to log your breakfast?",
    },
    {
      mealType: 'lunch',
      hour: 12,
      minute: 30,
      message: "Lunch time! 🍽️ What are you eating?",
    },
    {
      mealType: 'dinner',
      hour: 18,
      minute: 30,
      message: "Dinner time! 🌙 Let's track your evening meal",
    },
  ];
}

export async function scheduleSmartReminders(weekLogs: DailyFoodLog[]): Promise<void> {
  // Cancel all existing notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Check permissions
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.log('[NOTIFICATIONS] Permission not granted');
    return;
  }

  // Analyze eating patterns
  const reminders = analyzeEatingPatterns(weekLogs);

  // Schedule notifications for each meal
  for (const reminder of reminders) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${reminder.mealType.charAt(0).toUpperCase() + reminder.mealType.slice(1)} Reminder`,
        body: reminder.message,
        data: { mealType: reminder.mealType },
      },
      trigger: {
        hour: reminder.hour,
        minute: reminder.minute,
        repeats: true,
      },
    });

    console.log(`[NOTIFICATIONS] Scheduled ${reminder.mealType} at ${reminder.hour}:${String(reminder.minute).padStart(2, '0')}`);
  }
}

export async function scheduleEndOfDayReminder(): Promise<void> {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Schedule reminder at 8 PM if no dinner logged
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Quick Check-In 💙",
      body: "Haven't seen you today! Don't forget to log your meals - consistency is key! 💪",
      data: { type: 'end_of_day_check' },
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    },
  });

  console.log('[NOTIFICATIONS] Scheduled end-of-day reminder at 8:00 PM');
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[NOTIFICATIONS] Cancelled all reminders');
}

export function getUpcomingReminders(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
