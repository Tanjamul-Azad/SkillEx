
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, UploadCloud, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SkillService, SkillIntentInterpretResponse } from '@/services/skillService';
import type { Skill } from '@/types';
import { AuthGraphic } from '@/components/auth/AuthGraphic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
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
    teachIntentText: z.string().max(400).optional(),
    learnIntentText: z.string().max(400).optional(),
    skillToTeach: z.string().optional(),
    skillToLearn: z.string().optional(),
    level: z.enum(['Beginner', 'Moderate', 'Expert']).optional(),
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
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-10 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none z-10" />
      <div className="lg:col-span-4 relative z-20">
        <AuthGraphic />
      </div>
      <div className="lg:col-span-6 flex items-center justify-center p-4 md:p-8 relative z-20">
        <div className="w-full max-w-md rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-secondary/10 blur-3xl" />
          
          {/* Top Logo for Mobile/Small Screens */}
          <div className="flex justify-center mb-8 lg:hidden relative z-10">
            <Link to="/">
              <Logo size="lg" />
            </Link>
          </div>
          <div className="relative mb-8 flex w-full justify-center rounded-2xl bg-white/5 border border-white/10 p-1 z-10 shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
            {['login', 'register'].map((type) => (
              <Button
                key={type}
                variant="ghost"
                onClick={() => setFormType(type as 'login' | 'register')}
                className={cn(
                  'relative z-10 w-1/2 rounded-xl py-2 text-[10px] font-bold uppercase tracking-widest transition-all',
                  formType === type ? 'text-primary-foreground hover:text-primary-foreground hover:bg-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-muted-foreground hover:text-white hover:bg-white/5'
                )}
              >
                {type}
              </Button>
            ))}
            <motion.div
              layoutId="auth-tab"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-0 h-full w-1/2 rounded-xl bg-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
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
          <h1 className="text-2xl lg:text-3xl font-extrabold font-headline tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Reset Password</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
            {resetSent ? 'Check your email for instructions.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {resetSent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6 bg-primary/5 rounded-[2rem] border border-primary/10 shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)] backdrop-blur-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 blur-3xl pointer-events-none" />
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] relative z-10" />
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/80 px-4 relative z-10">Sent! We've dispatched a recovery link to your inbox.</p>
            <Button variant="outline" className="mt-6 w-full mx-auto rounded-xl border-white/10 hover:border-white/20 transition-all font-bold tracking-widest uppercase text-[10px] bg-white/5 relative z-10" onClick={() => setIsForgotMode(false)}>Close</Button>
          </motion.div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setResetSent(true); }}>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input type="email" placeholder="your@email.com" className="pl-11 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
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
        <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Welcome Back</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Sign in to continue your skill exchange journey.</p>
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
                  <Input {...field} type="email" placeholder="your@email.com" className="pl-11 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Your password" className="pl-11 pr-12 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
              Recover
            </button>
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all mt-2" disabled={isLoading}>
            {isLoading ? 'Decrypting...' : 'Authenticate'}
          </Button>
        </form>
      </Form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-grow border-t border-white/10" />
        <span className="shrink text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Initialize via</span>
        <div className="flex-grow border-t border-white/10" />
      </div>

      <Button
        variant="outline"
        className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
        disabled
        title="Google sign-in is coming soon"
        onClick={async () => {
          await loginWithGoogle();
        }}
      >
        <GoogleIcon className="mr-3 h-4 w-4 drop-shadow-sm" />
        Google Auth
      </Button>
    </>
  );
}

