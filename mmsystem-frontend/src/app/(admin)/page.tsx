'use client';

import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, Package, DollarSign, TrendingUp, TrendingDown, Search, AlertCircle, BarChart3, Calendar } from 'lucide-react';
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

interface GraficoPonto {
  label: string;
  data: string;
  faturamento: number;
  quantidadeVendas: number;
}

export default function PainelPage() {
  const [nomeUsuario, setNomeUsuario] = useState<string>('Proprietária');
  
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const hoje = getLocalDateString(now);
  const inicioMes = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));

  const [dataInicio, setDataInicio] = useState<string>(inicioMes);
  const [dataFim, setDataFim] = useState<string>(hoje);
  const [erroData, setErroData] = useState<string | null>(null);
  const [filtroAtivo, setFiltroAtivo] = useState<string>('este_mes');
  
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

  const [dadosGrafico, setDadosGrafico] = useState<GraficoPonto[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<'faturamento' | 'quantidade'>('faturamento');
  const [pontoHover, setPontoHover] = useState<GraficoPonto | null>(null);
  
  const [carregando, setCarregando] = useState<boolean>(true);

  const buscarMetricas = async (ini?: string, fim?: string) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      const dtIni = typeof ini === 'string' ? ini : dataInicio;
      const dtFim = typeof fim === 'string' ? fim : dataFim;

      if (dtIni) params.append('dataInicio', dtIni);
      if (dtFim) params.append('dataFim', dtFim);
      
      const [resMetricas, resGrafico] = await Promise.all([
        api.get<DashboardMetricas>(`/dashboard/metricas?${params.toString()}`),
        api.get<GraficoPonto[]>(`/dashboard/grafico?${params.toString()}`)
      ]);

      setMetricas(resMetricas.data);
      setDadosGrafico(resGrafico.data || []);
    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setCarregando(false);
    }
  };

  const aplicarAtalhoPeriodo = (chave: string) => {
    setFiltroAtivo(chave);
    const d = new Date();
    let ini = '';
    let fim = getLocalDateString(d);

    if (chave === 'hoje') {
      ini = fim;
    } else if (chave === '7dias') {
      const d7 = new Date();
      d7.setDate(d.getDate() - 6);
      ini = getLocalDateString(d7);
    } else if (chave === '15dias') {
      const d15 = new Date();
      d15.setDate(d.getDate() - 14);
      ini = getLocalDateString(d15);
    } else if (chave === 'este_mes') {
      ini = getLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
    } else if (chave === 'mes_anterior') {
      const mesAntInicio = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const mesAntFim = new Date(d.getFullYear(), d.getMonth(), 0);
      ini = getLocalDateString(mesAntInicio);
      fim = getLocalDateString(mesAntFim);
    } else if (chave === 'este_ano') {
      ini = getLocalDateString(new Date(d.getFullYear(), 0, 1));
    }

    setDataInicio(ini);
    setDataFim(fim);
    setErroData(null);
    buscarMetricas(ini, fim);
  };

  const validarEBuscar = (iniStr?: string, fimStr?: string) => {
    const dtIni = typeof iniStr === 'string' ? iniStr : dataInicio;
    const dtFim = typeof fimStr === 'string' ? fimStr : dataFim;

    if (dtIni && dtIni > hoje) {
      setErroData('A data de início não pode ser uma data futura.');
      return;
    }

    if (dtIni && dtFim && dtFim < dtIni) {
      setErroData('A data final não pode ser menor que a data de início.');
      return;
    }

    setFiltroAtivo('personalizado');
    setErroData(null);
    buscarMetricas(dtIni, dtFim);
  };

  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const user = localStorage.getItem('mm_user');
    if (user) {
      setNomeUsuario(user);
    }
  }, []);

  useEffect(() => {
    if (montado) {
      validarEBuscar(dataInicio, dataFim);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [montado]);

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

  const maxValorGrafico = Math.max(
    ...dadosGrafico.map(p => tipoGrafico === 'faturamento' ? Number(p.faturamento) : Number(p.quantidadeVendas)),
    1
  );

  const pontoPico = dadosGrafico.reduce((max, p) => {
    const val = tipoGrafico === 'faturamento' ? p.faturamento : p.quantidadeVendas;
    const maxVal = tipoGrafico === 'faturamento' ? max.faturamento : max.quantidadeVendas;
    return val > maxVal ? p : max;
  }, dadosGrafico[0] || { label: '-', faturamento: 0, quantidadeVendas: 0 });

  return (
    <div className="p-4 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho e Filtros */}
        <div className="flex flex-col bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
                  max={hoje}
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setFiltroAtivo('personalizado');
                    if (erroData) setErroData(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3a22] transition"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setFiltroAtivo('personalizado');
                    if (erroData) setErroData(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d3a22] transition"
                />
              </div>
              <button 
                onClick={() => validarEBuscar(dataInicio, dataFim)}
                className="px-4 py-2 bg-[#2d3a22] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1f2818] transition shadow-md"
              >
                <Search className="w-4 h-4" />
                Filtrar
              </button>
            </div>
          </div>

          {/* Botões Pílula de Atalho de Períodos Rápidos */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[#2d3a22]" /> Atalhos:
            </span>

            <button
              onClick={() => aplicarAtalhoPeriodo('hoje')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === 'hoje' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => aplicarAtalhoPeriodo('7dias')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === '7dias' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => aplicarAtalhoPeriodo('15dias')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === '15dias' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Últimos 15 dias
            </button>
            <button
              onClick={() => aplicarAtalhoPeriodo('este_mes')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === 'este_mes' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Este Mês
            </button>
            <button
              onClick={() => aplicarAtalhoPeriodo('mes_anterior')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === 'mes_anterior' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => aplicarAtalhoPeriodo('este_ano')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${filtroAtivo === 'este_ano' ? 'bg-[#2d3a22] text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Este Ano
            </button>
          </div>

          {erroData && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{erroData}</span>
            </div>
          )}
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

        {/* SEÇÃO GRÁFICO DE EVOLUÇÃO ALINHADO À IDENTIDADE VISUAL DA LOJA */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#2d3a22]" />
              <div>
                <h2 className="text-lg font-sans font-bold text-gray-900">
                  Evolução do Período Selecionado
                </h2>
                <p className="text-xs text-gray-500">
                  Acompanhe a curva de faturamento e volume de vendas dia a dia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setTipoGrafico('faturamento')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tipoGrafico === 'faturamento' ? 'bg-[#2d3a22] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Faturamento (R$)
              </button>
              <button
                onClick={() => setTipoGrafico('quantidade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tipoGrafico === 'quantidade' ? 'bg-[#2d3a22] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Qtd. Pedidos
              </button>
            </div>
          </div>

          {/* Destaque do Pico e Card Selecionado (Tamanho Fixo Sem Treme-Treme) */}
          {dadosGrafico.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#f6f7f2] rounded-xl border border-[#e2e5d9] min-h-[72px]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2d3a22] text-white rounded-lg shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                    Pico no Período ({pontoPico.label})
                  </span>
                  <p className="text-base font-extrabold text-[#2d3a22]">
                    {tipoGrafico === 'faturamento' ? formatarMoeda(pontoPico.faturamento) : `${pontoPico.quantidadeVendas} pedidos`}
                  </p>
                </div>
              </div>

              {/* Box Selecionado Fixo: visibilidade controlada sem alterar layout/altura */}
              <div className={`px-4 py-2 bg-white rounded-lg border border-gray-200 text-right shadow-sm transition-opacity duration-200 ${pontoHover ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  {pontoHover ? `SELECIONADO: ${pontoHover.label}` : 'SELECIONADO'}
                </span>
                <p className="text-sm font-extrabold text-[#2d3a22]">
                  {pontoHover ? (tipoGrafico === 'faturamento' ? formatarMoeda(pontoHover.faturamento) : `${pontoHover.quantidadeVendas} pedidos`) : '-'}
                </p>
              </div>
            </div>
          )}

          {/* Gráfico Visual Fluido e Alinhado à Marca Maria Morena */}
          <div className="relative pt-12 pb-2 px-2">
            
            {/* Linhas de Grade de Fundo Suaves */}
            <div className="absolute inset-x-0 top-12 bottom-10 flex flex-col justify-between pointer-events-none opacity-30">
              <div className="border-b border-gray-300 w-full border-dashed" />
              <div className="border-b border-gray-300 w-full border-dashed" />
              <div className="border-b border-gray-300 w-full border-dashed" />
              <div className="border-b border-gray-300 w-full border-dashed" />
            </div>

            {carregando ? (
              <div className="h-72 flex items-center justify-center text-sm font-bold text-gray-400">
                Carregando gráfico...
              </div>
            ) : dadosGrafico.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm font-bold text-gray-400">
                Nenhum dado encontrado para o período.
              </div>
            ) : (
              <div className="h-72 flex items-end justify-between gap-2 sm:gap-4 relative z-10 pt-10 pb-2 overflow-x-auto overflow-y-visible">
                {dadosGrafico.map((ponto, index) => {
                  const valor = tipoGrafico === 'faturamento' ? Number(ponto.faturamento) : Number(ponto.quantidadeVendas);
                  // Escala máxima de 75% para garantir espaço livre de sobra para o tooltip sem cortar no topo
                  const alturaPorcentagem = Math.max(Math.round((valor / maxValorGrafico) * 75), valor > 0 ? 8 : 4);
                  const ehPico = ponto.label === pontoPico.label && valor > 0;

                  return (
                    <div 
                      key={index} 
                      className="flex-1 min-w-[24px] max-w-[56px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setPontoHover(ponto)}
                      onMouseLeave={() => setPontoHover(null)}
                    >
                      {/* Tooltip Absoluto Flutuante Sem Corte (z-30) */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 bg-[#2d3a22] text-white text-[11px] rounded-lg shadow-xl font-bold whitespace-nowrap z-30 pointer-events-none border border-[#4c5f3a]">
                        {tipoGrafico === 'faturamento' ? formatarMoeda(valor) : `${valor} ${valor === 1 ? 'pedido' : 'pedidos'}`}
                      </div>

                      {/* Barra Estilo Maria Morena (Verde Escuro Brand & Esmeralda) */}
                      <div 
                        style={{ height: `${alturaPorcentagem}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 relative ${
                          ehPico 
                            ? 'bg-gradient-to-t from-[#1b2614] to-emerald-600 shadow-md ring-2 ring-emerald-300' 
                            : 'bg-gradient-to-t from-[#2d3a22] to-[#4c5f3a] group-hover:from-emerald-700 group-hover:to-emerald-500'
                        }`}
                      >
                        {valor > 0 && (
                          <div className="absolute top-1 inset-x-0 h-1 bg-white/30 rounded-full mx-1" />
                        )}
                      </div>

                      {/* Rótulo Eixo X */}
                      <span className="text-[10px] font-bold text-gray-500 mt-2 truncate w-full text-center group-hover:text-[#2d3a22] transition">
                        {ponto.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
            <span className="font-semibold text-gray-600">Linha do Tempo ({filtroAtivo === 'este_ano' ? 'Meses' : 'Dias'})</span>
            <span className="font-semibold text-gray-600">{tipoGrafico === 'faturamento' ? 'Faturamento em R$' : 'Quantidade de Pedidos'}</span>
          </div>

        </div>

      </div>
    </div>
  );
}