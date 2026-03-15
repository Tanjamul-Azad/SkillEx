
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
import { Progress } from '@/components/ui/progress';
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
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-10">
      <div className="lg:col-span-4">
        <AuthGraphic />
      </div>
      <div className="lg:col-span-6 flex items-center justify-center p-8 bg-background/50 backdrop-blur-sm">
        <div className="w-full max-w-md">
          {/* Top Logo for Mobile/Small Screens */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link to="/">
              <Logo size="lg" />
            </Link>
          </div>
          <div className="relative mb-8 flex w-full justify-center rounded-full bg-muted p-1">
            {['login', 'register'].map((type) => (
              <Button
                key={type}
                variant="ghost"
                onClick={() => setFormType(type as 'login' | 'register')}
                className={cn(
                  'relative z-10 w-1/2 rounded-full py-2 text-sm font-medium capitalize transition-colors',
                  formType === type ? 'text-primary-foreground hover:text-primary-foreground hover:bg-transparent' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
              >
                {type}
              </Button>
            ))}
            <motion.div
              layoutId="auth-tab"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-0 h-full w-1/2 rounded-full bg-primary"
              style={{ x: formType === 'login' ? '0%' : '100%' }}
            />
          </div>

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
    </main>
  );
}

function LoginForm() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
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
      toast({
        variant: 'destructive',
        title: isUnconfirmed ? 'Confirm your email first' : isWrongCreds ? 'Wrong email or password' : 'Could not sign in',
        description: isUnconfirmed
          ? 'We sent you a confirmation link. Check your inbox and click it before signing in.'
          : isWrongCreds
          ? 'The email or password you entered is incorrect. Please try again.'
          : (result.error ?? 'Something went wrong. Please try again in a moment.'),
      });
      setIsLoading(false);
    }
  };

  if (isForgotMode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-headline">Reset Password</h1>
          <p className="text-muted-foreground">
            {resetSent ? 'Check your email for instructions.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {resetSent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 bg-primary/5 rounded-2xl border border-primary/10">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
            <p className="text-sm px-6">Sent! We've dispatched a recovery link to your inbox.</p>
            <Button variant="outline" className="mt-6 w-11/12 mx-auto" onClick={() => setIsForgotMode(false)}>Close</Button>
          </motion.div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setResetSent(true); }}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="your@email.com" className="pl-10 h-11" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </div>
            <Button type="submit" variant="gradient" className="w-full h-11">
              Send Reset Link
            </Button>
            <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setIsForgotMode(false)}>
              Back to Login
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold font-headline">Welcome Back!</h1>
        <p className="text-muted-foreground">Sign in to continue your skill exchange journey.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type="email" placeholder="your@email.com" className="pl-10 h-11" />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Your password" className="pl-10 pr-10 h-11" />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between text-sm">
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Remember me</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              onClick={() => setIsForgotMode(true)}
              className="font-medium text-primary hover:underline"
            >
              Forgot Password?
            </button>
          </div>
          <Button type="submit" variant="gradient" className="w-full h-11" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
      </Form>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t border-border" />
        <span className="mx-4 shrink text-xs uppercase text-muted-foreground">Or continue with</span>
        <div className="flex-grow border-t border-border" />
      </div>

      <Button
        variant="outline"
        className="w-full transition-shadow hover:shadow-md h-11"
        disabled
        title="Google sign-in is coming soon"
        onClick={async () => {
          setIsGoogleLoading(true);
          try { await loginWithGoogle(); }
          finally { setIsGoogleLoading(false); }
        }}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Google (Coming Soon)
      </Button>
    </>
  );
}

function RegisterForm({ setFormType }: { setFormType: (type: 'login') => void }) {
  const [step, setStep] = React.useState(1);
  const { register } = useAuth();
  const navigate = useNavigate();
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
      <div className="text-center py-4">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 150 }}>
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        </motion.div>
        <h2 className="mt-4 text-2xl font-bold font-headline">Account Created!</h2>
        <p className="text-muted-foreground mt-2">Please check your inbox and click the confirmation link to activate your account.</p>
        <Button variant="outline" className="mt-6 w-full h-11" onClick={() => setFormType('login')}>Back to Login</Button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold font-headline">Create an Account</h1>
        <p className="text-muted-foreground">
          {step === 1 ? 'Join our community of learners.' : 'Tell us what you want to trade.'}
        </p>
      </div>

      <div className="mt-6 mb-8">
        <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2 px-1">
          <span>Identity</span>
          <span>Profiling</span>
        </div>
        <Progress value={step === 1 ? 50 : 100} className="h-1 shadow-sm" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="Your Full Name" className="pl-10 h-11" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type="email" placeholder="your@email.com" className="pl-10 h-11" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Password" className="pl-10 pr-10 h-11" />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <PasswordStrengthMeter password={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm" className="pl-10 pr-10 h-11" />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="gradient"
                  className="w-full h-11 mt-2 shadow-lg shadow-primary/20"
                  onClick={async () => {
                    const isValid = await form.trigger(['fullName', 'email', 'password', 'confirmPassword']);
                    if (isValid) setStep(2);
                  }}
                >
                  Continue to Skills
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> AI Skill Detection (Natural Language)
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isInterpreting}
                      onClick={handleInterpretIntent}
                    >
                      {isInterpreting ? 'Analyzing...' : 'Suggest Skills'}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="teachIntentText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">What can you teach? (free text)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Example: I can teach Python automation, basic data analysis, and pandas."
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="learnIntentText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">What do you want to learn? (free text)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={2}
                            placeholder="Example: I want to learn UI/UX design for mobile apps and product thinking."
                            className="text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {interpretation && (
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>
                        Teach suggestion: <span className="font-semibold text-foreground">{interpretation.teach?.primary?.skillName ?? 'Not confident yet'}</span>
                        {interpretation.teach?.primary ? ` (${interpretation.teach.primary.confidence}%)` : ''}
                      </p>
                      <p>
                        Learn suggestion: <span className="font-semibold text-foreground">{interpretation.learn?.primary?.skillName ?? 'Not confident yet'}</span>
                        {interpretation.learn?.primary ? ` (${interpretation.learn.primary.confidence}%)` : ''}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="skillToTeach" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Skill to teach" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {skillOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="skillToLearn" render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value ?? ''}>
                        <FormControl>
                          <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Skill to learn" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {skillOptions.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger className="h-11 shadow-sm"><SelectValue placeholder="Your proficiency level" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-muted-foreground/20 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                  <UploadCloud className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                  <p className="text-[11px] font-medium text-muted-foreground text-center">
                    <span className="font-bold text-primary">Click to upload</span> profile photo<br />
                    <span className="opacity-60">PNG, JPG up to 5MB</span>
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0 py-2">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="grid gap-1.5 leading-none">
                        <label className="text-[11px] font-medium leading-normal text-muted-foreground select-none">
                          I agree to the <Link to="/terms" className="font-bold text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="font-bold text-primary hover:underline">Privacy Policy</Link>.
                        </label>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-[2] h-11 shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Account'}

                                  <button
                                    type="button"
                                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1 pb-2"
                                    onClick={async () => {
                                      const isValid = await form.trigger(['terms']);
                                      if (!isValid) return;
                                      form.setValue('skillToTeach', undefined);
                                      form.setValue('skillToLearn', undefined);
                                      form.setValue('level', undefined);
                                      form.handleSubmit(onSubmit)();
                                    }}
                                  >
                                    Skip for now — I'll add skills later
                                  </button>
                  </Button>
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
