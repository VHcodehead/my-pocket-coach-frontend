// Supabase client configuration
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import config from '../config';

console.log('[SUPABASE] Initializing client with URL:', config.SUPABASE_URL);

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// Custom storage adapter using expo-secure-store
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// OAuth helper functions
export const signInWithGoogle = async () => {
  try {
    console.log('[SUPABASE] Starting Google OAuth flow');

    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'mypocketcoach',
      path: 'auth/callback',
    });

    console.log('[SUPABASE] Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;

    // Open the OAuth URL in browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success') {
        const url = result.url;
        // Extract access token from URL
        const params = new URLSearchParams(url.split('#')[1] || '');
        const accessToken = params.get('access_token');

        if (accessToken) {
          // Exchange Supabase token for backend JWT
          const backendResponse = await fetch(`${config.API_URL}/auth/oauth-callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: accessToken }),
          });

          const backendData = await backendResponse.json();

          if (backendData.success && backendData.data?.token) {
            // Store backend JWT token
            await SecureStore.setItemAsync('auth_token', backendData.data.token);
            console.log('[SUPABASE] Backend JWT stored successfully');
            return { success: true, data: backendData.data };
          } else {
            throw new Error(backendData.error || 'Backend authentication failed');
          }
        }
      }
    }

    return { success: false, error: 'OAuth flow cancelled or failed' };
  } catch (error: any) {
    console.error('[SUPABASE] Google OAuth error:', error);
    return { success: false, error: error.message };
  }
};

export const signInWithApple = async () => {
  try {
    console.log('[SUPABASE] Starting Apple OAuth flow');

    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: 'mypocketcoach',
      path: 'auth/callback',
    });

    console.log('[SUPABASE] Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });

    if (error) throw error;

    // Open the OAuth URL in browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success') {
        const url = result.url;
        // Extract access token from URL
        const params = new URLSearchParams(url.split('#')[1] || '');
        const accessToken = params.get('access_token');

        if (accessToken) {
          // Exchange Supabase token for backend JWT
          const backendResponse = await fetch(`${config.API_URL}/auth/oauth-callback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ access_token: accessToken }),
          });

          const backendData = await backendResponse.json();

          if (backendData.success && backendData.data?.token) {
            // Store backend JWT token
            await SecureStore.setItemAsync('auth_token', backendData.data.token);
            console.log('[SUPABASE] Backend JWT stored successfully');
            return { success: true, data: backendData.data };
          } else {
            throw new Error(backendData.error || 'Backend authentication failed');
          }
        }
      }
    }

    return { success: false, error: 'OAuth flow cancelled or failed' };
  } catch (error: any) {
    console.error('[SUPABASE] Apple OAuth error:', error);
    return { success: false, error: error.message };
  }
};

console.log('[SUPABASE] Client initialized successfully');
