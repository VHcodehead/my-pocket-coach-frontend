// Quick script to get your auth token
// Run this in your app or check secure store

import * as SecureStore from 'expo-secure-store';

async function getToken() {
  const token = await SecureStore.getItemAsync('auth_token');
  console.log('\n=================================');
  console.log('YOUR AUTH TOKEN:');
  console.log(token);
  console.log('=================================\n');
  return token;
}

// If you want to use this in a component:
// Add this to any screen's useEffect:
/*
useEffect(() => {
  SecureStore.getItemAsync('auth_token').then(token => {
    console.log('AUTH TOKEN:', token);
  });
}, []);
*/
