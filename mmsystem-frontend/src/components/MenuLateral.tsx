'use client';

import React, { useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  RefreshCw,
  CreditCard,
  ShoppingBag,
  Users,
  Store,
  LogOut,
  X,
  ArrowUpRight,
} from 'lucide-react';

interface MenuLateralProps {
  aberto?: boolean;
  onFechar?: () => void;
}

const MenuLateral = ({ aberto = false, onFechar }: MenuLateralProps) => {
  const pathname = usePathname();
  // Lê o nome salvo no login sem causar divergência de hidratação (servidor devolve vazio).
  const usuario = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem('mm_user') || '',
    () => ''
  );

  const menus = [
    { nome: 'Painel', rota: '/inicio', icone: LayoutDashboard },
    { nome: 'Produtos', rota: '/produtos', icone: Package },
    { nome: 'Pedidos', rota: '/pedidos', icone: ShoppingBag },
    { nome: 'Condicionais', rota: '/condicionais', icone: RefreshCw },
    { nome: 'Pagamentos', rota: '/pagamentos', icone: CreditCard },
    { nome: 'Clientes', rota: '/usuarios', icone: Users },
  ];

  const handleLogout = () => {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
    localStorage.removeItem('mm_perfil');
    window.location.href = '/login';
  };

  const iniciais = (usuario || 'MM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <>
      <div
        className={`fixed inset-0 bg-brand-950/50 backdrop-blur-[2px] z-40 lg:hidden transition-opacity duration-200 ${aberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onFechar}
        aria-hidden={!aberto}
      />

      <aside
        className={`w-72 h-screen bg-linear-to-b from-brand-900 to-brand-950 text-white flex flex-col justify-between px-4 pt-6 pb-5 fixed left-0 top-0 shadow-xl z-50
          transform transition-transform duration-300 ease-out
          ${aberto ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
      >
        <div className="min-h-0">
          <div className="mb-8 flex items-center justify-between gap-2 px-2">
            <Image
              src="/escritocompleto1linha.svg"
              alt="Maria Morena"
              width={805} height={123}
              className="w-52 h-auto"
              priority
            />
            <button
              type="button"
              onClick={onFechar}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="px-3 mb-2 text-[11px] font-semibold tracking-widest uppercase text-brand-300/80">Gestão</p>

          <nav className="flex flex-col gap-1">
            {menus.map((item) => {
              const Icone = item.icone;
              const ativo = pathname === item.rota;

              return (
                <Link
                  key={item.nome}
                  href={item.rota}
                  onClick={onFechar}
                  aria-current={ativo ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 px-3 h-11 rounded-xl text-sm transition-all duration-150 ${
                    ativo
                      ? 'bg-white/12 text-white font-semibold shadow-xs'
                      : 'text-white/70 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {ativo && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-clay-300" />}
                  <Icone className={`w-[18px] h-[18px] shrink-0 transition ${ativo ? 'text-clay-200' : 'text-white/60 group-hover:text-white'}`} />
                  <span>{item.nome}</span>
                </Link>
              );
            })}
          </nav>

          <p className="px-3 mt-6 mb-2 text-[11px] font-semibold tracking-widest uppercase text-brand-300/80">Loja</p>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFechar}
            className="group flex items-center gap-3 px-3 h-11 rounded-xl text-sm text-white/70 hover:bg-white/6 hover:text-white transition"
          >
            <Store className="w-[18px] h-[18px] shrink-0 text-white/60 group-hover:text-white" />
            <span className="flex-1">Ver vitrine</span>
            <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
          </Link>
        </div>

        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <span className="w-9 h-9 rounded-full bg-clay-200 text-brand-900 text-xs font-bold flex items-center justify-center shrink-0">
              {iniciais}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{usuario || 'Maria Morena'}</p>
              <p className="text-[11px] text-white/50 italic">A moda ao seu alcance.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default MenuLateral;
