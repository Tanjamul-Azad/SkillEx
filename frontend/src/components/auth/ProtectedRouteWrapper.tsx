'use client';

import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProtectedRouteWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
