
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AuthGraphic } from '@/components/auth/AuthGraphic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import Logo from '@/components/ui/Logo';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
  rememberMe: z.boolean().optional(),
});
type LoginFormData = z.infer<typeof loginSchema>;

const registerSchema = z
  .object({
    fullName: z.string().min(3, { message: 'Full name must be at least 3 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });
type RegisterFormData = z.infer<typeof registerSchema>;


const formVariants = {
  hidden: (direction: number) => ({
    x: `${direction * 100}%`,
    opacity: 0,
    transition: { type: 'tween', duration: 0.3, ease: 'easeInOut' }
  }),
  visible: {
    x: '0%',
    opacity: 1,
    transition: { type: 'tween', duration: 0.3, ease: 'easeInOut' }
  },
};

function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [formType, setFormType] = React.useState<'login' | 'register'>(initialTab);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isAuthLoading, navigate]);

  if (isAuthLoading || (!isAuthLoading && isAuthenticated)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <main className="relative grid min-h-screen w-full grid-cols-1 overflow-hidden bg-[#050914] lg:grid-cols-12">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none z-10" />
      <div className="relative z-20 lg:col-span-6">
        <AuthGraphic />
      </div>
      <div className="relative z-20 flex items-center justify-center p-4 md:p-8 lg:col-span-6">
        <div className="relative w-full max-w-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#071018]/92 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.42),inset_0_1px_0_0_hsla(0,0%,100%,0.06)] backdrop-blur-xl sm:p-9">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-primary/14 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-36 w-36 rounded-full bg-secondary/10 blur-3xl" />
          
          {/* Top Logo for Mobile/Small Screens */}
          <div className="flex justify-center mb-8 lg:hidden relative z-10">
            <Link to="/">
              <Logo size="lg" />
            </Link>
          </div>
          <div className="relative z-10 mb-7 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 lg:hidden">
            <img
              src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=82"
              alt=""
              className="h-36 w-full object-cover opacity-72"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071018] via-[#071018]/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Skill exchange</p>
              <p className="mt-1 font-headline text-xl font-extrabold leading-tight text-white">
                Trade useful skills with people who match your goals.
              </p>
            </div>
          </div>
          <div className="relative z-10 mb-8 flex w-full justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
            {['login', 'register'].map((type) => (
              <Button
                key={type}
                variant="ghost"
                onClick={() => setFormType(type as 'login' | 'register')}
                className={cn(
                  'relative z-10 w-1/2 rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all',
                  formType === type ? 'text-[#02100e] hover:text-[#02100e] hover:bg-transparent' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                )}
              >
                {type}
              </Button>
            ))}
            <motion.div
              layoutId="auth-tab"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-0 h-full w-1/2 rounded-xl bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.22)]"
              style={{ x: formType === 'login' ? '0%' : '100%' }}
            />
          </div>

          <div className="relative z-10">
            <AnimatePresence mode="wait" custom={formType === 'login' ? -1 : 1}>
              <motion.div
                key={formType}
                custom={formType === 'login' ? -1 : 1}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {formType === 'login' ? <LoginForm /> : <RegisterForm setFormType={setFormType} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isForgotMode, setIsForgotMode] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    if (result.success) {
      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting to your dashboard.',
        variant: 'success'
      });
      navigate('/dashboard');
    } else {
      const isUnconfirmed = result.error?.toLowerCase().includes('email not confirmed');
      const isWrongCreds = result.error?.toLowerCase().includes('invalid email or password');
      const isBackendOffline = result.error?.toLowerCase().includes('unable to reach api server');
      toast({
        variant: 'destructive',
        title: isBackendOffline
          ? 'Server is offline'
          : isUnconfirmed
          ? 'Confirm your email first'
          : isWrongCreds
          ? 'Wrong email or password'
          : 'Could not sign in',
        description: isUnconfirmed
          ? 'We sent you a confirmation link. Check your inbox and click it before signing in.'
          : isBackendOffline
          ? 'Cannot connect to backend on port 8080. Start the backend server and try again.'
          : isWrongCreds
          ? 'The email or password you entered is incorrect. Please try again.'
          : (result.error ?? 'Something went wrong. Please try again in a moment.'),
      });
      setIsLoading(false);
    }
  };

  if (isForgotMode) {
    return (
      <div className="space-y-6 relative">
        <div className="text-center">
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-white lg:text-3xl">Reset password</h1>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {resetSent ? 'Check your email for instructions.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {resetSent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 blur-3xl pointer-events-none" />
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] relative z-10" />
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/80 px-4 relative z-10">Sent. Check your inbox for the password reset link.</p>
            <Button variant="outline" className="mt-6 w-full mx-auto rounded-xl border-white/10 hover:border-white/20 transition-all font-bold tracking-widest uppercase text-[10px] bg-white/5 relative z-10" onClick={() => setIsForgotMode(false)}>Close</Button>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setResetSent(true); }}>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input type="email" placeholder="you@example.com" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              Send Reset Link
            </Button>
            <Button type="button" variant="ghost" className="w-full rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white hover:bg-white/5 transition-colors" onClick={() => setIsForgotMode(false)}>
              Back to Login
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white lg:text-4xl">Welcome back</h1>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Continue exchanging skills with people who match your goals.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5 relative">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input {...field} type="email" placeholder="you@example.com" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                </div>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Your password" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 pr-12 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between text-sm py-1">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-white/20 rounded-[4px]" />
                  </FormControl>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-white transition-colors">Remember me</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              onClick={() => setIsForgotMode(true)}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Button type="submit" className="mt-2 h-12 w-full rounded-xl bg-primary text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] transition-all hover:bg-primary/90" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-grow border-t border-white/10" />
        <span className="shrink text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Or continue with</span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
        title="Sign in with Google"
        disabled={isGoogleLoading}
        onClick={async () => {
          setIsGoogleLoading(true);
          const result = await loginWithGoogle();

          if (result.success) {
            toast({
              title: 'Google login successful',
              description: 'Redirecting to your dashboard.',
              variant: 'success',
            });
            navigate('/dashboard');
            return;
          }

          toast({
            variant: 'destructive',
            title: 'Google sign-in failed',
            description: result.error ?? 'We could not authenticate with Google. Please try again.',
          });
          setIsGoogleLoading(false);
        }}
      >
        <GoogleIcon className="mr-3 h-4 w-4 drop-shadow-sm" />
        {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
      </Button>
    </>
  );
}

