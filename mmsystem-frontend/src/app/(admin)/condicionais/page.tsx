'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, FolderCheck, MessageSquare, Pencil, Trash2, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SystemModal from '@/components/SystemModal';

// ─── Interfaces e Tipagens ─────────────────────────────────────────────────
export interface Usuario {
  id: number;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
}

export interface ProdutoCondicional {
  id: number;
  nome: string;
  preco?: number;
  coresSelecionadas?: string[] | string;
  estoque_detalhado?: Record<string, number> | string;
  estoqueDetalhado?: Record<string, number> | string;
}

export interface ItemCondicionalForm {
  produtoId: string | number;
  quantidade: number;
  corEscolhida: string;
  tamanhoEscolhido: string;
  statusItem: 'EM_CONDICIONAL' | 'VENDIDO' | 'DEVOLVIDA' | string;
}

export interface ItemCondicionalResponse {
  id?: number;
  produto?: ProdutoCondicional;
  quantidade: number;
  corEscolhida: string;
  tamanhoEscolhido: string;
  statusItem?: 'EM_CONDICIONAL' | 'VENDIDO' | 'DEVOLVIDA' | 'DISPONIVEL' | string;
}

export interface FormCondicional {
  clienteId: string | number;
  dataSaida: string;
  dataRetorno: string;
  status: 'ABERTA' | 'FINALIZADA' | 'DEVOLVIDA';
  itens: ItemCondicionalForm[];
}

export interface Condicional {
  id: number;
  usuario?: Usuario;
  cliente?: Usuario;
  valorTotal?: number;
  dataSaida: string;
  dataRetorno: string;
  status: 'ABERTA' | 'FINALIZADA' | 'DEVOLVIDA';
  itens: ItemCondicionalResponse[];
}

export interface ItemBaixaTriagem {
  id?: number;
  produtoId?: number;
  nome: string;
  corEscolhida: string;
  tamanhoEscolhido: string;
  quantidade: number;
  statusItem: 'VENDIDO' | 'DEVOLVIDA';
}

interface PageSpring<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface ModalExcluirState {
  aberto: boolean;
  id: number | null;
}

interface ApiErrorResponse {
  message?: string;
  erro?: string;
}

