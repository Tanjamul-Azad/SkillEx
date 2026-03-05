import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
    password: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
    const getStrength = (pass: string) => {
        let strength = 0;
        if (pass.length > 5) strength++;
        if (pass.length > 8) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^A-Za-z0-9]/.test(pass)) strength++;
        return strength;
    };

    const strength = getStrength(password);

    const levels = [
        { label: 'Very Weak', color: 'bg-red-500' },
        { label: 'Weak', color: 'bg-orange-500' },
        { label: 'Fair', color: 'bg-yellow-500' },
        { label: 'Good', color: 'bg-blue-500' },
        { label: 'Strong', color: 'bg-emerald-500' },
    ];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex gap-1.5 h-1">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-full flex-1 rounded-full transition-colors duration-500",
                            i < strength ? levels[strength - 1].color : "bg-muted"
                        )}
                    />
                ))}
            </div>
            <div className="flex justify-between items-center px-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                    Strength
                </span>
                <motion.span
                    key={strength}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        strength > 0 ? levels[strength - 1].color.replace('bg-', 'text-') : "text-muted-foreground"
                    )}
                >
                    {strength > 0 ? levels[strength - 1].label : ''}
                </motion.span>
            </div>
        </div>
    );
};

export default PasswordStrengthMeter;
