'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ShoppingBag, Package, DollarSign, TrendingUp, TrendingDown, Calendar, Search } from 'lucide-react';
import api from '@/services/api';

interface DashboardMetricas {
  totalClientes: number;
  condicionaisAtivos: number;
  totalProdutos: number;
  
  totalVendasPeriodo: number;
  qtdVendasPeriodo: number;
  
  totalVendasAnterior: number;
  qtdVendasAnterior: number;
  
  percentualCrescimentoValor: number;
  percentualCrescimentoQtd: number;
}

export default function PainelPage() {
  const router = useRouter();
  const [nomeUsuario, setNomeUsuario] = useState<string>('Proprietária');
  
  const hoje = new Date().toISOString().split('T')[0];
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dataInicio, setDataInicio] = useState<string>(inicioMes);
  const [dataFim, setDataFim] = useState<string>(hoje);
  
  const [metricas, setMetricas] = useState<DashboardMetricas>({
    totalClientes: 0,
    condicionaisAtivos: 0,
    totalProdutos: 0,
    totalVendasPeriodo: 0,
    qtdVendasPeriodo: 0,
    totalVendasAnterior: 0,
    qtdVendasAnterior: 0,
    percentualCrescimentoValor: 0,
    percentualCrescimentoQtd: 0
  });
  
  const [carregando, setCarregando] = useState<boolean>(true);

  const buscarMetricas = async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      
      const response = await api.get<DashboardMetricas>(`/dashboard/metricas?${params.toString()}`);
      setMetricas(response.data);
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem('mm_user');
    if (user) {
      setNomeUsuario(user);
    }
    buscarMetricas();
  }, []); // Executa ao montar

  const formatarMoeda = (val?: number) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTicketMedio = () => {
    const total = metricas.totalVendasPeriodo || 0;
    const qtd = metricas.qtdVendasPeriodo || 1;
    return qtd > 0 ? total / qtd : 0;
  };

  const formatarPorcentagem = (valor: number) => {
    const formatado = Number(valor).toFixed(1) + '%';
    if (valor > 0) return `+${formatado}`;
    return formatado;
  };

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho e Filtros */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-sans font-bold text-[#2d3a22]">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Olá {nomeUsuario}, veja o desempenho do período comparado ao período anterior.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Data Início</label>
              <input 
                type="date" 
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3a22] transition"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Data Fim</label>
              <input 
                type="date" 
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3a22] transition"
              />
            </div>
            <button 
              onClick={buscarMetricas}
              className="px-4 py-2 bg-[#2d3a22] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1f2818] transition shadow-md"
            >
              <Search className="w-4 h-4" />
              Filtrar
            </button>
          </div>
        </div>

        {/* SEÇÃO FLUXO DE VENDAS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 border-b pb-4 mb-4">
            <TrendingUp className="w-5 h-5 text-[#2d3a22]" />
            <h2 className="text-lg font-sans font-bold text-gray-900">
              Fluxo de Vendas no Período
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Card Faturamento Selecionado */}
            <div className="p-5 rounded-2xl border bg-emerald-50/60 border-emerald-200 transition">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-emerald-800">
                  Faturamento
                </span>
                <DollarSign className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-3xl font-black text-emerald-950 mb-2">
                {carregando ? '...' : formatarMoeda(metricas.totalVendasPeriodo)}
              </h3>
              
              <div className="flex items-center mt-3 pt-3 border-t border-emerald-200/60">
                {metricas.percentualCrescimentoValor > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600 mr-1" />
                ) : metricas.percentualCrescimentoValor < 0 ? (
                   <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                ) : null}
                <span className={`text-xs font-bold ${metricas.percentualCrescimentoValor >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatarPorcentagem(metricas.percentualCrescimentoValor)} 
                </span>
                <span className="text-[10px] text-emerald-600/80 ml-2 font-medium">vs período anterior</span>
              </div>
            </div>

            {/* Total Pedidos */}
            <div className="p-5 rounded-2xl border bg-purple-50/60 border-purple-200">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-purple-800">
                  Total de Pedidos
                </span>
                <ShoppingBag className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="text-3xl font-black text-purple-950 mb-2">
                {carregando ? '...' : metricas.qtdVendasPeriodo}
              </h3>

              <div className="flex items-center mt-3 pt-3 border-t border-purple-200/60">
                {metricas.percentualCrescimentoQtd > 0 ? (
                  <TrendingUp className="w-4 h-4 text-purple-600 mr-1" />
                ) : metricas.percentualCrescimentoQtd < 0 ? (
                   <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                ) : null}
                <span className={`text-xs font-bold ${metricas.percentualCrescimentoQtd >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  {formatarPorcentagem(metricas.percentualCrescimentoQtd)} 
                </span>
                <span className="text-[10px] text-purple-600/80 ml-2 font-medium">vs período anterior</span>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="p-5 rounded-2xl border bg-amber-50/60 border-amber-200">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-amber-800">
                  Ticket Médio
                </span>
                <TrendingUp className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-3xl font-black text-amber-950 mb-2">
                {carregando ? '...' : formatarMoeda(getTicketMedio())}
              </h3>
              <div className="mt-3 pt-3 border-t border-amber-200/60">
                <p className="text-[10px] text-amber-700 font-medium">
                  Média de gasto por pedido no período
                </p>
              </div>
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
              <h2 className="text-3xl font-black text-[#2d3a22]">
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
              <h2 className="text-3xl font-black text-[#2d3a22]">
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
              <h2 className="text-3xl font-black text-[#2d3a22]">
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