const TelaCondicionais: React.FC = () => {
  const [listaCondicionais, setListaCondicionais] = useState<Condicional[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [produtos, setProdutos] = useState<ProdutoCondicional[]>([]);
  
  // ─── Estados da Barra de Busca e Filtro ──────────────────────────────────
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');

  // Referência para Auto-Scroll
  const tabelaRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalElementos, setTotalElementos] = useState<number>(0);
  const tamanhoPagina = 5;

  // Controle de Abas: 'ativas' ou 'finalizadas'
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'finalizadas'>('ativas');

  // Modais de Controle
  const [modalFormAberto, setModalFormAberto] = useState<boolean>(false);
  const [modalBaixaAberto, setModalBaixaAberto] = useState<boolean>(false);
  const [sacolaParaBaixa, setSacolaParaBaixa] = useState<Condicional | null>(null);
  const [itensBaixa, setItensBaixa] = useState<ItemBaixaTriagem[]>([]); 
  const [modalExcluir, setModalExcluir] = useState<ModalExcluirState>({ aberto: false, id: null });

  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // FORMULÁRIO
  const [formCondicional, setFormCondicional] = useState<FormCondicional>({
    clienteId: '',
    dataSaida: new Date().toISOString().split('T')[0],
    dataRetorno: '',
    status: 'ABERTA',
    itens: [{ produtoId: '', quantidade: 1, corEscolhida: '', tamanhoEscolhido: '', statusItem: 'EM_CONDICIONAL' }]
  });

  // ─── Busca Paginada de Condicionais ────────────────────────────────────────
  const buscarCondicionais = useCallback(async (pagina: number = 0): Promise<void> => {
    try {
      const resCond = await api.get<PageSpring<Condicional> | Condicional[]>(`/condicionais?page=${pagina}&size=${tamanhoPagina}`);
      if (resCond.data && Array.isArray((resCond.data as PageSpring<Condicional>).content)) {
        const dados = resCond.data as PageSpring<Condicional>;
        setListaCondicionais(dados.content);
        setTotalPaginas(dados.totalPages);
        setTotalElementos(dados.totalElements);
        setPaginaAtual(dados.number);
      } else if (Array.isArray(resCond.data)) {
        setListaCondicionais(resCond.data);
      }
    } catch (err) {
      console.error("Erro ao buscar condicionais paginados:", err);
      setListaCondicionais([]);
    }
  }, [tamanhoPagina]);

  // ─── Carregar Dados Iniciais ────────────────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarDadosInicial = async () => {
      try {
        const [resCond, resCli, resProd] = await Promise.allSettled([
          api.get<PageSpring<Condicional> | Condicional[]>(`/condicionais?page=0&size=${tamanhoPagina}`),
          api.get<PageSpring<Usuario> | Usuario[]>('/usuarios?size=1000'),
          api.get<PageSpring<ProdutoCondicional> | ProdutoCondicional[]>('/produtos?size=1000')
        ]);
        
        if (montado) {
          if (resCond.status === 'fulfilled' && resCond.value.data) {
            const data = resCond.value.data;
            if (Array.isArray((data as PageSpring<Condicional>).content)) {
              setListaCondicionais((data as PageSpring<Condicional>).content);
              setTotalPaginas((data as PageSpring<Condicional>).totalPages);
              setTotalElementos((data as PageSpring<Condicional>).totalElements);
              setPaginaAtual((data as PageSpring<Condicional>).number);
            } else if (Array.isArray(data)) {
              setListaCondicionais(data);
            }
          }

          if (resCli.status === 'fulfilled' && resCli.value.data) {
            const dataCli = resCli.value.data;
            if (Array.isArray((dataCli as PageSpring<Usuario>).content)) {
              setClientes((dataCli as PageSpring<Usuario>).content);
            } else if (Array.isArray(dataCli)) {
              setClientes(dataCli);
            }
          }

          if (resProd.status === 'fulfilled' && resProd.value.data) {
            const dataProd = resProd.value.data;
            if (Array.isArray((dataProd as PageSpring<ProdutoCondicional>).content)) {
              setProdutos((dataProd as PageSpring<ProdutoCondicional>).content);
            } else if (Array.isArray(dataProd)) {
              setProdutos(dataProd);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao sincronizar ecossistema de dados:", err);
      }
    };

    carregarDadosInicial();

    return () => {
      montado = false;
    };
  }, [tamanhoPagina]);

  // ─── Navegação da Paginação ──────────────────────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarCondicionais(novaPagina);
    }
  };

  const abrirNovaSacolaForm = (): void => {
    setEditandoId(null);
    setErrosValidacao([]);
    setFormCondicional({
      clienteId: '',
      dataSaida: new Date().toISOString().split('T')[0],
      dataRetorno: '',
      status: 'ABERTA',
      itens: [{ produtoId: '', quantidade: 1, corEscolhida: '', tamanhoEscolhido: '', statusItem: 'EM_CONDICIONAL' }]
    });
    setModalFormAberto(true);
  };

  const prepararEdicaoLocal = (cond: Condicional): void => {
    setEditandoId(cond.id);
    setErrosValidacao([]);
    setFormCondicional({
      clienteId: cond.usuario?.id || cond.cliente?.id || '',
      dataSaida: cond.dataSaida || '',
      dataRetorno: cond.dataRetorno || '',
      status: cond.status || 'ABERTA',
      itens: (cond.itens || []).map(it => ({
        produtoId: it.produto?.id || '',
        quantidade: it.quantidade || 1,
        corEscolhida: it.corEscolhida || '',
        tamanhoEscolhido: it.tamanhoEscolhido || '',
        statusItem: it.statusItem || 'EM_CONDICIONAL'
      }))
    });
    setModalFormAberto(true);
  };

  const prepararBaixaIndividual = (sacola: Condicional): void => {
    if (!sacola || !sacola.itens) {
      console.error("Sacola inválida ou sem itens.");
      return;
    }
    setSacolaParaBaixa(sacola);
    setItensBaixa(sacola.itens.map(it => ({
      id: it.id,
      produtoId: it.produto?.id,
      nome: it.produto?.nome || 'Produto não identificado',
      corEscolhida: it.corEscolhida || 'Padrão',
      tamanhoEscolhido: it.tamanhoEscolhido || 'M',
      quantidade: it.quantidade || 1,
      statusItem: 'DEVOLVIDA'
    })));
    setModalBaixaAberto(true);
  };

  const handleStatusBaixaChange = (index: number, novoStatus: 'VENDIDO' | 'DEVOLVIDA'): void => {
    const novosItens = [...itensBaixa];
    novosItens[index].statusItem = novoStatus;
    setItensBaixa(novosItens);
  };

  const handleItemChange = (index: number, campo: keyof ItemCondicionalForm, valor: string | number): void => {
    const novosItens = [...formCondicional.itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };

    if (campo === 'produtoId') {
      novosItens[index].corEscolhida = '';
      novosItens[index].tamanhoEscolhido = '';
    }
    if (campo === 'corEscolhida') {
      novosItens[index].tamanhoEscolhido = '';
    }

    setFormCondicional({ ...formCondicional, itens: novosItens });
  };

  const adicionarLinhaProduto = (): void => {
    setFormCondicional({
      ...formCondicional,
      itens: [...formCondicional.itens, { produtoId: '', quantidade: 1, corEscolhida: '', tamanhoEscolhido: '', statusItem: 'EM_CONDICIONAL' }]
    });
  };

  const removerLinhaProduto = (index: number): void => {
    const filtrados = formCondicional.itens.filter((_, i) => i !== index);
    setFormCondicional({ ...formCondicional, itens: filtrados });
  };

  const obterEstoqueDisponivel = (produtoId: string | number, cor: string, tamanho: string): number => {
    const produto = produtos.find(p => String(p.id) === String(produtoId));
    if (!produto) return 0;
    
    const estoqueBruto = produto.estoque_detalhado || produto.estoqueDetalhado;
    if (!estoqueBruto) return 0;

    try {
      const estoque = typeof estoqueBruto === 'string' 
        ? (JSON.parse(estoqueBruto) as Record<string, number>)
        : estoqueBruto;

      const chave = `${cor}-${tamanho}`;
      return estoque[chave] !== undefined ? estoque[chave] : 0;
    } catch (e) {
      console.error("Erro ao mapear string JSON do estoque detalhado:", e);
      return 0;
    }
  };

  const salvarCondicional = async (): Promise<void> => {
    if (!formCondicional.clienteId || !formCondicional.dataRetorno) {
      setErrosValidacao(["Vincule um cliente e determine a data limite de devolução."]);
      return;
    }

    const dataIni = new Date(formCondicional.dataSaida);
    const dataFim = new Date(formCondicional.dataRetorno);
    const diferencaTempo = dataFim.getTime() - dataIni.getTime();
    const diferencaDias = diferencaTempo / (1000 * 3600 * 24);

    if (diferencaDias > 30 || diferencaDias < 0) {
      setErrosValidacao(["Prazo inválido! Verifique o intervalo de datas (Máx 30 dias)."]);
      return;
    }

    if (!formCondicional.itens || formCondicional.itens.length === 0) {
      setErrosValidacao(["Adicione pelo menos um produto na sacola antes de salvar."]);
      return;
    }

    const temAtributoIncompleto = formCondicional.itens.some(
      item => !item.produtoId || !item.corEscolhida || !item.tamanhoEscolhido
    );
    
    if (temAtributoIncompleto) {
      setErrosValidacao(["Atenção! Selecione a Cor e o Tamanho para todos os produtos adicionados na sacola."]);
      return;
    }

    for (let i = 0; i < formCondicional.itens.length; i++) {
      const item = formCondicional.itens[i];
      const disponivel = obterEstoqueDisponivel(item.produtoId, item.corEscolhida, item.tamanhoEscolhido);
      
      if (Number(item.quantidade) > disponivel) {
        const prodNome = produtos.find(p => String(p.id) === String(item.produtoId))?.nome || "Produto";
        setErrosValidacao([`Quantidade indisponível para ${prodNome}. Estoque atual: ${disponivel} pç(s)`]);
        return;
      }
    }

    try {
      if (editandoId) {
        await api.put(`/condicionais/${editandoId}`, formCondicional);
        setMensagemSucesso("Sacola condicional editada e salva com sucesso!");
      } else {
        await api.post('/condicionais', formCondicional);
        setMensagemSucesso("Nova sacola registrada com sucesso no sistema!");
      }
      setModalFormAberto(false);
      buscarCondicionais(paginaAtual);

      setTimeout(() => setMensagemSucesso(''), 3000);
    } catch (err) {
      const erroAxios = err as AxiosError<ApiErrorResponse>;
      const msgErro = erroAxios.response?.data?.message || erroAxios.response?.data?.erro || "Erro ao comunicar com a API do Spring Boot.";
      setErrosValidacao([msgErro]);
    }
  };

  const deletarCondicional = async (): Promise<void> => {
    if (!modalExcluir.id) return;
    try {
      await api.delete(`/condicionais/${modalExcluir.id}`);
      setMensagemSucesso('Condicional removido com sucesso!');
      setModalExcluir({ aberto: false, id: null });
      await buscarCondicionais(paginaAtual); 

      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch {
      setErrosValidacao(['Não foi possível excluir o registro.']);
    }
  };

  const finalizarBaixaItemPorItem = async (): Promise<void> => {
    if (!sacolaParaBaixa) return;
    try {
      const payloadFinalizar = {
        clienteId: sacolaParaBaixa.usuario?.id || sacolaParaBaixa.cliente?.id,
        dataSaida: sacolaParaBaixa.dataSaida,
        dataRetorno: sacolaParaBaixa.dataRetorno,
        status: 'FINALIZADA', 
        itens: itensBaixa.map(it => ({
          produtoId: it.produtoId,
          quantidade: it.quantidade,
          corEscolhida: it.corEscolhida,
          tamanhoEscolhido: it.tamanhoEscolhido,
          statusItem: it.statusItem 
        }))
      };
      
      // Chama o endpoint correto de finalização que efetua a baixa real no estoque e gera Pedido + Pagamento
      await api.put(`/condicionais/${sacolaParaBaixa.id}/finalizar`, payloadFinalizar);   

      setModalBaixaAberto(false);
      setSacolaParaBaixa(null);
      setMensagemSucesso("✨ Baixa concluída! Estoque atualizado e Venda/Pagamento gerados com sucesso!");
      buscarCondicionais(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error("Erro ao finalizar baixa no Spring Boot:", err);
      alert("Não foi possível salvar o fechamento da sacola. Verifique a conexão com o servidor.");
    }
  };

  // ─── Alerta de Prazo e WhatsApp ─────────────────────────────────────────
  const calcularPrazo = (dataRetornoStr: string) => {
    if (!dataRetornoStr) return { status: 'NORMAL', texto: 'Sem prazo', dias: 99 };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = new Date(dataRetornoStr + 'T00:00:00');
    const diffDias = Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const absDias = Math.abs(diffDias);
      return { status: 'ATRASADO', texto: `Atrasado (${absDias} ${absDias === 1 ? 'dia' : 'dias'})`, dias: diffDias };
    }
    if (diffDias === 0) {
      return { status: 'HOJE', texto: 'Vence Hoje!', dias: 0 };
    }
    return { status: 'NO_PRAZO', texto: `${diffDias} ${diffDias === 1 ? 'dia restante' : 'dias restantes'}`, dias: diffDias };
  };

  const enviarCobrancaWhatsApp = (c: Condicional) => {
    const nome = c.usuario?.nome || c.cliente?.nome || 'Cliente';
    const tel = (c.usuario?.telefone || c.cliente?.telefone || '').replace(/\D/g, '');
    const prazo = calcularPrazo(c.dataRetorno);

    const msg = `Olá, ${nome}!\n\n` +
      `Passando para lembrar da sua sacola condicional *#${c.id}* da *Maria Morena*.\n` +
      `*Data limite para retorno:* ${c.dataRetorno} (${prazo.texto}).\n\n` +
      `Já decidiu quais peças vai levar para arrasar? Se precisar de mais tempo, nos avise!`;

    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ─── Filtro Local dos Condicionais ───────────────────────────────────────
  const listaFiltrada = (Array.isArray(listaCondicionais) ? listaCondicionais : []).filter(c => {
    const atendeAba = abaAtiva === 'ativas' ? c.status === 'ABERTA' : (c.status === 'FINALIZADA' || c.status === 'DEVOLVIDA');
    const atendeStatus = statusFiltro === 'TODOS' || c.status === statusFiltro;
    
    const termo = termoBusca.toLowerCase();
    const nomeCliente = (c.usuario?.nome || c.cliente?.nome || '').toLowerCase();
    const idCond = String(c.id);
    const temProduto = (c.itens || []).some(i => (i.produto?.nome || '').toLowerCase().includes(termo));

    return atendeAba && atendeStatus && (nomeCliente.includes(termo) || idCond.includes(termo) || temProduto);
  });

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#2d3a22]">Painel de Condicionais</h1>
          <p className="text-xs text-gray-600 mt-1">Gerenciamento ágil de peças com saída condicional para prova domiciliar.</p>
        </div>

        <button 
          onClick={abrirNovaSacolaForm}
          className="bg-[#2d3a22] hover:bg-[#3d5427] text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          + Nova Sacola Condicional
        </button>
      </div>

      {/* FEEDBACKS */}
      {mensagemSucesso && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-4 text-xs font-bold max-w-5xl">
          ✓ {mensagemSucesso}
        </div>
      )}

      {errosValidacao.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-xs font-semibold max-w-5xl space-y-1">
          {errosValidacao.map((e, idx) => <p key={idx}>⚠️ {e}</p>)}
        </div>
      )}

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="flex gap-2 border-b border-gray-300 mb-4 max-w-5xl">
        <button
          type="button"
          onClick={() => setAbaAtiva('ativas')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            abaAtiva === 'ativas'
              ? 'border-[#2d3a22] text-[#2d3a22] bg-white/50'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-[#2d3a22]" />
          Condicionais Ativos ({listaCondicionais.filter(c => c.status === 'ABERTA').length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('finalizadas')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            abaAtiva === 'finalizadas'
              ? 'border-[#2d3a22] text-[#2d3a22] bg-white/50'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FolderCheck className="w-4 h-4 text-[#2d3a22]" />
          Histórico de Finalizados
        </button>
      </div>

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="mb-6 max-w-5xl">
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar sacola por código, cliente ou peça..."
          filtroValor={statusFiltro}
          onFiltroChange={setStatusFiltro}
          opcoesFiltro={[
            { label: 'Todos os Status', value: 'TODOS' },
            { label: 'Aberta', value: 'ABERTA' },
            { label: 'Finalizada', value: 'FINALIZADA' },
            { label: 'Devolvida', value: 'DEVOLVIDA' }
          ]}
        />
      </div>

      {/* TABELA DE REGISTROS */}
      <section ref={tabelaRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl flex flex-col justify-between">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#cbd0c0] text-[11px] font-bold uppercase text-gray-700 border-b border-gray-300">
                <th className="p-3">Código</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Valor Estimado</th>
                <th className="p-3">Data Início</th>
                <th className="p-3">Data Limite / Prazo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Peças Relacionadas</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic bg-white">Nenhum registro encontrado nesta aba.</td>
                </tr>
              ) : (
                listaFiltrada.map((c) => {
                  const prazo = calcularPrazo(c.dataRetorno);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="p-3 font-bold text-gray-700">#{String(c.id).padStart(3, '0')}</td>
                      <td className="p-3">
                        <p className="font-semibold text-gray-900">{c.usuario?.nome || c.cliente?.nome || '—'}</p>
                        <p className="text-[10px] text-gray-500">{c.usuario?.telefone || c.cliente?.telefone || ''}</p>
                      </td>
                      <td className="p-3 font-bold text-gray-900">
                        R$ {Number(c.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-gray-500">{c.dataSaida}</td>
                      <td className="p-3">
                        <span className="block font-medium text-gray-800">{c.dataRetorno}</span>
                        {c.status === 'ABERTA' && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-0.5 border ${
                            prazo.status === 'ATRASADO' ? 'bg-red-100 text-red-800 border-red-300' :
                            prazo.status === 'HOJE' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-green-100 text-green-800 border-green-300'
                          }`}>
                            {prazo.texto}
                          </span>
                        )}
                      </td>
                      <td className="p-3 uppercase font-mono text-[10px]">
                        <span className={`px-2 py-0.5 rounded border font-bold ${
                          c.status === 'ABERTA' ? 'bg-amber-100 text-amber-800 border-amber-300' : 
                          c.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          'bg-blue-100 text-blue-800 border-blue-300'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600 max-w-[240px]">
                        <div className="space-y-1">
                          {(c.itens || []).map((i, idx) => (
                            <div key={idx} className="text-[11px] bg-gray-50 p-1 border rounded-sm flex justify-between items-center">
                              <span className="truncate mr-1">{i.produto?.nome} <strong>({i.corEscolhida || '-'}/{i.tamanhoEscolhido || '-'})</strong></span>
                              <span className={`text-[9px] px-1 font-bold border uppercase shrink-0 ${
                                i.statusItem === 'VENDIDO' ? 'bg-green-100 border-green-300 text-green-800' : 
                                i.statusItem === 'DEVOLVIDA' || i.statusItem === 'DISPONIVEL' ? 'bg-blue-100 border-blue-300 text-blue-800' : 
                                'bg-white border-gray-300 text-gray-500'
                              }`}>
                                {i.statusItem || 'EM COND.'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {c.status === 'ABERTA' && (
                            <>
                              <button
                                onClick={() => enviarCobrancaWhatsApp(c)}
                                className="bg-[#25D366] hover:bg-[#1ebd59] text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                                title="Enviar lembrete no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-white" /> Whats
                              </button>
                              <button 
                                onClick={() => prepararBaixaIndividual(c)} 
                                className="bg-[#4a5d33] hover:bg-[#3d5427] text-white px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer transition shadow-2xs" 
                                title="Dar Baixa nas Peças e Atualizar Estoque"
                              >
                                ✓ Baixa
                              </button>
                              <button 
                                onClick={() => prepararEdicaoLocal(c)} 
                                className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black" 
                                title="Editar Sacola"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => setModalExcluir({ aberto: true, id: c.id })} 
                            className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700" 
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
        <Paginacao
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          totalElementos={totalElementos}
          onMudarPagina={mudarPagina}
        />
      </section>

      {/* MODAL: FORMULÁRIO DE CRIAÇÃO E EDIÇÃO */}
      {modalFormAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border-t-4 border-[#4a5d33]">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="font-serif text-lg text-gray-900">{editandoId ? `Editando Sacola Nº ${editandoId}` : 'Nova Sacola Condicional'}</h3>
              <button onClick={() => setModalFormAberto(false)} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Selecione a Cliente *</label>
                <select
                  value={formCondicional.clienteId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormCondicional({ ...formCondicional, clienteId: e.target.value })}
                  className="w-full border p-2 bg-gray-50 text-xs outline-none focus:border-gray-400 rounded-md"
                >
                  <option value="">Escolha uma cliente...</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>{cli.nome} {cli.telefone ? `(${cli.telefone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Data de Saída</label>
                  <input 
                    type="date" 
                    value={formCondicional.dataSaida} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({ ...formCondicional, dataSaida: e.target.value })} 
                    className="w-full border p-2 bg-gray-50 text-xs outline-none rounded-md" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Data Limite de Retorno *</label>
                  <input 
                    type="date" 
                    value={formCondicional.dataRetorno} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({ ...formCondicional, dataRetorno: e.target.value })} 
                    className="w-full border p-2 bg-gray-50 text-xs outline-none rounded-md" 
                  />
                </div>
              </div>

              {/* SESSÃO DINÂMICA DE ITENS */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500">Peças na Sacola Condicional</label>
                  <button type="button" onClick={adicionarLinhaProduto} className="text-[#4a5d33] hover:underline text-[10px] font-bold cursor-pointer">+ Adicionar Peça</button>
                </div>

                <div className="space-y-2">
                  {formCondicional.itens.map((item, idx) => {
                    const prodSelecionado = produtos.find(p => String(p.id) === String(item.produtoId));
                    let coresDisponiveisNoProduto: string[] = [];
                    let tamanhosDisponiveisNoProduto: string[] = [];

                    if (prodSelecionado) {
                      const estoqueBruto = prodSelecionado.estoque_detalhado || prodSelecionado.estoqueDetalhado;
                      if (estoqueBruto) {
                        try {
                          const estoque = typeof estoqueBruto === 'string' ? JSON.parse(estoqueBruto) : estoqueBruto;
                          const chaves = Object.keys(estoque);
                          coresDisponiveisNoProduto = Array.from(new Set(chaves.map(k => k.split('-')[0])));
                          
                          if (item.corEscolhida) {
                            tamanhosDisponiveisNoProduto = chaves
                              .filter(k => k.startsWith(item.corEscolhida + '-'))
                              .map(k => k.split('-')[1]);
                          }
                        } catch (e) {
                          console.error("Erro parsing estoque grade:", e);
                        }
                      }
                    }

                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 bg-gray-50 p-2 border rounded-md items-center">
                        <div className="col-span-6">
                          <select 
                            value={item.produtoId} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'produtoId', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none rounded"
                          >
                            <option value="">Selecione o Produto...</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <select 
                            value={item.corEscolhida} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'corEscolhida', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none rounded" 
                            disabled={!item.produtoId}
                          >
                            <option value="">Cor...</option>
                            {coresDisponiveisNoProduto.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <select 
                            value={item.tamanhoEscolhido} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'tamanhoEscolhido', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none rounded" 
                            disabled={!item.corEscolhida}
                          >
                            <option value="">Tam...</option>
                            {tamanhosDisponiveisNoProduto.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        <div className="col-span-1">
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantidade} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(idx, 'quantidade', parseInt(e.target.value, 10) || 1)} 
                            className="w-full border p-1 text-center bg-white text-xs rounded" 
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          {formCondicional.itens.length > 1 && (
                            <button type="button" onClick={() => removerLinhaProduto(idx)} className="text-red-600 font-bold hover:text-red-800 cursor-pointer">×</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex justify-end gap-2">
              <button onClick={() => setModalFormAberto(false)} className="px-4 py-2 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase hover:bg-gray-300 cursor-pointer rounded-sm">Cancelar</button>
              <button onClick={salvarCondicional} className="px-5 py-2 bg-[#4a5d33] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-md cursor-pointer rounded-sm">Salvar Mudanças</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRIAGEM COM SELETOR DE DEVOLUÇÃO / VENDA */}
      {modalBaixaAberto && sacolaParaBaixa && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#2d3a22] text-white p-6 shadow-2xl border border-[#3e4c32] max-w-xl w-full rounded-xl">
            <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-4">
              <div>
                <h3 className="font-serif text-base uppercase tracking-wider">Processar Retorno de Peças (Baixa)</h3>
                <p className="text-[11px] text-gray-300">Defina quais peças foram vendidas (baixa no estoque) e quais retornaram para a loja.</p>
              </div>
              <button onClick={() => setModalBaixaAberto(false)} className="text-white/70 hover:text-white text-xl cursor-pointer">×</button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
              {itensBaixa.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#1f2818] p-3 border border-white/10 rounded-lg gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{item.nome}</p>
                    <p className="text-[10px] text-gray-300">Grade: <span className="text-amber-300 font-bold">{item.corEscolhida} / {item.tamanhoEscolhido}</span> ({item.quantidade}x)</p>
                  </div>
                  
                  {/* SELETOR DE DESTINO DA PEÇA */}
                  <div className="w-44">
                    <select
                      value={item.statusItem}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusBaixaChange(idx, e.target.value as 'VENDIDO' | 'DEVOLVIDA')}
                      className={`w-full text-xs font-bold border p-2 rounded-md outline-none cursor-pointer ${
                        item.statusItem === 'VENDIDO' 
                          ? 'bg-emerald-600 text-white border-emerald-400' 
                          : 'bg-gray-700 text-gray-200 border-gray-500'
                      }`}
                    >
                      <option value="DEVOLVIDA">🔄 DEVOLVER (Loja)</option>
                      <option value="VENDIDO">💰 VENDIDO (Dar Baixa)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/10 rounded-lg text-xs text-gray-200 mb-4">
              ℹ️ As peças marcadas como <strong>VENDIDO</strong> darão baixa imediata no estoque e criarão automaticamente um <strong>Pedido de Venda</strong> e uma cobrança em <strong>Pagamentos</strong>.
            </div>

            <div className="pt-3 border-t border-white/20 flex justify-end gap-2">
              <button onClick={() => setModalBaixaAberto(false)} className="px-4 py-2 text-[10px] font-bold text-white/80 uppercase hover:underline cursor-pointer">Fechar</button>
              <button onClick={finalizarBaixaItemPorItem} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-md shadow-md transition cursor-pointer">Confirmar Baixa do Estoque</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {modalExcluir.aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white p-5 max-w-xs w-full rounded-sm border-t-4 border-red-600 shadow-2xl">
            <h4 className="font-serif text-base text-red-700 mb-1">⚠️ Excluir Condicional</h4>
            <p className="text-xs text-gray-600 mb-4">Confirma a remoção permanente deste registro?</p>
            <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
              <button onClick={() => setModalExcluir({ aberto: false, id: null })} className="px-3 py-1.5 bg-gray-100 text-gray-700 cursor-pointer">Voltar</button>
              <button onClick={deletarCondicional} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 cursor-pointer">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelaCondicionais;