'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  RefreshCw,
  CreditCard,
  ShoppingBag,
  Users,
  Store,
  LogOut,
  X
} from 'lucide-react';

interface MenuLateralProps {
  aberto?: boolean;
  onFechar?: () => void;
}

const MenuLateral = ({ aberto = false, onFechar }: MenuLateralProps) => {
  const pathname = usePathname();

  const menus = [
    { nome: 'Painel', rota: '/', icone: Home },
    { nome: 'Produtos', rota: '/produtos', icone: Package },
    { nome: 'Condicionais', rota: '/condicionais', icone: RefreshCw },
    { nome: 'Pagamentos', rota: '/pagamentos', icone: CreditCard },
    { nome: 'Pedidos', rota: '/pedidos', icone: ShoppingBag },
    { nome: 'Clientes', rota: '/usuarios', icone: Users },
    { nome: 'Vitrine', rota: '/vitrine', icone: Store },
  ];

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    localStorage.removeItem('mm_perfil');
    window.location.href = '/login';
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${aberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onFechar}
        aria-hidden={!aberto}
      />

      <aside
        className={`w-72 h-screen bg-[#2c3e1c] text-white flex flex-col justify-between p-6 fixed left-0 top-0 shadow-2xl z-50
          transform transition-transform duration-200
          ${aberto ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <div>
          <div className="mb-6 flex items-start justify-between gap-2">
            <div className="flex flex-col items-center flex-1">
              <Image
                src="/escritocompleto1linha.svg"
                alt="Maria Morena Logo"
                width={180}
                height={64}
                className="h-14 w-auto mb-2"
                priority
              />
            </div>
            <button
              type="button"
              onClick={onFechar}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5">
            {menus.map((item) => {
              const Icone = item.icone;
              const isActive = pathname === item.rota;

              return (
                <Link
                  key={item.nome}
                  href={item.rota}
                  onClick={onFechar}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all min-h-11 ${isActive
                      ? 'bg-white/15 border-l-4 border-[#dcded0] shadow-inner font-bold'
                      : 'hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                >
                  <Icone className="w-5 h-5 text-white" />
                  <span className="font-medium text-sm text-white">
                    {item.nome}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/20 pt-4 flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-red-200 hover:bg-red-900/40 hover:text-white transition w-full cursor-pointer min-h-11"
          >
            <LogOut className="w-4 h-4 text-red-200" />
            <span>Sair do Sistema</span>
          </button>
          <p className="text-[10px] opacity-60 italic text-center">A moda ao seu alcance.</p>
        </div>
      </aside>
    </>
  );
};

export default MenuLateral;
