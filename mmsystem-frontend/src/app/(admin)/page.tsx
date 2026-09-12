'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, ShoppingBag, Package, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import api from '@/services/api';

interface DashboardMetricas {
  totalClientes: number;
  condicionaisAtivos: number;
  totalProdutos: number;
  totalVendasMes?: number;
  totalVendasHoje?: number;
  qtdVendasMes?: number;
  qtdVendasHoje?: number;
}

export default function PainelPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState<string>('Proprietária');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODOS' | 'MES' | 'HOJE'>('TODOS');
  const [metricas, setMetricas] = useState<DashboardMetricas>({
    totalClientes: 0,
    condicionaisAtivos: 0,
    totalProdutos: 0,
    totalVendasMes: 0,
    totalVendasHoje: 0,
    qtdVendasMes: 0,
    qtdVendasHoje: 0,
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

  const formatarMoeda = (val?: number) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFaturamentoExibido = () => {
    if (filtroPeriodo === 'HOJE') return metricas.totalVendasHoje || 0;
    if (filtroPeriodo === 'MES') return metricas.totalVendasMes || 0;
    return (metricas.totalVendasMes || 0) + (metricas.totalVendasHoje || 0); // Consolidado
  };

  const getQtdPedidosExibida = () => {
    if (filtroPeriodo === 'HOJE') return metricas.qtdVendasHoje || 0;
    if (filtroPeriodo === 'MES') return metricas.qtdVendasMes || 0;
    return (metricas.qtdVendasMes || 0);
  };

  const getTicketMedio = () => {
    const total = getFaturamentoExibido();
    const qtd = getQtdPedidosExibida() || 1;
    return total / qtd;
  };

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-sans font-bold text-[#2d3a22]">
              Bem-vinda, {nomeUsuario}!
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Visão geral do desempenho, vendas e movimentações da Maria Morena.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Período */}
            <div className="flex items-center bg-white rounded-lg border border-gray-300 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFiltroPeriodo('TODOS')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition cursor-pointer ${
                  filtroPeriodo === 'TODOS' ? 'bg-[#2d3a22] text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                Geral
              </button>
              <button
                type="button"
                onClick={() => setFiltroPeriodo('MES')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition cursor-pointer ${
                  filtroPeriodo === 'MES' ? 'bg-[#2d3a22] text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => setFiltroPeriodo('HOJE')}
                className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition cursor-pointer ${
                  filtroPeriodo === 'HOJE' ? 'bg-[#2d3a22] text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                Hoje
              </button>
            </div>
          </div>
        </div>

        {/* SEÇÃO FLUXO DE VENDAS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2d3a22]" />
              <h2 className="text-lg font-sans font-bold text-gray-900">
                Fluxo de Vendas &amp; Faturamento
              </h2>
            </div>
            <span className="text-xs font-bold text-[#2d3a22] bg-[#e8ebe0] px-3 py-1 rounded-full uppercase tracking-wider">
              {filtroPeriodo === 'HOJE' ? 'Filtrado: Hoje' : filtroPeriodo === 'MES' ? 'Filtrado: Mês Atual' : 'Visão Consolidada'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Faturamento Selecionado */}
            <div className="p-4 rounded-xl border bg-emerald-50/50 border-emerald-200 transition">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {filtroPeriodo === 'HOJE' ? 'Faturamento (Hoje)' : filtroPeriodo === 'MES' ? 'Faturamento (Mês)' : 'Faturamento Total'}
                </span>
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-emerald-950">
                {carregando ? '...' : formatarMoeda(getFaturamentoExibido())}
              </h3>
              <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                {getQtdPedidosExibida()} pedido(s) registrado(s)
              </p>
            </div>

            {/* Card Vendas Hoje */}
            <div className={`p-4 rounded-xl border transition ${filtroPeriodo === 'MES' ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-blue-50/50 border-blue-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Vendas de Hoje
                </span>
                <Calendar className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-blue-950">
                {carregando ? '...' : formatarMoeda(metricas.totalVendasHoje)}
              </h3>
              <p className="text-[10px] text-blue-700 font-semibold mt-1">
                {metricas.qtdVendasHoje || 0} pedido(s) hoje
              </p>
            </div>

            {/* Total Pedidos Mês */}
            <div className="p-4 rounded-xl border bg-purple-50/50 border-purple-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                  Pedidos (Mês Atual)
                </span>
                <ShoppingBag className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-purple-950">
                {carregando ? '...' : metricas.qtdVendasMes || 0}
              </h3>
              <p className="text-[10px] text-purple-700 font-semibold mt-1">
                {formatarMoeda(metricas.totalVendasMes)} no mês
              </p>
            </div>

            {/* Ticket Médio */}
            <div className="p-4 rounded-xl border bg-amber-50/50 border-amber-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Ticket Médio
                </span>
                <TrendingUp className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-2xl font-extrabold text-amber-950">
                {carregando ? '...' : formatarMoeda(getTicketMedio())}
              </h3>
              <p className="text-[10px] text-amber-700 font-semibold mt-1">
                Média por pedido
              </p>
            </div>
          </div>
        </div>

        {/* CARTÕES DE MÉTRICAS GERAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Card Clientes */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition">
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