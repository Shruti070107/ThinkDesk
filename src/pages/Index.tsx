import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { AppwriteAuthProvider, useAppwriteAuth } from '@/contexts/AppwriteAuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function AppwriteGate() {
  const { user, isLoading, isConfigured, login, signup, loginWithGoogle } = useAppwriteAuth();

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

const Index = () => {
  return (
    <ThemeProvider>
      <AppwriteAuthProvider>
        <AppwriteGate />
      </AppwriteAuthProvider>
    </ThemeProvider>
  );
};

export default Index;
