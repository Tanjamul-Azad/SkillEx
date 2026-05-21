import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    short?: boolean;
}

const Logo: React.FC<LogoProps> = ({
    className,
    size = 'md',
    short = false
}) => {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-4xl',
        '2xl': 'text-5xl md:text-6xl',
    };

    return (
        <div className={cn("flex items-center select-none", className)}>
            <span
                className={cn(
                    "font-headline font-black tracking-tight",
                    sizeClasses[size]
                )}
                style={{ letterSpacing: '-0.03em' }}
            >
                {short ? (
                    <>
                        <span className="text-foreground">S</span>
                        <span style={{ color: '#00E5C3' }}>X</span>
                    </>
                ) : (
                    <>
                        <span className="text-foreground">Skill</span>
                        <span style={{ color: '#00E5C3' }}>EX</span>
                    </>
                )}
            </span>
        </div>
    );
};

export default Logo;
