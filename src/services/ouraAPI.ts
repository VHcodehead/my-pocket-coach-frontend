// Oura Ring API Service
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import config from '../config';

const API_URL = config.API_URL;

export interface OuraWeekSummary {
  avgSleep: number;
  avgReadiness: number;
  avgHRV: number | null;
  avgSteps: number;
  avgRestingHR: number | null;
  dataAvailable: boolean;
}

export interface OuraStatus {
  connected: boolean;
  weekSummary?: OuraWeekSummary | null;
}

/**
 * Get Oura authorization URL from backend
 */
export async function getOuraAuthUrl(): Promise<string> {
  const token = await SecureStore.getItemAsync('auth_token');

  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const response = await fetch(`${API_URL}/oura/auth-url`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    throw new Error('Session expired. Please log out and log in again.');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to get auth URL');
  }

  return data.data.authUrl;
}

/**
 * Open Oura OAuth flow in browser
 * Returns the authorization code via deep link
 */
export async function connectOuraRing(): Promise<void> {
  try {
    console.log('[OURA] Starting OAuth flow...');

    // Get auth URL from backend
    const authUrl = await getOuraAuthUrl();
    console.log('[OURA] Auth URL:', authUrl);

    // Open in browser
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      Linking.createURL('/oura/callback')
    );

    console.log('[OURA] WebBrowser result:', result);

    if (result.type === 'success' && result.url) {
      // Extract code from URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      console.log('[OURA] Got auth code, exchanging for token...');

      // Exchange code for access token
      await exchangeOuraCode(code);

      console.log('[OURA] ✅ Connected successfully');
    } else {
      throw new Error('OAuth flow cancelled or failed');
    }
  } catch (error: any) {
    console.error('[OURA] Connection error:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeOuraCode(code: string): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/oura/connect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to connect Oura Ring');
  }
}

/**
 * Check Oura connection status and get metrics
 */
export async function getOuraStatus(): Promise<OuraStatus> {
  const token = await SecureStore.getItemAsync('auth_token');

  if (!token) {
    return { connected: false };
  }

  const response = await fetch(`${API_URL}/oura/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    console.warn('[OURA_API] Token expired, returning not connected');
    return { connected: false };
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to check Oura status');
  }

  return data.data;
}

/**
 * Get 7-day Oura metrics summary
 */
export async function getOuraSummary(): Promise<OuraWeekSummary | null> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/oura/summary`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to get Oura summary');
  }

  return data.data;
}

/**
 * Manually trigger Oura data sync
 */
export async function syncOuraData(daysBack: number = 7): Promise<{ daysSynced: number }> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/oura/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ daysBack }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to sync Oura data');
  }

  return data.data;
}

/**
 * Disconnect Oura Ring
 */
export async function disconnectOuraRing(): Promise<void> {
  const token = await SecureStore.getItemAsync('auth_token');

  const response = await fetch(`${API_URL}/oura/disconnect`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to disconnect Oura Ring');
  }
}

console.log('[OURA_API] Service initialized');