function RegisterForm({ setFormType }: { setFormType: (type: 'login') => void }) {
  const [step, setStep] = React.useState(1);
  const { register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [skillOptions, setSkillOptions] = React.useState<Skill[]>([]);
  const [isInterpreting, setIsInterpreting] = React.useState(false);
  const [interpretation, setInterpretation] = React.useState<SkillIntentInterpretResponse | null>(null);

  React.useEffect(() => {
    SkillService.getAll().then((s) => setSkillOptions(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      teachIntentText: '',
      learnIntentText: '',
      terms: false,
    },
  });

  const applyInterpretation = React.useCallback((result: SkillIntentInterpretResponse) => {
    setInterpretation(result);

    const teachPrimary = result.teach?.primary?.skillName;
    const learnPrimary = result.learn?.primary?.skillName;
    const inferredLevel = result.learn?.inferredLevel ?? result.teach?.inferredLevel;

    if (teachPrimary) {
      form.setValue('skillToTeach', teachPrimary, { shouldValidate: true });
    }
    if (learnPrimary) {
      form.setValue('skillToLearn', learnPrimary, { shouldValidate: true });
    }
    if (inferredLevel && !form.getValues('level')) {
      form.setValue('level', inferredLevel, { shouldValidate: true });
    }
  }, [form]);

  const handleInterpretIntent = React.useCallback(async () => {
    const teachText = form.getValues('teachIntentText')?.trim();
    const learnText = form.getValues('learnIntentText')?.trim();

    if (!teachText && !learnText) {
      toast({
        variant: 'destructive',
        title: 'Write your intent first',
        description: 'Add at least one natural-language line so AI can suggest skills.',
      });
      return;
    }

    setIsInterpreting(true);
    try {
      const result = await SkillService.interpretIntent({ teachText, learnText });
      applyInterpretation(result);

      toast({
        title: 'AI suggestions ready',
        description: 'We mapped your text to skill(s). Review and adjust if needed.',
        variant: 'success',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'AI suggestion failed',
        description: 'Could not interpret your text right now. You can still select skills manually.',
      });
    } finally {
      setIsInterpreting(false);
    }
  }, [applyInterpretation, form, toast]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    const result = await register({
      name: data.fullName,
      email: data.email,
      password: data.password,
      university: '',
      skillToTeach: data.skillToTeach || undefined,
      skillToLearn: data.skillToLearn || undefined,
      level: data.level || undefined,
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
        <h2 className="mt-6 text-3xl font-extrabold font-headline tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Identity Verified</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">Please check your comms link (inbox) to unlock full access.</p>
        <Button className="mt-8 w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-all shadow-none" onClick={() => setFormType('login')}>Return to Login</Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center relative">
        <h1 className="text-3xl lg:text-4xl font-extrabold font-headline tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">Establish Identity</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-3">
          {step === 1 ? 'Join the network.' : 'Declare your payload parameters.'}
        </p>
      </div>

      <div className="mt-8 mb-8 relative">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
          <span className={cn(step >= 1 ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : "")}>Phase 1: Credentials</span>
          <span className={cn(step >= 2 ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" : "")}>Phase 2: Matrix</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
          <div 
            className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)] transition-all duration-500 ease-out" 
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative">
          <AnimatePresence mode="wait">
            {step === 1 ? (
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
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input {...field} placeholder="Designation (Name)" className="pl-11 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input {...field} type="email" placeholder="comms@address.exp" className="pl-11 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Access Code" className="pl-11 pr-12 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input {...field} type={showConfirmPassword ? 'text' : 'password'} placeholder="Verify Code" className="pl-11 pr-12 h-12 bg-black/40 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl text-sm font-medium" />
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
                <div className="pt-2">
                  <Button
                    type="button"
                    className="w-full h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    onClick={async () => {
                      const isValid = await form.trigger(['fullName', 'email', 'password', 'confirmPassword']);
                      if (isValid) setStep(2);
                    }}
                  >
                    Proceed to Matrix
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                  <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 drop-shadow-[0_0_5px_hsl(var(--primary)/0.8)]">
                      <Sparkles className="h-4 w-4 animate-pulse" /> Neural Parameter Extraction
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 py-0 px-3 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all shadow-none"
                      disabled={isInterpreting}
                      onClick={handleInterpretIntent}
                    >
                      {isInterpreting ? 'Scanning...' : 'Extract'}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="teachIntentText"
                    render={({ field }) => (
                      <FormItem className="relative z-10">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Knowledge Payload (Outgoing)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Specify concepts you can transmit..."
                            className="text-sm bg-black/50 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none custom-scrollbar"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="learnIntentText"
                    render={({ field }) => (
                      <FormItem className="relative z-10">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-white/70">Knowledge Query (Incoming)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Specify concepts you need to acquire..."
                            className="text-sm bg-black/50 border-white/10 focus:border-primary focus:ring-primary/20 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none custom-scrollbar"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {interpretation && (
                    <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground space-y-2 mt-4 pt-4 border-t border-white/10 relative z-10">
                      <p>
                        Outbound node:{' '}
                        <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                          {interpretation.teach?.primary?.skillName ?? 'Pending match'}
                        </span>
                        {interpretation.teach?.primary ? <span className="text-primary ml-1">[{interpretation.teach.primary.confidence}%]</span> : ''}
                      </p>
                      <p>
                        Inbound node:{' '}
                        <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                          {interpretation.learn?.primary?.skillName ?? 'Pending match'}
                        </span>
                        {interpretation.learn?.primary ? <span className="text-primary ml-1">[{interpretation.learn.primary.confidence}%]</span> : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2 pt-2">
                  <FormField control={form.control} name="skillToTeach" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-black/40 border-white/10 text-sm font-medium focus:ring-primary/20 focus:border-primary rounded-xl"><SelectValue placeholder="Skill to teach" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                          {skillOptions.map(s => <SelectItem key={s.id} value={s.name} className="text-sm font-medium focus:bg-white/10 focus:text-white rounded-lg cursor-pointer transition-colors">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="skillToLearn" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-black/40 border-white/10 text-sm font-medium focus:ring-primary/20 focus:border-primary rounded-xl"><SelectValue placeholder="Skill to learn" /></SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                          {skillOptions.map(s => <SelectItem key={s.id} value={s.name} className="text-sm font-medium focus:bg-white/10 focus:text-white rounded-lg cursor-pointer transition-colors">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-black/40 border-white/10 text-sm font-medium focus:ring-primary/20 focus:border-primary rounded-xl"><SelectValue placeholder="Current capability level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-black/90 border-white/10 backdrop-blur-xl rounded-xl">
                        <SelectItem value="Beginner" className="text-sm font-medium focus:bg-white/10 focus:text-white rounded-lg cursor-pointer transition-colors">Novice (L1)</SelectItem>
                        <SelectItem value="Moderate" className="text-sm font-medium focus:bg-white/10 focus:text-white rounded-lg cursor-pointer transition-colors">Proficient (L2)</SelectItem>
                        <SelectItem value="Expert" className="text-sm font-medium focus:bg-white/10 focus:text-white rounded-lg cursor-pointer transition-colors">Master (L3)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-[1.5rem] bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer group shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)]">
                  <div className="h-12 w-12 rounded-full bg-black/50 border border-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform mb-3">
                    <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center leading-relaxed">
                    <span className="text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)] cursor-pointer">Inject Image</span> or drag payload here<br />
                    <span className="opacity-50 text-[9px]">Max file size: 5MB</span>
                  </p>
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
                          I accept the <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] underline-offset-4 hover:underline">TOS</Link> and <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)] underline-offset-4 hover:underline">Privacy directives</Link>.
                        </label>
                        <FormMessage className="text-[10px]" />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" className="flex-[1] h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-muted-foreground hover:text-white shadow-none" onClick={() => setStep(1)}>
                    Rewind
                  </Button>
                  <Button type="submit" className="flex-[2] h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary text-primary-foreground hover:bg-primary/90 transition-all" disabled={isLoading}>
                    {isLoading ? 'Processing...' : 'Establish Link'}
                  </Button>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    className="w-full text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-white/80 transition-colors py-2 rounded-lg hover:bg-white/5"
                    onClick={async () => {
                      const isValid = await form.trigger(['terms']);
                      if (!isValid) return;
                      form.setValue('skillToTeach', undefined);
                      form.setValue('skillToLearn', undefined);
                      form.setValue('level', undefined);
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    Bypass configuration for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
    </>
  );
}

export default AuthPage;
