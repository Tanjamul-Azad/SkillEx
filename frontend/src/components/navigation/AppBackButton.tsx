import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppBackButtonProps {
  className?: string;
  fallbackTo?: string;
  label?: string;
  showLabel?: boolean;
}

export default function AppBackButton({
  className,
  fallbackTo = '/dashboard',
  label = 'Back',
  showLabel = true,
}: AppBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    const historyState = window.history.state as { idx?: number } | null;
    if (typeof historyState?.idx === 'number' && historyState.idx > 0) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: true });
  }, [fallbackTo, navigate]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleBack}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border-border/60 bg-background/70 px-3 text-xs font-bold text-muted-foreground shadow-sm backdrop-blur hover:border-primary/35 hover:bg-primary/10 hover:text-primary',
        !showLabel && 'h-9 w-9 px-0',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span>{label}</span>}
    </Button>
  );
}
