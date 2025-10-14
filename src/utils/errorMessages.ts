// Humanized error messages - friendly, actionable, empathetic

export const ErrorMessages = {
  // Network/Connection Errors
  networkError: {
    title: "Connection Issue 📡",
    message: "I'm having trouble connecting. Mind checking your internet?",
  },
  timeout: {
    title: "Taking Too Long ⏱️",
    message: "This is taking longer than usual. Want to try again?",
  },
  serverError: {
    title: "Oops! 🤔",
    message: "Something went wrong on our end. Give it another shot?",
  },

  // Authentication Errors
  loginFailed: {
    title: "Login Didn't Work 🔐",
    message: "Double-check your email and password. Still stuck? Let me know!",
  },
  signupFailed: {
    title: "Signup Issue 📝",
    message: "Had trouble creating your account. Try a different email?",
  },
  invalidCredentials: {
    title: "Hmm... 🤔",
    message: "That email and password combo doesn't match. Want to try again?",
  },
  emailExists: {
    title: "Already Have You! 👋",
    message: "Looks like you already have an account. Try logging in instead?",
  },

  // Form Validation
  missingFields: {
    title: "Almost There! ✍️",
    message: "Just need a bit more info to continue.",
  },
  invalidEmail: {
    title: "Email Check 📧",
    message: "That doesn't look like a valid email. Mind double-checking?",
  },
  passwordTooShort: {
    title: "Password Too Short 🔒",
    message: "For security, passwords need at least 6 characters.",
  },
  invalidWeight: {
    title: "Weight Check ⚖️",
    message: "Please enter a valid weight between 50-500 lbs.",
  },
  invalidNumber: {
    title: "Number Issue 🔢",
    message: "That doesn't look like a valid number. Try again?",
  },

  // Food Logging Errors
  foodLogFailed: {
    title: "Logging Issue 🍽️",
    message: "Had trouble saving that meal. Want to try again?",
  },
  deleteFailed: {
    title: "Delete Didn't Work ❌",
    message: "Couldn't remove that item. Give it another shot?",
  },
  barcodeNotFound: {
    title: "Barcode Not Found 📱",
    message: "Couldn't find that item in our database. Try manual entry instead?",
  },
  scannerError: {
    title: "Scanner Issue 📸",
    message: "Camera isn't working. Check app permissions?",
  },

  // Photo Errors
  photoUploadFailed: {
    title: "Upload Issue 📸",
    message: "Had trouble saving your photo. Want to try again?",
  },
  cameraPermission: {
    title: "Camera Access Needed 📷",
    message: "I need camera permission to take photos. Enable it in settings?",
  },
  photoLibraryPermission: {
    title: "Photo Access Needed 🖼️",
    message: "Need access to your photos. Mind enabling it in settings?",
  },

  // Data Loading Errors
  loadFailed: {
    title: "Loading Issue 📊",
    message: "Couldn't load your data. Check your connection and try again?",
  },
  noData: {
    title: "No Data Yet 📭",
    message: "Nothing here yet! Start logging to see your progress.",
  },

  // Profile/Settings Errors
  updateFailed: {
    title: "Update Issue ⚙️",
    message: "Couldn't save your changes. Try again?",
  },
  notLoggedIn: {
    title: "Not Logged In 🔓",
    message: "Need to log in first. Head to the login screen?",
  },

  // Generic Fallback
  generic: {
    title: "Something Went Wrong 🤷",
    message: "Not sure what happened there. Mind trying again?",
  },
};

// Helper function to get user-friendly error message from error object
export function getUserFriendlyError(error: any): { title: string; message: string } {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code;

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return ErrorMessages.networkError;
  }
  if (errorMessage.includes('timeout')) {
    return ErrorMessages.timeout;
  }
  if (errorCode === 500 || errorMessage.includes('server')) {
    return ErrorMessages.serverError;
  }

  // Auth errors
  if (errorMessage.includes('invalid credentials') || errorMessage.includes('password')) {
    return ErrorMessages.invalidCredentials;
  }
  if (errorMessage.includes('email already') || errorMessage.includes('user exists')) {
    return ErrorMessages.emailExists;
  }
  if (errorCode === 401) {
    return ErrorMessages.invalidCredentials;
  }

  // Camera/Photo errors
  if (errorMessage.includes('camera') || errorMessage.includes('permission')) {
    return ErrorMessages.cameraPermission;
  }

  // Default
  return ErrorMessages.generic;
}

// Success messages (for consistency)
export const SuccessMessages = {
  mealLogged: {
    title: "Logged! 🎉",
    message: "Great job staying consistent!",
  },
  profileUpdated: {
    title: "Updated! ✅",
    message: "I've got your latest info. Let's keep crushing those goals!",
  },
  photoSaved: {
    title: "Photo Saved! 📸",
    message: "Your progress is being captured. Keep it up!",
  },
  mealDeleted: {
    title: "Removed! ✓",
    message: "Entry deleted successfully.",
  },
};
