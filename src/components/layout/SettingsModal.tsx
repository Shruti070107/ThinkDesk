import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, User, Mail, Plus, RefreshCw, AlertCircle, CheckCircle2, 
  ChevronRight, Moon, Sun, Monitor, Palette
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'accounts' | 'appearance';

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab] = useState<SettingsTab>('accounts');
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | undefined>();
  const [oauthReady, setOauthReady] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch accounts whenever the modal opens
  useEffect(() => {
    if (!open) return;
    fetch(`${API_BASE}/api/auth/accounts`)
      .then(r => r.json())
      .then(data => {
        setOauthReady(true);
        const accs: string[] = data.accounts || [];
        setAccounts(accs);
        if (accs.length > 0 && !activeAccount) setActiveAccount(accs[0]);
      })
      .catch(() => setOauthReady(false));
  }, [open]);

  const handleAddAccount = () => {
    const popup = window.open(`${API_BASE}/api/auth/google`, 'GmailOAuth', 'width=600,height=700,left=200,top=100');
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_AUTH_SUCCESS' && event.data.email) {
        const email = event.data.email as string;
        setAccounts(prev => Array.from(new Set([...prev, email])));
        setActiveAccount(email);
        toast.success(`✅ Connected: ${email}`);
        window.removeEventListener('message', listener);
      }
    };
    window.addEventListener('message', listener);
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener('message', listener);
        handleRefresh();
      }
    }, 500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/accounts`);
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch { /* ignore */ }
    finally { setIsRefreshing(false); }
  };

  const getInitials = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase();
  const getColor = (email: string) => {
    const colors = ['bg-violet-500','bg-blue-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
    return colors[email.charCodeAt(0) % colors.length];
  };

  const tabs: { id: SettingsTab; icon: React.ElementType; label: string }[] = [
    { id: 'accounts',   icon: User,    label: 'Email Accounts' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
  ];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[480px]">
          {/* Left sidebar tabs */}
          <div className="w-44 border-r border-border bg-muted/30 p-2 flex flex-col gap-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors w-full ${
                  tab === t.id
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                <t.icon className="h-4 w-4 flex-shrink-0" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ── ACCOUNTS ── */}
            {tab === 'accounts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Gmail Accounts</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Connect & switch between multiple Gmail inboxes.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button size="sm" onClick={handleAddAccount} disabled={oauthReady === false}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Account
                    </Button>
                  </div>
                </div>

                {/* OAuth not configured */}
                {oauthReady === false && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Google OAuth not configured. Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your <code>.env</code> file, then restart the backend.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Account list */}
                {accounts.length > 0 && (
                  <div className="space-y-2">
                    {accounts.map(email => (
                      <div
                        key={email}
                        onClick={() => { setActiveAccount(email); toast.success(`Switched to ${email}`); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                          activeAccount === email
                            ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/30 bg-card'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getColor(email)}`}>
                          {getInitials(email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{email}</p>
                          <p className="text-xs text-muted-foreground">Gmail</p>
                        </div>
                        {activeAccount === email
                          ? <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Active</Badge>
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {accounts.length === 0 && oauthReady === true && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Mail className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium mb-1">No accounts connected</p>
                    <p className="text-xs text-muted-foreground mb-4">Click "Add Account" to connect your Gmail.</p>
                    <Button size="sm" onClick={handleAddAccount}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Connect Gmail
                    </Button>
                  </div>
                )}

                {/* How it works */}
                {oauthReady === true && (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border border-border/50">
                    <p className="font-medium text-foreground flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> How it works</p>
                    <p>• Click a card to set it as the active inbox account.</p>
                    <p>• Replies will be sent from the active account.</p>
                    <p>• Add multiple accounts to switch between them instantly.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── APPEARANCE ── */}
            {tab === 'appearance' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Appearance</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Customize how ThinkDesk looks.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', icon: Sun,     label: 'Light'  },
                      { value: 'dark',  icon: Moon,    label: 'Dark'   },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { if (theme !== opt.value) toggleTheme(); }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                          theme === opt.value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20 font-medium text-primary'
                            : 'border-border hover:border-primary/30 text-muted-foreground'
                        }`}
                      >
                        <opt.icon className="h-5 w-5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
