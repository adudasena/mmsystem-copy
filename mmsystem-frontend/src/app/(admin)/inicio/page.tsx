'use client';

import React, { useState, useEffect } from 'react';
import { Users, ShoppingBag, Package, DollarSign, TrendingUp, TrendingDown, Search, AlertCircle, BarChart3, Calendar, RefreshCw } from 'lucide-react';
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
  fiadosVencidos: number;
  condicionaisAtrasadas: number;
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
    percentualCrescimentoQtd: 0,
    fiadosVencidos: 0,
    condicionaisAtrasadas: 0
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

  const atalhos: { chave: string; rotulo: string }[] = [
    { chave: 'hoje', rotulo: 'Hoje' },
    { chave: '7dias', rotulo: '7 dias' },
    { chave: '15dias', rotulo: '15 dias' },
    { chave: 'este_mes', rotulo: 'Este mês' },
    { chave: 'mes_anterior', rotulo: 'Mês anterior' },
    { chave: 'este_ano', rotulo: 'Este ano' },
  ];

  const variacao = (valor: number) => {
    const sobe = valor > 0;
    const desce = valor < 0;
    const cor = sobe ? 'text-emerald-700 bg-emerald-50' : desce ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-100';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cor}`}>
        {sobe ? <TrendingUp className="w-3.5 h-3.5" /> : desce ? <TrendingDown className="w-3.5 h-3.5" /> : null}
        {formatarPorcentagem(valor)}
      </span>
    );
  };

  const rotuloValor = (v: number) => (tipoGrafico === 'faturamento' ? formatarMoeda(v) : `${v} ${v === 1 ? 'pedido' : 'pedidos'}`);

  return (
    <div className="mm-page" suppressHydrationWarning>
      <div className="mm-page-inner">

        {/* Cabeçalho e filtros */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-clay-600 mb-1">Olá, {nomeUsuario}</p>
              <h1 className="mm-title">Visão geral</h1>
              <p className="mm-subtitle break-words">Veja o desempenho do período comparado ao período anterior.</p>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:flex lg:items-end gap-3 w-full lg:w-auto min-w-0">
              <div className="flex flex-col min-w-0">
                <label className="mm-label">Início</label>
                <input
                  type="date"
                  max={hoje}
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setFiltroAtivo('personalizado');
                    if (erroData) setErroData(null);
                  }}
                  className="mm-input lg:w-44"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <label className="mm-label">Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setFiltroAtivo('personalizado');
                    if (erroData) setErroData(null);
                  }}
                  className="mm-input lg:w-44"
                />
              </div>
              <button
                onClick={() => validarEBuscar(dataInicio, dataFim)}
                className="mm-btn-primary w-full min-[420px]:col-span-2 lg:col-span-1 lg:w-auto"
              >
                <Search className="w-4 h-4 shrink-0" />
                Filtrar
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mr-1" />
            {atalhos.map((a) => (
              <button
                key={a.chave}
                onClick={() => aplicarAtalhoPeriodo(a.chave)}
                className={`px-3.5 h-8 rounded-full text-xs font-semibold transition border ${
                  filtroAtivo === a.chave
                    ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          {erroData && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{erroData}</span>
            </div>
          )}
        </div>

        {/* Destaques do período */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <article className="relative overflow-hidden rounded-2xl p-6 bg-linear-to-br from-brand-800 to-brand-950 text-white shadow-lg">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="relative flex items-start justify-between">
              <span className="text-sm font-medium text-brand-100/90">Faturamento</span>
              <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-clay-200" />
              </span>
            </div>
            <p className="relative text-3xl lg:text-4xl font-display font-medium mt-4 tracking-tight">
              {carregando ? '...' : formatarMoeda(metricas.totalVendasPeriodo)}
            </p>
            <div className="relative mt-4 flex items-center gap-2 text-xs text-brand-100/80">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${metricas.percentualCrescimentoValor >= 0 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                {metricas.percentualCrescimentoValor > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : metricas.percentualCrescimentoValor < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                {formatarPorcentagem(metricas.percentualCrescimentoValor)}
              </span>
              vs período anterior
            </div>
          </article>

          <article className="mm-card p-6">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-600">Total de pedidos</span>
              <span className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl lg:text-4xl font-display font-medium text-brand-900 mt-4 tracking-tight">
              {carregando ? '...' : metricas.qtdVendasPeriodo}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              {variacao(metricas.percentualCrescimentoQtd)}
              vs período anterior
            </div>
          </article>

          <article className="mm-card p-6">
            <div className="flex items-start justify-between">
              <span className="text-sm font-medium text-gray-600">Ticket médio</span>
              <span className="w-10 h-10 rounded-xl bg-clay-100 text-clay-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </span>
            </div>
            <p className="text-3xl lg:text-4xl font-display font-medium text-brand-900 mt-4 tracking-tight">
              {carregando ? '...' : formatarMoeda(getTicketMedio())}
            </p>
            <p className="mt-4 text-xs text-gray-500">Média de gasto por pedido no período</p>
          </article>
        </section>

        {/* Números gerais */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          {[
            { titulo: 'Clientes cadastrados', valor: metricas.totalClientes, Icone: Users },
            { titulo: 'Condicionais ativos', valor: metricas.condicionaisAtivos, Icone: RefreshCw },
            { titulo: 'Produtos no catálogo', valor: metricas.totalProdutos, Icone: Package },
          ].map(({ titulo, valor, Icone }) => (
            <article key={titulo} className="mm-card mm-card-hover p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
                <Icone className="w-6 h-6" />
              </span>
              <div>
                <p className="text-sm text-gray-600">{titulo}</p>
                <p className="text-2xl font-semibold text-brand-900 tabular-nums">{carregando ? '...' : valor}</p>
              </div>
            </article>
          ))}
        </section>

        {/* Gráfico de evolução */}
        <section className="mm-card p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-brand-900">Evolução do período</h2>
                <p className="text-sm text-gray-500">Faturamento e volume de vendas dia a dia</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
              {([['faturamento', 'Faturamento'], ['quantidade', 'Pedidos']] as const).map(([chave, rotulo]) => (
                <button
                  key={chave}
                  onClick={() => setTipoGrafico(chave)}
                  className={`px-4 h-9 rounded-lg text-sm font-semibold transition ${tipoGrafico === chave ? 'bg-white text-brand-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          {dadosGrafico.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-50 rounded-2xl border border-brand-100 min-h-[76px]">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 bg-brand-900 text-white rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-medium text-gray-500">Pico no período ({pontoPico.label})</span>
                  <p className="text-lg font-semibold text-brand-900">{rotuloValor(tipoGrafico === 'faturamento' ? pontoPico.faturamento : pontoPico.quantidadeVendas)}</p>
                </div>
              </div>

              <div className={`px-4 py-2 bg-white rounded-xl border border-gray-200 text-right transition-opacity duration-200 ${pontoHover ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-xs font-medium text-gray-500">{pontoHover ? `Selecionado: ${pontoHover.label}` : 'Selecionado'}</span>
                <p className="text-sm font-semibold text-brand-900">
                  {pontoHover ? rotuloValor(tipoGrafico === 'faturamento' ? pontoHover.faturamento : pontoHover.quantidadeVendas) : '-'}
                </p>
              </div>
            </div>
          )}

          <div className="relative pt-10 pb-2 px-1">
            <div className="absolute inset-x-0 top-10 bottom-10 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="border-b border-dashed border-gray-200 w-full" />
              ))}
            </div>

            {carregando ? (
              <div className="h-72 flex items-center justify-center text-sm font-medium text-gray-400">Carregando gráfico...</div>
            ) : dadosGrafico.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm font-medium text-gray-400">Nenhum dado encontrado para o período.</div>
            ) : (
              <div className="h-72 flex items-end justify-between gap-2 sm:gap-4 relative z-10 pt-10 pb-2 overflow-x-auto overflow-y-visible">
                {dadosGrafico.map((ponto, index) => {
                  const valor = tipoGrafico === 'faturamento' ? Number(ponto.faturamento) : Number(ponto.quantidadeVendas);
                  const alturaPorcentagem = Math.max(Math.round((valor / maxValorGrafico) * 75), valor > 0 ? 8 : 4);
                  const ehPico = ponto.label === pontoPico.label && valor > 0;

                  return (
                    <div
                      key={index}
                      className="flex-1 min-w-[24px] max-w-[56px] flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setPontoHover(ponto)}
                      onMouseLeave={() => setPontoHover(null)}
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 px-2.5 py-1 bg-brand-950 text-white text-xs rounded-lg shadow-lg font-semibold whitespace-nowrap z-30 pointer-events-none">
                        {rotuloValor(valor)}
                      </div>

                      <div
                        style={{ height: `${alturaPorcentagem}%` }}
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          ehPico
                            ? 'bg-linear-to-t from-clay-500 to-clay-300 shadow-md'
                            : 'bg-linear-to-t from-brand-700 to-brand-400 group-hover:from-brand-800 group-hover:to-brand-500'
                        }`}
                      />

                      <span className="text-[11px] font-medium text-gray-500 mt-2 truncate w-full text-center group-hover:text-brand-900 transition">
                        {ponto.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
            <span>Linha do tempo ({filtroAtivo === 'este_ano' ? 'meses' : 'dias'})</span>
            <span>{tipoGrafico === 'faturamento' ? 'Faturamento em R$' : 'Quantidade de pedidos'}</span>
          </div>
        </section>

      </div>
    </div>
  );
}
