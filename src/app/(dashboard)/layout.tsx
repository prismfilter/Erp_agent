'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [loaderDone, setLoaderDone] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading) {
      // 인증 완료 — 100% 표시 후 300ms 뒤 언마운트
      setLoaderDone(true);
      const timer = setTimeout(() => setShowLoader(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (showLoader) {
    return <LoadingScreen isDone={loaderDone} />;
  }

  if (!isAuthenticated) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
