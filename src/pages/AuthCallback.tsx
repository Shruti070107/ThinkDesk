import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { appwriteAccount } from '@/lib/appwrite';
import { useAppwriteAuth } from '@/contexts/AppwriteAuthContext';

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAppwriteAuth();
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  useEffect(() => {
    let isCancelled = false;

    const finishGoogleAuth = async () => {
      const intent = params.get('intent') || 'login';
      const result = params.get('result');
      const userId = params.get('userId');
      const secret = params.get('secret');
      const errorDescription = params.get('error_description') || params.get('error');

      if (result === 'failure' || errorDescription) {
        const message = errorDescription || 'Google sign-in was cancelled.';
        if (!isCancelled) {
          setError(message);
          toast.error(message);
        }
        return;
      }

      try {
        if (userId && secret) {
          await appwriteAccount.createSession({ userId, secret });
        }

        let isAuthenticated = false;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          try {
            await appwriteAccount.get();
            isAuthenticated = true;
            break;
          } catch {
            await wait((attempt + 1) * 400);
          }
        }

        if (!isAuthenticated) {
          throw new Error('We could not finish the Google sign-in handshake. Please try again.');
        }

        await refreshUser();

        if (isCancelled) {
          return;
        }

        toast.success(
          intent === 'link'
            ? 'Google account connected. Gmail sync is ready.'
            : 'Signed in with Google.'
        );
        navigate('/', { replace: true });
      } catch (callbackError) {
        const message =
          callbackError instanceof Error
            ? callbackError.message
            : 'Google sign-in failed. Please try again.';

        if (!isCancelled) {
          setError(message);
          toast.error(message);
        }
      }
    };

    finishGoogleAuth();

    return () => {
      isCancelled = true;
    };
  }, [navigate, params, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md border-border/60 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {error ? <AlertCircle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin" />}
            {error ? 'Google Sign-In Failed' : 'Finishing Google Sign-In'}
          </CardTitle>
          <CardDescription>
            {error
              ? 'The Google redirect completed, but ThinkDesk could not finish the Appwrite session.'
              : 'Please wait while we complete your Appwrite session and load your workspace.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {error ? (
            <>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/', { replace: true })} className="w-full">
                Return to ThinkDesk
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This extra step makes Google login more reliable on mobile browsers before we send you to the dashboard.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
