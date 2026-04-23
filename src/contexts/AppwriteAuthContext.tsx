import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Models } from 'appwrite';
import { appwriteAccount, appwriteConfig, ID, OAuthProvider } from '@/lib/appwrite';

const AUTH_CALLBACK_MARKER = 'google';
const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

type GoogleOAuthIntent = 'login' | 'link';

interface AppwriteAuthContextType {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => void;
  connectGoogleIdentity: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppwriteAuthContext = createContext<AppwriteAuthContextType | undefined>(undefined);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function getGoogleAuthCallbackUrl(intent: GoogleOAuthIntent, result: 'success' | 'failure') {
  const url = new URL('/', window.location.origin);
  url.searchParams.set('auth_callback', AUTH_CALLBACK_MARKER);
  url.searchParams.set('intent', intent);
  url.searchParams.set('result', result);
  return url.toString();
}

export function AppwriteAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(appwriteConfig.isConfigured);

  const refreshUser = useCallback(async () => {
    if (!appwriteConfig.isConfigured) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await appwriteAccount.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    if (!appwriteConfig.isConfigured) {
      throw new Error('Appwrite is not configured. Add VITE_APPWRITE_PROJECT_ID to your .env file.');
    }

    await appwriteAccount.createEmailPasswordSession({ email, password });
    await refreshUser();
  }, [refreshUser]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    if (!appwriteConfig.isConfigured) {
      throw new Error('Appwrite is not configured. Add VITE_APPWRITE_PROJECT_ID to your .env file.');
    }

    await appwriteAccount.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });
    await login(email, password);
  }, [login]);

  const beginGoogleOAuth = useCallback((intent: GoogleOAuthIntent) => {
    if (!appwriteConfig.isConfigured) {
      throw new Error('Appwrite is not configured. Add VITE_APPWRITE_PROJECT_ID to your .env file.');
    }

    appwriteAccount.createOAuth2Token({
      provider: OAuthProvider.Google,
      success: getGoogleAuthCallbackUrl(intent, 'success'),
      failure: getGoogleAuthCallbackUrl(intent, 'failure'),
      scopes: GOOGLE_OAUTH_SCOPES,
    });
  }, []);

  const loginWithGoogle = useCallback(() => {
    beginGoogleOAuth('login');
  }, [beginGoogleOAuth]);

  const connectGoogleIdentity = useCallback(() => {
    beginGoogleOAuth('link');
  }, [beginGoogleOAuth]);

  const logout = useCallback(async () => {
    if (!appwriteConfig.isConfigured) {
      setUser(null);
      return;
    }

    try {
      await appwriteAccount.deleteSession({ sessionId: 'current' });
    } catch (error) {
      const message = getErrorMessage(error);
      if (!message.toLowerCase().includes('missing scope')) {
        throw error;
      }
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AppwriteAuthContextType>(
    () => ({
      user,
      isLoading,
      isConfigured: appwriteConfig.isConfigured,
      login,
      signup,
      loginWithGoogle,
      connectGoogleIdentity,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, signup, loginWithGoogle, connectGoogleIdentity, logout, refreshUser]
  );

  return <AppwriteAuthContext.Provider value={value}>{children}</AppwriteAuthContext.Provider>;
}

export function useAppwriteAuth() {
  const context = useContext(AppwriteAuthContext);
  if (!context) {
    throw new Error('useAppwriteAuth must be used within AppwriteAuthProvider');
  }
  return context;
}
