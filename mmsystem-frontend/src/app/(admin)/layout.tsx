'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MenuLateral from '@/components/MenuLateral';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [montado, setMontado] = useState<boolean>(false);
  const [autorizado, setAutorizado] = useState<boolean>(false);

  useEffect(() => {
    setMontado(true);
    const token = localStorage.getItem('mm_token');
    if (token) {
      setAutorizado(true);
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#dcded0]" suppressHydrationWarning>
      {montado && autorizado ? (
        <>
          {/* Menu Fixo */}
          <MenuLateral />

          <main className="pl-72 min-h-screen">
            {children}
          </main>
        </>
      ) : null}
    </div>
  );
}
