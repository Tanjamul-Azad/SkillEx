
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { skills } from '@data/mock/mockData';
import { AuthGraphic } from '@/components/auth/AuthGraphic';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { GoogleIcon } from '@/components/icons/GoogleIcon';

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
    skillToTeach: z.string({ required_error: 'Please select a skill to teach.' }),
    skillToLearn: z.string({ required_error: 'Please select a skill to learn.' }),
    level: z.enum(['Beginner', 'Moderate', 'Expert'], { required_error: 'Please select your level.' }),
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
  const [formType, setFormType] = React.useState<'login' | 'register'>('login');
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
        <div className="lg:col-span-6 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
            <div className="relative mb-8 flex w-full justify-center rounded-full bg-muted p-1">
                {['login', 'register'].map((type) => (
                <button
                    key={type}
                    onClick={() => setFormType(type as 'login' | 'register')}
                    className={cn(
                    'relative z-10 w-1/2 rounded-full py-2 text-sm font-medium capitalize transition-colors',
                    formType === type ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {type}
                </button>
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
      toast({
        variant: 'destructive',
        title: isUnconfirmed ? 'Email Not Confirmed' : 'Login Failed',
        description: isUnconfirmed
          ? 'Please check your inbox and confirm your email before logging in.'
          : (result.error ?? 'Invalid credentials. Please try again.'),
      });
      setIsLoading(false);
    }
  };

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
                  <Input {...field} type="email" placeholder="your@email.com" className="pl-10" />
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
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Your password" className="pl-10 pr-10" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
            <Link to="#" className="font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>
          <Button type="submit" className="w-full font-bold gradient-bg text-primary-foreground" disabled={isLoading}>
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
        className="w-full transition-shadow hover:shadow-md"
        disabled={isGoogleLoading}
        onClick={async () => {
          setIsGoogleLoading(true);
          try { await loginWithGoogle(); }
          finally { setIsGoogleLoading(false); }
        }}
      >
        <GoogleIcon className="mr-2" />
        {isGoogleLoading ? 'Redirecting...' : 'Google'}
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
      setIsSuccess(result.needsEmailConfirmation ?? false);
      if (!result.needsEmailConfirmation) {
        // Email confirmation disabled — session is live, go to onboarding
        toast({ title: 'Account Created!', description: 'Welcome to SkiilEX!', variant: 'success' });
      }
      setIsLoading(false);
    } else {
      const isRateLimit = result.error?.toLowerCase().includes('rate limit');
      toast({
        variant: 'destructive',
        title: isRateLimit ? 'Too Many Attempts' : 'Registration Failed',
        description: isRateLimit
          ? 'You have made too many requests. Please wait a few minutes and try again.'
          : (result.error ?? 'Something went wrong. Please try again.'),
      });
      setIsLoading(false);
    }
  };
  
    if(isSuccess) {
        return (
            <div className="text-center py-4">
                <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}} transition={{type: 'spring', delay: 0.2, stiffness: 150}}>
                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                </motion.div>
                <h2 className="mt-4 text-2xl font-bold font-headline">Account Created!</h2>
                <p className="text-muted-foreground mt-2">Please check your inbox and click the confirmation link to activate your account.</p>
                <Button variant="outline" className="mt-6 w-full" onClick={() => setFormType('login')}>Back to Login</Button>
            </div>
        )
    }

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold font-headline">Create an Account</h1>
        <p className="text-muted-foreground">Start your skill exchange journey with us today.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input {...field} placeholder="Your Full Name" className="pl-10" />
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
                  <Input {...field} type="email" placeholder="your@email.com" className="pl-10" />
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
                        <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="Password" className="pl-10 pr-10" />
                        <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
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
                        <Input {...field} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" className="pl-10 pr-10" />
                        <button type="button" aria-label={showConfirmPassword ? "Hide password" : "Show password"} onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="skillToTeach" render={({field}) => (
                <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Skill you can teach" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {skills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="skillToLearn" render={({field}) => (
                <FormItem>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Skill you want to learn" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {skills.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="level" render={({field}) => (
                <FormItem className="space-y-3">
                    <FormLabel>Your general proficiency level</FormLabel>
                    <FormControl>
                        <div className="flex w-full justify-center rounded-full bg-muted p-1">
                            {(['Beginner', 'Moderate', 'Expert'] as const).map(level => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => field.onChange(level)}
                                    className={cn('w-1/2 rounded-full py-1.5 text-sm font-medium capitalize transition-colors',
                                        field.value === level ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />

            <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
                <UploadCloud className="h-8 w-8 text-muted-foreground"/>
                <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">A profile photo is recommended</p>
            </div>


            <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                        <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id="terms"/>
                        </FormControl>
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                I agree to the <Link to="#" className="font-bold text-primary hover:underline">Terms</Link> and <Link to="#" className="font-bold text-primary hover:underline">Privacy Policy</Link>.
                            </label>
                            <FormMessage />
                        </div>
                    </FormItem>
                )}
            />
            
          <Button type="submit" className="w-full font-bold gradient-bg text-primary-foreground" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </Form>
    </>
  );
}

export default AuthPage;
