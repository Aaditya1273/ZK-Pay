'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '~/hooks';
import { ROUTER } from '~/utils';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isLogged, isConnected } = useAuthContext();

  useEffect(() => {
    if (isLogged || !isConnected) {
      router.replace(ROUTER.home.base);
    }
  }, [isLogged, isConnected, router]);

  if (isLogged || !isConnected) return null;

  return children;
}
