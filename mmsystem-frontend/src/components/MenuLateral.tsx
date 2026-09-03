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
  LogOut 
} from 'lucide-react';

const MenuLateral = () => {
  const pathname = usePathname();

  const menus = [
    { nome: 'Painel', rota: '/', icone: Home },
    { nome: 'Produtos', rota: '/produtos', icone: Package },
    { nome: 'Condicionais', rota: '/condicionais', icone: RefreshCw },
    { nome: 'Pagamentos Futuros', rota: '/pagamentos', icone: CreditCard },
    { nome: 'Pedidos', rota: '/pedidos', icone: ShoppingBag },
    { nome: 'Clientes', rota: '/usuarios', icone: Users },
    { nome: 'Vitrine', rota: '/vitrine', icone: Store },
  ];

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    window.location.href = '/login';
  };

  return (
    <div className="w-72 h-screen bg-[#2c3e1c] text-white flex flex-col justify-between p-6 fixed left-0 top-0 shadow-2xl z-50">
      
      <div>
        {/* SEÇÃO DA LOGO OFICIAL MANTIDA */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/escritocompleto1linha.svg"
            alt="Maria Morena Logo"
            width={180}
            height={64}
            className="h-16 w-auto mb-2"
            priority
          />
        </div>

        {/* NAVEGAÇÃO COM ÍCONES VETORIZADOS */}
        <nav className="flex flex-col gap-1.5">
          {menus.map((item) => {
            const Icone = item.icone;
            const isActive = pathname === item.rota;

            return (
              <Link
                key={item.nome}
                href={item.rota}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive 
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

      {/* RODAPÉ E LOGOUT */}
      <div className="border-t border-white/20 pt-4 flex flex-col gap-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-red-200 hover:bg-red-900/40 hover:text-white transition w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-200" />
          <span>Sair do Sistema</span>
        </button>
        <p className="text-[10px] opacity-60 italic text-center">A moda ao seu alcance.</p>
      </div>

    </div>
  );
};

export default MenuLateral;