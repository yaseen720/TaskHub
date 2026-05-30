// BUILD_VERSION: 1717084800000 - Force Vercel Build
import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner"; // Use Sonner's Toaster
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Contexts
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/hooks/useWorkspace';

// Components
import PageNotFound from './lib/PageNotFound';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Pages
import WorkspaceSetup from '@/pages/WorkspaceSetup';
import Dashboard from './pages/Dashboard';
import TaskBoard from './pages/TaskBoard';
import Team from './pages/Team';
import Chat from '@/pages/Chat';
import LeaveRequests from '@/pages/LeaveRequests';
import JoinRequests from '@/pages/JoinRequests';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import TaskReview from '@/pages/TaskReview';
import VideoReview from '@/pages/VideoReview';
import MyContent from '@/pages/MyContent';

// Layout
import AppLayout from '@/components/layout/AppLayout';
import { Separator } from '@/components/ui/separator';

const WorkspaceRouter = () => {
  const { loading, activeWorkspace, workspaces } = useWorkspace();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!activeWorkspace && workspaces.length === 0) {
    return (
      <>
        <div className="bg-primary text-primary-foreground text-[10px] py-1 text-center font-bold tracking-widest uppercase animate-pulse">
          HubTask V2 Live Deployment - Updated May 30
        </div>
        <Routes>
          <Route path="/" element={<WorkspaceSetup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      {/* DEPLOYMENT VERIFICATION BANNER */}
      <div className="bg-primary text-primary-foreground text-[10px] py-1 text-center font-bold tracking-widest uppercase animate-pulse">
        HubTask V2 Live Deployment - Updated May 30
      </div>
      <Routes>
        <Route path="/setup" element={<WorkspaceSetup />} />
        <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tasks" element={<TaskBoard />} />
        <Route path="/team" element={<Team />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/leaves" element={<LeaveRequests />} />
        <Route path="/join-requests" element={<JoinRequests />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/task-review" element={<TaskReview />} />
        <Route path="/video-review" element={<VideoReview />} />
        <Route path="/my-content" element={<MyContent />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const validatePassword = (pass) => {
    const minLength = 8;
    if (pass.length < minLength) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pass) || !/[a-z]/.test(pass)) return "Password must contain both uppercase and lowercase letters";
    if (!/[0-9]/.test(pass)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "Password must contain at least one special character";
    return null;
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if Supabase is configured
    if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url') {
      toast.error("Supabase URL is not configured. Please check your .env.local file.");
      return;
    }

    if (!isLogin) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else {
        const data = await signUp(email, password, fullName);
        if (!data?.session) {
          toast.success('Signup successful! Check your email for a confirmation link.', { duration: 10000 });
          setIsLogin(true);
        } else {
          toast.success('Account created!');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background p-4 overflow-y-auto">
      <Card className="w-full max-w-md shadow-lg border-2 my-8">
        <CardHeader className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary items-center justify-center mb-2 mx-auto">
            <span className="text-primary-foreground font-bold text-xl">HT</span>
          </div>
          <CardTitle className="text-2xl font-bold">{isLogin ? 'Welcome Back' : 'Join HubTask'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to access your workspace' : 'Create an account to start collaborating'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full gap-2 py-5 border-2" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {!isLogin && password.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Min 8 chars, uppercase, lowercase, number, and special char.
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : (isLogin ? 'Sign In' : 'Sign Up')}
              </Button>
            </form>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword('');
              }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">HT</span>
          </div>
          <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <WorkspaceProvider>
      <WorkspaceRouter />
    </WorkspaceProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