function RegisterForm({ setFormType }: { setFormType: (type: 'login') => void }) {
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  });



  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    const result = await register({
      name: data.fullName,
      email: data.email,
      password: data.password,
      university: '',
    });

    if (result.success) {
      if (result.needsEmailConfirmation) {
        setIsSuccess(true);
      } else {
        toast({
          title: 'Account Created!',
          description: 'Your account is ready. Sign in with your new credentials.',
          variant: 'success',
        });
        setFormType('login');
      }
      setIsLoading(false);
    } else {
      const isRateLimit   = result.error?.toLowerCase().includes('rate limit');
      const isEmailTaken  = result.error?.toLowerCase().includes('already exists');
      toast({
        variant: 'destructive',
        title: isRateLimit  ? 'Too many attempts'
             : isEmailTaken ? 'Email already registered'
             : 'Could not create account',
        description: isRateLimit
          ? 'You\'ve made too many requests. Please wait a few minutes and try again.'
          : isEmailTaken
          ? 'An account with that email already exists. Try signing in instead.'
          : (result.error ?? 'Something went wrong on our end. Please try again in a moment.'),
      });
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8 relative">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 150 }} className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl pointer-events-none rounded-full" />
          <CheckCircle2 className="relative h-20 w-20 text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.6)]" />
        </motion.div>
        <h2 className="mt-6 font-headline text-3xl font-extrabold tracking-tight text-white">Check your email</h2>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Open the confirmation link we sent to finish creating your account.</p>
        <Button className="mt-8 w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all shadow-none" onClick={() => setFormType('login')}>Return to Login</Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative">
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-white lg:text-4xl">Create your account</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
          Set up your profile and start trading useful skills.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative mt-8">
          <AnimatePresence mode="wait">
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Full name</FormLabel>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input {...field} placeholder="e.g., Sarah Ahmed" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Email address</FormLabel>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input {...field} type="email" placeholder="you@example.com" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Password</FormLabel>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Create a password" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 pr-12 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="pt-1"><PasswordStrengthMeter password={field.value} /></div>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Confirm password</FormLabel>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input {...field} type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" className="h-12 rounded-xl border-white/10 bg-slate-950/70 pl-11 pr-12 text-sm font-medium transition-all focus:border-primary focus:ring-primary/20" />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-4 space-y-0 py-3 px-2 rounded-xl bg-white/5 border border-white/5 mt-2">
                      <FormControl className="mt-0.5">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-white/20 rounded-[4px]" />
                      </FormControl>
                      <div className="grid gap-1.5 leading-snug">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground cursor-pointer select-none">
                          I agree to the <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] underline-offset-4 hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] underline-offset-4 hover:underline">Privacy Policy</Link>.
                        </label>
                        <FormMessage className="text-[10px]" />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </div>
              </motion.div>
          </AnimatePresence>
        </form>
      </Form>
    </>
  );
}

export default AuthPage;
