// Environment configuration for dev and production
import Constants from 'expo-constants';

const ENV = {
  dev: {
    // Development uses local .env file or defaults
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://my-pocket-coach-backend-production.up.railway.app',
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tomoqkmbozuxpdqfrsrf.supabase.co',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  prod: {
    // Production reads from environment variables set in eas.json
    API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://my-pocket-coach-backend-production.up.railway.app',
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tomoqkmbozuxpdqfrsrf.supabase.co',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  },
};

// Determine environment based on __DEV__ flag
const getEnvVars = () => {
  if (__DEV__) {
    console.log('[CONFIG] Running in development mode');
    return ENV.dev;
  }
  console.log('[CONFIG] Running in production mode');
  return ENV.prod;
};

export default getEnvVars();

// Debug logging
console.log('[CONFIG] API_URL:', getEnvVars().API_URL);
console.log('[CONFIG] SUPABASE_URL:', getEnvVars().SUPABASE_URL);
