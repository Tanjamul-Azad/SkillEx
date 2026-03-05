import React from 'react';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

interface LogoProps {
    className?: string;
    iconClassName?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Logo: React.FC<LogoProps> = ({
    className,
    iconClassName,
    showIcon = true,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-4xl',
        '2xl': 'text-5xl md:text-6xl',
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4.5 w-4.5',
        lg: 'h-5 w-5',
        xl: 'h-8 w-8',
        '2xl': 'h-10 w-10 md:h-12 md:w-12',
    };

    const iconContainerSizeClasses = {
        sm: 'h-6 w-6 rounded-lg',
        md: 'h-8 w-8 rounded-xl',
        lg: 'h-10 w-10 rounded-xl',
        xl: 'h-14 w-14 rounded-2xl',
        '2xl': 'h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-[2rem]',
    };

    return (
        <div className={cn("flex items-center gap-2.5 select-none", className)}>
            {showIcon && (
                <div className={cn(
                    "relative flex items-center justify-center bg-gradient-to-br from-primary to-secondary shadow-glow-sm transition-all duration-300 group-hover:shadow-glow",
                    iconContainerSizeClasses[size],
                    iconClassName
                )}>
                    <Zap className={cn("text-white transition-transform group-hover:-rotate-12 duration-300", iconSizeClasses[size])} />
                </div>
            )}
            <span
                className={cn(
                    "font-headline font-black tracking-tight",
                    sizeClasses[size]
                )}
                style={{ letterSpacing: '-0.03em' }}
            >
                <span className="text-foreground">Skill</span>
                <span style={{ color: '#00E5C3' }}>EX</span>
            </span>
        </div>
    );
};

export default Logo;
