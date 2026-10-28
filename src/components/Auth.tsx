import { useState } from 'react';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Mode = 'signin' | 'signup' | 'forgot';

interface AuthProps {
  onBack: () => void;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Wrong email or password. Please try again.',
  'Email not confirmed': 'Please confirm your email first — check your inbox for the verification link.',
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Password should be at least 6 characters.': 'Password must be at least 6 characters long.',
  'Email rate limit exceeded': 'Too many emails sent. Please wait a minute and try again.',
};

function friendly(message: string): string {
  return FRIENDLY_ERRORS[message] || message;
}

export default function Auth({ onBack }: AuthProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setFormError(null);
    setConfirmationSent(false);
    setResetSent(false);
  };

  const validate = (): boolean => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    if (mode !== 'forgot' && password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast({ title: 'Welcome back!', description: "You've successfully signed in." });
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          setConfirmationSent(true);
        } else {
          toast({ title: 'Account created!', description: 'You can now start verifying content.' });
        }
      } else {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch (err: any) {
      const msg = friendly(err?.message || 'Something went wrong. Please try again.');
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password';
  const subtitle =
    mode === 'signin'
      ? 'Sign in to continue verifying content'
      : mode === 'signup'
        ? 'Start fighting misinformation today'
        : "Enter your email and we'll send you a reset link";

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card rounded-2xl shadow-xl p-10 border border-border animate-scale-in">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center glow-primary animate-bounce-in">
                <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">Confirm your email</h2>
            <p className="text-muted-foreground mb-2 leading-relaxed">
              We've sent a confirmation link to
            </p>
            <p className="font-semibold text-primary mb-6 break-all">{email}</p>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Click the link in your inbox to activate your account, then sign in here.
            </p>
            <Button onClick={() => switchMode('signin')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card rounded-2xl shadow-xl p-10 border border-border animate-scale-in">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center glow-primary animate-bounce-in">
                <Mail className="h-10 w-10 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-3">Check your inbox</h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              If an account exists for <span className="font-semibold text-foreground break-all">{email}</span>, a
              password reset link is on its way.
            </p>
            <Button onClick={() => switchMode('signin')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Button onClick={onBack} variant="ghost" className="mb-6 hover-scale">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to home
        </Button>

        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border glass-effect animate-scale-in">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center glow-primary animate-bounce-in">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-2">{title}</h2>
          <p className="text-center text-muted-foreground mb-8">{subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
            )}

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
                  {mode === 'signin' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending link...'}
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : mode === 'signup' ? (
                'Create Account'
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'signin' && (
              <div>
                <button
                  onClick={() => switchMode('forgot')}
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  Forgot your password?
                </button>
                <p className="text-sm text-muted-foreground mt-3">
                  Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-primary hover:underline transition-colors">
                    Sign up
                  </button>
                </p>
              </div>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="text-primary hover:underline transition-colors">
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
