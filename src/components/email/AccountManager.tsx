import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Mail,
  Plus,
  RefreshCw,
  Settings,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppwriteAuth } from '@/contexts/AppwriteAuthContext';
import { emailService } from '@/services/emailService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AccountManagerProps {
  accounts: string[];
  activeAccount?: string;
  onChangeAccount: (account: string) => void;
  onAccountsChange: (accounts: string[]) => void;
}

export function AccountManager({
  accounts,
  activeAccount,
  onChangeAccount,
  onAccountsChange,
}: AccountManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const { connectGoogleIdentity } = useAppwriteAuth();

  useEffect(() => {
    emailService
      .getAccounts()
      .then(loadedAccounts => {
        setOauthConfigured(true);
        onAccountsChange(loadedAccounts);
      })
      .catch(() => setOauthConfigured(false));
  }, [onAccountsChange]);

  const handleAddAccount = () => {
    connectGoogleIdentity();
  };

  const handleRefreshAccounts = async () => {
    setIsLoading(true);
    try {
      const loadedAccounts = await emailService.getAccounts();
      onAccountsChange(loadedAccounts);
      toast.success('Accounts refreshed');
    } catch {
      toast.error('Could not load Gmail identities from Appwrite');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase();
  const getColor = (email: string) => {
    const colors = [
      'bg-violet-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    return colors[email.charCodeAt(0) % colors.length];
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Manage your Appwrite-linked Gmail identities.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAccounts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleAddAccount} disabled={oauthConfigured === false}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {oauthConfigured === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Google login is not configured in Appwrite.</strong> Enable the Google
              provider in Appwrite Auth to connect Gmail identities.
            </AlertDescription>
          </Alert>
        )}

        {oauthConfigured === false && (
          <div className="rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Setup Instructions
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                Open the{' '}
                <a
                  href="https://cloud.appwrite.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Appwrite Console
                </a>{' '}
                for this project.
              </li>
              <li>Go to <strong>Auth -&gt; Settings -&gt; Google</strong> and enable the provider.</li>
              <li>
                Make sure the ThinkDesk site domain is allowed and Gmail scopes are enabled for
                Google sign-in.
              </li>
              <li>
                Use <strong>Continue with Google</strong> on the login screen to sign in and
                connect Gmail in one step, or click <strong>Add Account</strong> here to link
                another Gmail identity.
              </li>
            </ol>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`Required in Appwrite:
+ Google provider enabled
+ Gmail scopes granted
+ ThinkDesk domain allowed`}
            </pre>
            <p className="text-xs text-muted-foreground">
              After saving, reload ThinkDesk and sign in with Google. Gmail will be connected
              during the same login flow.
            </p>
          </div>
        )}

        {accounts.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Connected Accounts
            </h2>
            <div className="space-y-2">
              {accounts.map(email => (
                <div
                  key={email}
                  onClick={() => {
                    onChangeAccount(email);
                    toast.success(`Switched to ${email}`);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    activeAccount === email
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getColor(email)}`}
                  >
                    {getInitials(email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email}</p>
                    <p className="text-xs text-muted-foreground">Google identity connected</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeAccount === email && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Active
                      </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {accounts.length === 0 && oauthConfigured === true && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No accounts connected</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Sign in with Google to connect Gmail automatically, or use Add Account to link
              another Gmail inbox later.
            </p>
            <Button onClick={handleAddAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Gmail Account
            </Button>
          </div>
        )}

        {oauthConfigured === true && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              How Account Switching Works
            </h2>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>Click <strong>Add Account</strong> to link another Google identity through Appwrite.</li>
              <li><strong>Continue with Google</strong> now signs in and connects Gmail in one pass.</li>
              <li>Click any account above to make it the <strong>active account</strong> and switch the inbox.</li>
              <li>When replying to an email, the active identity is used as the sender.</li>
              <li>Gmail sync only works when the identity was connected through Appwrite Google auth.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
