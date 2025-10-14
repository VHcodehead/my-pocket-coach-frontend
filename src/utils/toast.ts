// Toast notification utility - replaces blocking Alert.alert with non-intrusive toasts
import Toast from 'react-native-toast-message';

export const showToast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  },

  error: (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  },

  info: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  },

  // For quick success messages
  quick: (message: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      position: 'top',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 60,
    });
  },
};
