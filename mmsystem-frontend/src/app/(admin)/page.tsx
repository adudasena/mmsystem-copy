'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function PainelPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState<string>('Proprietária');

  useEffect(() => {
    const user = localStorage.getItem('mm_user');
    if (user) {
      setNomeUsuario(user);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    router.push('/login');
  };

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#2d3a22]">
              Bem-vinda, {nomeUsuario}! 👋
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>

      </div>
    </div>
  );
}