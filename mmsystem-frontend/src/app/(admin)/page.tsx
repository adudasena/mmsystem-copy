'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShoppingBag, Package } from 'lucide-react';
import api from '@/services/api';

interface DashboardMetricas {
  totalClientes: number;
  condicionaisAtivos: number;
  totalProdutos: number;
}

export default function PainelPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState<string>('Proprietária');
  const [metricas, setMetricas] = useState<DashboardMetricas>({
    totalClientes: 0,
    condicionaisAtivos: 0,
    totalProdutos: 0,
  });
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    const user = localStorage.getItem('mm_user');
    if (user) {
      setNomeUsuario(user);
    }

    const buscarMetricas = async () => {
      try {
        const response = await api.get<DashboardMetricas>('/dashboard/metricas');
        setMetricas(response.data);
      } catch (err) {
        console.error('Erro ao carregar métricas do dashboard:', err);
      } finally {
        setCarregando(false);
      }
    };

    buscarMetricas();
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
            <p className="text-sm text-gray-600 mt-1">
              Visão geral do desempenho e movimentações da Maria Morena.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>

        {/* CARTÕES DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          
          {/* Card Clientes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Clientes Cadastrados
              </p>
              <h2 className="text-3xl font-extrabold text-[#2d3a22]">
                {carregando ? '...' : metricas.totalClientes}
              </h2>
            </div>
            <div className="p-3 bg-[#e8ebe0] rounded-xl text-[#2d3a22]">
              <Users className="w-7 h-7" />
            </div>
          </div>

          {/* Card Condicionais Ativos */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Condicionais Ativos
              </p>
              <h2 className="text-3xl font-extrabold text-[#2d3a22]">
                {carregando ? '...' : metricas.condicionaisAtivos}
              </h2>
            </div>
            <div className="p-3 bg-[#e8ebe0] rounded-xl text-[#2d3a22]">
              <ShoppingBag className="w-7 h-7" />
            </div>
          </div>

          {/* Card Produtos Cadastrados */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                Produtos no Catálogo
              </p>
              <h2 className="text-3xl font-extrabold text-[#2d3a22]">
                {carregando ? '...' : metricas.totalProdutos}
              </h2>
            </div>
            <div className="p-3 bg-[#e8ebe0] rounded-xl text-[#2d3a22]">
              <Package className="w-7 h-7" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}