import { useEffect, useState } from 'react';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { updatePassword } = useAuth();
  const { toast } = useToast();

  // Recovery links sign the user in via the URL (hash or ?code=...).
  // The Supabase client exchanges it automatically; wait briefly for that.
  useEffect(() => {
    const check = async () => {
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 250));
      }
      setSessionChecked(true);
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
    } catch (err: any) {
      setFormError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center bg-card rounded-2xl shadow-xl p-10 border border-border animate-scale-in">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center glow-primary animate-bounce-in">
              <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3">Password updated</h2>
          <p className="text-muted-foreground mb-8">Your password has been changed successfully.</p>
          <Button onClick={() => (window.location.href = '/')} className="w-full">
            Go to VerifyAI
          </Button>
        </div>
      </div>
    );
  }

  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const isRecovery =
    hash.includes('type=recovery') || params.get('type') === 'recovery' || params.has('code');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border glass-effect animate-scale-in">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center glow-primary animate-bounce-in">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">Set New Password</h2>
          <p className="text-center text-muted-foreground mb-8">Choose a new password for your account</p>

          {sessionChecked && !isRecovery && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-6 animate-fade-in">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-500">
                This page works best when opened from the password reset email link.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{formError}</p>
              </div>
            )}

            <Button type="submit" className="w-full hover-scale" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
