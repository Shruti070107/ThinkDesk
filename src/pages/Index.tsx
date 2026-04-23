import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAppwriteAuth } from '@/contexts/AppwriteAuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { useLocation } from 'react-router-dom';
import AuthCallback from './AuthCallback';

export default function Index() {
  const location = useLocation();
  const { user, isLoading, isConfigured, login, signup, loginWithGoogle } = useAppwriteAuth();
  const searchParams = new URLSearchParams(location.search);
  const isGoogleCallback =
    searchParams.get('auth_callback') === 'google' ||
    searchParams.has('userId') ||
    searchParams.has('secret') ||
    searchParams.has('intent') ||
    searchParams.has('error');

  if (isGoogleCallback) {
    return <AuthCallback />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Connecting to Appwrite...
      </div>
    );
  }

  if (isConfigured && !user) {
    return <AuthPage onLogin={login} onSignup={signup} onGoogleAuth={loginWithGoogle} />;
  }

  return (
    <WorkspaceProvider>
      <WorkspaceLayout />
    </WorkspaceProvider>
  );
}
