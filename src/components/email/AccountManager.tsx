import React, { useState, useEffect } from 'react';
import { Mail, Plus, LogOut, CheckCircle2, AlertCircle, RefreshCw, ChevronRight, Settings, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AccountManagerProps {
  accounts: string[];
  activeAccount?: string;
  onChangeAccount: (account: string) => void;
  onAccountsChange: (accounts: string[]) => void;
}

export function AccountManager({ accounts, activeAccount, onChangeAccount, onAccountsChange }: AccountManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

  // Check if OAuth is configured
  useEffect(() => {
    fetch(`${API_BASE}/api/auth/accounts`)
      .then(r => r.json())
      .then(data => {
        // If we get a valid response (even empty array), OAuth backend is reachable
        setOauthConfigured(true);
        onAccountsChange(data.accounts || []);
      })
      .catch(() => setOauthConfigured(false));
  }, []);

  const handleAddAccount = () => {
    // Open Google OAuth in a popup
    const popup = window.open(`${API_BASE}/api/auth/google`, 'GmailOAuth', 'width=600,height=700,left=200,top=100');

    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_AUTH_SUCCESS' && event.data.email) {
        const email = event.data.email as string;
        onAccountsChange([...new Set([...accounts, email])]);
        onChangeAccount(email);
        toast.success(`✅ Gmail connected: ${email}`);
        window.removeEventListener('message', listener);
      }
    };
    window.addEventListener('message', listener);

    // Cleanup listener if popup is closed without auth
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener('message', listener);
        // Refresh accounts list in case something happened
        fetch(`${API_BASE}/api/auth/accounts`)
          .then(r => r.json())
          .then(data => onAccountsChange(data.accounts || []));
      }
    }, 500);
  };

  const handleRefreshAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/accounts`);
      const data = await res.json();
      onAccountsChange(data.accounts || []);
      toast.success('Accounts refreshed');
    } catch {
      toast.error('Could not reach backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase();
  const getColor = (email: string) => {
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const idx = email.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Email Accounts</h1>
            <p className="text-sm text-muted-foreground">Manage your connected Gmail accounts.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAccounts} disabled={isLoading}>
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

        {/* OAuth not configured warning */}
        {oauthConfigured === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Gmail OAuth not configured.</strong> Add your Google credentials to <code>.env</code> to enable multi-account logins.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup guide - only shown if not configured */}
        {oauthConfigured === false && (
          <div className="rounded-xl border border-border p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Setup Instructions</h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">Google Cloud Console</a> and create a project.</li>
              <li>Enable the <strong>Gmail API</strong> and <strong>Google+ API</strong>.</li>
              <li>Create an OAuth 2.0 Client ID (type: Web Application).</li>
              <li>Add <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:8000/api/auth/google/callback</code> as an Authorized Redirect URI.</li>
              <li>Copy your Client ID and Secret into your <code className="text-xs bg-muted px-1 py-0.5 rounded">.env</code> file:</li>
            </ol>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here`}
            </pre>
            <p className="text-xs text-muted-foreground">After saving, restart the backend server and click <strong>Add Account</strong>.</p>
          </div>
        )}

        {/* Connected Accounts */}
        {accounts.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Connected Accounts</h2>
            <div className="space-y-2">
              {accounts.map(email => (
                <div
                  key={email}
                  onClick={() => { onChangeAccount(email); toast.success(`Switched to ${email}`); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    activeAccount === email
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${getColor(email)}`}>
                    {getInitials(email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email}</p>
                    <p className="text-xs text-muted-foreground">Gmail • Connected</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeAccount === email && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Active</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {accounts.length === 0 && oauthConfigured === true && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No accounts connected</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Connect your Gmail account to start reading and managing emails inside ThinkDesk.
            </p>
            <Button onClick={handleAddAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Gmail Account
            </Button>
          </div>
        )}

        {/* How it works */}
        {oauthConfigured === true && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> How Account Switching Works</h2>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Click <strong>Add Account</strong> to connect a new Gmail address via Google OAuth.</li>
              <li>• Click any account above to make it the <strong>active account</strong> — emails in the Inbox will switch automatically.</li>
              <li>• When replying to an email, the active account is used as the sender.</li>
              <li>• You can connect as many accounts as you need.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
