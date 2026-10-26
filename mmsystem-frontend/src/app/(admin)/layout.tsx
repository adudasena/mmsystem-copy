'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import MenuLateral from '@/components/MenuLateral';
import WhatsAppAvisoConexao from '@/components/WhatsAppAvisoConexao';

const PERFIS_ADMIN = ['ROLE_PROPRIETARIA', 'ROLE_FUNCIONARIO', 'PROPRIETARIA', 'FUNCIONARIO'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [montado, setMontado] = useState<boolean>(false);
  const [autorizado, setAutorizado] = useState<boolean>(false);
  const [menuAberto, setMenuAberto] = useState<boolean>(false);

  useEffect(() => {
    setMontado(true);
    const token = localStorage.getItem('mm_token');
    const perfil = localStorage.getItem('mm_perfil') || '';

    if (!token) {
      router.push('/login');
      return;
    }

    if (perfil && !PERFIS_ADMIN.includes(perfil)) {
      localStorage.removeItem('mm_token');
      localStorage.removeItem('mm_user');
      localStorage.removeItem('mm_perfil');
      router.push('/login');
      return;
    }

    setAutorizado(true);
  }, [router]);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  return (
    <div className="min-h-screen" suppressHydrationWarning>
      {montado && autorizado ? (
        <>
          <MenuLateral aberto={menuAberto} onFechar={() => setMenuAberto(false)} />

          <header className="lg:hidden sticky top-0 z-30 bg-brand-900/95 backdrop-blur text-white px-3 h-14 flex items-center gap-2 shadow-md">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="p-2 rounded-xl hover:bg-white/10 transition min-h-11 min-w-11 flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Image src="/escritocompleto1linha.svg" alt="Maria Morena" width={805} height={123} className="w-40 h-auto mx-auto -translate-x-5" />
          </header>

          <main className="lg:pl-72 min-h-screen min-w-0 overflow-x-hidden">
            <WhatsAppAvisoConexao />
            {children}
          </main>
        </>
      ) : null}
    </div>
  );
}
