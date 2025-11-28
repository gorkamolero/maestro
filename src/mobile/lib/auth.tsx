import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string | null;
  token: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEYS = {
  DEVICE_ID: 'maestro_device_id',
  SECRET: 'maestro_secret',
  TOKEN: 'maestro_token',
  TOKEN_EXPIRES: 'maestro_token_expires',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
  
    // Refresh token using challenge-response
    const refreshTokenInternal = async (devId: string, secret: string) => {
      // Get challenge
      const { nonce } = await api.post<{ nonce: string }>('/auth/challenge', { deviceId: devId });
      
      // Sign: sha256(secret + "\n" + deviceId + "\n" + nonce)
      const message = `${secret}\n${devId}\n${nonce}`;
      const signature = await sha256(message);
      
      // Exchange for token
      const { token: newToken, expiresAt } = await api.post<{ token: string; expiresAt: string }>(
        '/auth/token',
        { deviceId: devId, nonce, signature }
      );
      
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES, expiresAt);
      setToken(newToken);
      
      return newToken;
    };
  
    // Check for existing credentials on mount
    useEffect(() => {
      const init = async () => {
        const storedDeviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
        const storedSecret = localStorage.getItem(STORAGE_KEYS.SECRET);
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedExpires = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES);
  
        if (storedDeviceId && storedSecret) {
          setDeviceId(storedDeviceId);
          
          // Check if token is still valid
          if (storedToken && storedExpires) {
            const expiresAt = new Date(storedExpires).getTime();
            if (Date.now() < expiresAt - 60_000) { // 1 min buffer
              setToken(storedToken);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
          
          // Try to refresh token
          try {
            await refreshTokenInternal(storedDeviceId, storedSecret);
            setIsAuthenticated(true);
          } catch (err) {
            console.error('Token refresh failed:', err);
            // Credentials may be revoked
          }
        }
        
        setIsLoading(false);
      };
      
      init();
    }, []);
  // Login with PIN (pairing)
  const login = useCallback(async (pin: string) => {
    const devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID) || generateDeviceId();
    
    const { secret } = await api.post<{ deviceId: string; secret: string }>( 
      '/auth/pair',
      {
        deviceId: devId,
        pin,
        name: getDeviceName(),
        platform: getPlatform(),
      }
    );
    
    // Store credentials
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    localStorage.setItem(STORAGE_KEYS.SECRET, secret);
    setDeviceId(devId);
    
    // Get initial token
    await refreshTokenInternal(devId, secret);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES);
    // Keep device ID and secret for re-auth
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  const refreshToken = useCallback(async () => {
    const devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    const secret = localStorage.getItem(STORAGE_KEYS.SECRET);
    if (devId && secret) {
      await refreshTokenInternal(devId, secret);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      deviceId,
      token,
      login,
      logout,
      refreshToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helpers
function generateDeviceId(): string {
  return 'mobile-' + crypto.randomUUID();
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  return 'Mobile Device';
}

function getPlatform(): 'ios' | 'android' {
  return /iPhone|iPad/.test(navigator.userAgent) ? 'ios' : 'android';
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
