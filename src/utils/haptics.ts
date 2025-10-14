// Haptic feedback utility - adds satisfying vibrations on key actions
import * as Haptics from 'expo-haptics';

export const haptic = {
  // Light tap - for button presses, toggles
  light: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Medium impact - for important actions like logging food
  medium: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Heavy impact - for major actions like completing a goal
  heavy: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Success - for positive actions (saved, completed, achieved)
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  // Warning - for caution actions (are you sure?)
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  // Error - for failures
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Selection changed - for pickers, sliders
  selection: () => {
    Haptics.selectionAsync();
  },
};
