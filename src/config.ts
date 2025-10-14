// Environment configuration for dev and production
import Constants from 'expo-constants';

const ENV = {
  dev: {
    // TEMPORARILY USING RAILWAY FOR TESTING
    API_URL: 'https://my-pocket-coach-backend-production.up.railway.app',
    SUPABASE_URL: 'https://tomoqkmbozuxpdqfrsrf.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbW9xa21ib3p1eHBkcWZyc3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzQyNTQsImV4cCI6MjA3NTM1MDI1NH0.wE71MS8tkTcL7YqgD2RDo0MgTdMK8NTfLNLvHFsvo18',
  },
  prod: {
    API_URL: 'https://my-pocket-coach-backend-production.up.railway.app',
    SUPABASE_URL: 'https://tomoqkmbozuxpdqfrsrf.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbW9xa21ib3p1eHBkcWZyc3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzQyNTQsImV4cCI6MjA3NTM1MDI1NH0.wE71MS8tkTcL7YqgD2RDo0MgTdMK8NTfLNLvHFsvo18',
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
