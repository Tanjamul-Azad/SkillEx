'use client';

import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteWrapperProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export default function ProtectedRouteWrapper({
  children,
  requiredRole,
  redirectTo = '/dashboard',
}: ProtectedRouteWrapperProps) {
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

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
