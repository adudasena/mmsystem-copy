'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';

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
  statusItem: 'EM_CONDICIONAL' | 'VENDIDO' | 'DEVOLVIDA';
}

export interface ItemCondicionalResponse {
  id?: number;
  produto?: ProdutoCondicional;
  quantidade: number;
  corEscolhida: string;
  tamanhoEscolhido: string;
  statusItem?: 'EM_CONDICIONAL' | 'VENDIDO' | 'DEVOLVIDA';
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

  // ─── Navegação da Paginação com Auto-Scroll ──────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginasCalculado) {
      buscarCondicionais(novaPagina);
      tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      const dadosParaAtualizar = {
        clienteId: sacolaParaBaixa.usuario?.id || sacolaParaBaixa.cliente?.id,
        dataSaida: sacolaParaBaixa.dataSaida,
        dataRetorno: sacolaParaBaixa.dataRetorno,
        status: 'FINALIZADA', 
        itens: itensBaixa.map(it => ({
          id: it.id, 
          produtoId: it.produtoId,
          quantidade: it.quantidade,
          corEscolhida: it.corEscolhida,
          tamanhoEscolhido: it.tamanhoEscolhido,
          statusItem: it.statusItem 
        }))
      };
      
      await api.put(`/condicionais/${sacolaParaBaixa.id}`, dadosParaAtualizar);   

      setModalBaixaAberto(false);
      setSacolaParaBaixa(null);
      setMensagemSucesso("Baixa processada e armazenada no histórico de finalizados!");
      buscarCondicionais(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error("Erro ao finalizar baixa no Spring Boot:", err);
      alert("Não foi possível salvar o fechamento da sacola. Verifique a conexão com o servidor.");
    }
  };

  // ─── Filtro Local dos Condicionais ───────────────────────────────────────
  const listaFiltrada = (Array.isArray(listaCondicionais) ? listaCondicionais : []).filter(c => {
    const atendeAba = abaAtiva === 'ativas' ? c.status === 'ABERTA' : (c.status === 'FINALIZADA' || c.status === 'DEVOLVIDA');
    const atendeStatus = statusFiltro === 'TODOS' || c.status === statusFiltro;
    
    const termo = termoBusca.toLowerCase();
    const nomeCliente = (c.usuario?.nome || c.cliente?.nome || '').toLowerCase();
    const idCond = String(c.id);
    const temProduto = (c.itens || []).some(i => (i.produto?.nome || '').toLowerCase().includes(termo));

    const atendeBusca = nomeCliente.includes(termo) || idCond.includes(termo) || temProduto;

    return atendeAba && atendeStatus && atendeBusca;
  });

  const totalElementosCalculado = listaFiltrada.length;
  const totalPaginasCalculado = Math.ceil(totalElementosCalculado / tamanhoPagina) || 1;

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#2d3a22] tracking-wide">
            Condicionais
          </h1>
        </div>

        <button
          onClick={abrirNovaSacolaForm}
          className="bg-[#2d3a22] hover:bg-[#3d5427] text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
        >
          + Nova Sacola Condicional
        </button>
      </header>

      {mensagemSucesso && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs max-w-5xl rounded-sm">
          ✓ {mensagemSucesso}
        </div>
      )}

      {/* SEPARADOR DE TELAS (ABAS) */}
      <div className="flex gap-2 mb-4 max-w-5xl border-b border-gray-400">
        <button 
          onClick={() => { setAbaAtiva('ativas'); setPaginaAtual(0); }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${abaAtiva === 'ativas' ? 'border-b-2 border-[#4a5d33] text-black font-extrabold bg-white/40' : 'text-gray-500 hover:text-black'}`}
        >
          👜 Condicionais Ativos ({listaCondicionais.filter(c => c.status === 'ABERTA').length})
        </button>
        <button 
          onClick={() => { setAbaAtiva('finalizadas'); setPaginaAtual(0); }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${abaAtiva === 'finalizadas' ? 'border-b-2 border-[#4a5d33] text-black font-extrabold bg-white/40' : 'text-gray-500 hover:text-black'}`}
        >
          ✅ Histórico de Finalizados ({listaCondicionais.filter(c => c.status !== 'ABERTA').length})
        </button> 
      </div>

      {/* BARRA DE BUSCA E FILTROS PADRONIZADA */}
      <div className="mb-6 max-w-5xl">
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar por #código, nome do cliente ou produto..."
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
      <section ref={tabelaRef} className="bg-white rounded-sm shadow-sm border border-gray-300 overflow-hidden max-w-5xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#cbd0c0] text-[11px] font-bold uppercase text-gray-700 border-b border-gray-300">
                <th className="p-3 border-r border-gray-300">Código</th>
                <th className="p-3 border-r border-gray-300">Cliente</th>
                <th className="p-3 border-r border-gray-300">Valor Estimado</th>
                <th className="p-3 border-r border-gray-300">Data Início</th>
                <th className="p-3 border-r border-gray-300">Data Limite</th>
                <th className="p-3 border-r border-gray-300">Status Sacola</th>
                <th className="p-3 border-r border-gray-300">Peças Relacionadas (Variações)</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 italic bg-white">Nenhum registro encontrado nesta aba.</td>
                </tr>
              ) : (
                listaFiltrada.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 bg-white">
                    <td className="p-3 border-r border-gray-200 font-bold text-gray-700">{String(c.id).padStart(3, '0')}</td>
                    <td className="p-3 border-r border-gray-200 font-semibold">{c.usuario?.nome || c.cliente?.nome || '—'}</td>
                    <td className="p-3 border-r border-gray-200 font-bold text-gray-900">R$ {Number(c.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 border-r border-gray-200 text-gray-500">{c.dataSaida}</td>
                    <td className="p-3 border-r border-gray-200 text-red-700 font-bold">{c.dataRetorno}</td>
                    <td className="p-3 border-r border-gray-200 uppercase font-mono text-[10px]">
                      <span className={`px-1.5 py-0.5 border ${c.status === 'ABERTA' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 border-r border-gray-200 text-gray-600 max-w-[240px]">
                      <div className="space-y-1">
                        {(c.itens || []).map((i, idx) => (
                          <div key={idx} className="text-[11px] bg-gray-100 p-1 border rounded-sm flex justify-between items-center">
                            <span>{i.produto?.nome} <strong>({i.corEscolhida} / {i.tamanhoEscolhido})</strong></span>
                            <span className={`text-[9px] px-1 font-bold border uppercase ${i.statusItem === 'VENDIDO' ? 'bg-green-100 border-green-300 text-green-800' : i.statusItem === 'DEVOLVIDA' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}>
                              {i.statusItem || 'EM COND.'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center items-center gap-3">
                        {c.status === 'ABERTA' && (
                          <>
                            <button onClick={() => prepararEdicaoLocal(c)} className="hover:scale-110 transition cursor-pointer" title="Editar Sacola">✏️</button>
                            <button onClick={() => prepararBaixaIndividual(c)} className="text-green-600 hover:text-green-900 font-bold text-sm cursor-pointer" title="Dar Baixa nas Peças">✓</button>
                          </>
                        )}
                        <button onClick={() => setModalExcluir({ aberto: true, id: c.id })} className="text-red-500 hover:text-red-700 font-bold text-xs cursor-pointer" title="Excluir">✕</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
        {totalPaginasCalculado > 1 && (
          <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <span>
              Página <strong>{paginaAtual + 1}</strong> de <strong>{totalPaginasCalculado}</strong> (Total: {totalElementosCalculado} itens)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => mudarPagina(paginaAtual - 1)}
                disabled={paginaAtual === 0}
                className="px-3 py-1.5 border rounded font-bold uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                ← Anterior
              </button>

              {/* Botões Numéricos de Páginas */}
              {Array.from({ length: totalPaginasCalculado }, (_, index) => {
                if (index === 0 || index === totalPaginasCalculado - 1 || Math.abs(index - paginaAtual) <= 1) {
                  return (
                    <button
                      key={index}
                      onClick={() => mudarPagina(index)}
                      className={`px-3 py-1.5 border rounded font-bold text-xs cursor-pointer transition ${
                        paginaAtual === index
                          ? 'bg-[#4a5d33] text-white border-[#4a5d33]'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                } else if (
                  (index === 1 && paginaAtual > 2) ||
                  (index === totalPaginasCalculado - 2 && paginaAtual < totalPaginasCalculado - 3)
                ) {
                  return <span key={index} className="px-1 text-gray-400">...</span>;
                }
                return null;
              })}

              <button
                onClick={() => mudarPagina(paginaAtual + 1)}
                disabled={paginaAtual >= totalPaginasCalculado - 1}
                className="px-3 py-1.5 border rounded font-bold uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* MODAL: FORMULÁRIO DE CRIAÇÃO E EDIÇÃO */}
      {modalFormAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border-t-4 border-[#4a5d33]">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="font-serif text-lg text-gray-900">{editandoId ? `Editando Sacola Nº ${editandoId}` : 'Nova Sacola Condicional'}</h3>
              <button onClick={() => setModalFormAberto(false)} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {errosValidacao.length > 0 && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-600 p-2.5 text-red-900 font-semibold text-xs rounded-sm">
                  {errosValidacao.map((err, i) => <p key={i}>⚠️ {err}</p>)}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Selecione o Cliente</label>
                <select 
                  value={formCondicional.clienteId} 
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormCondicional({...formCondicional, clienteId: e.target.value})} 
                  className="w-full border p-2 bg-gray-50 text-xs outline-none focus:border-gray-400"
                >
                  <option value="">Escolha uma cliente...</option>
                  {clientes.map(cli => <option key={cli.id} value={cli.id}>{cli.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Data de Retirada</label>
                  <input 
                    type="date" 
                    value={formCondicional.dataSaida} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({...formCondicional, dataSaida: e.target.value})} 
                    className="w-full border p-1.5 bg-gray-50 text-xs outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Previsão Devolução</label>
                  <input 
                    type="date" 
                    value={formCondicional.dataRetorno} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({...formCondicional, dataRetorno: e.target.value})} 
                    className="w-full border p-1.5 bg-gray-50 text-xs outline-none" 
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold uppercase text-gray-500">Definição dos Looks e Grades</label>
                  <button type="button" onClick={adicionarLinhaProduto} className="text-[#4a5d33] hover:underline text-[10px] font-bold cursor-pointer">+ Inserir Peça</button>
                </div>

                <div className="space-y-2">
                  {formCondicional.itens.map((item, idx) => {
                    const produtoSelecionado = produtos.find(p => String(p.id) === String(item.produtoId));

                    let coresDisponiveisNoProduto: string[] = [];
                    if (produtoSelecionado && produtoSelecionado.coresSelecionadas) {
                      try {
                        coresDisponiveisNoProduto = typeof produtoSelecionado.coresSelecionadas === 'string' 
                          ? (JSON.parse(produtoSelecionado.coresSelecionadas) as string[]) 
                          : produtoSelecionado.coresSelecionadas;
                      } catch { coresDisponiveisNoProduto = []; }
                    }

                    let tamanhosDisponiveisNoProduto: string[] = [];
                    const estoqueBruto = produtoSelecionado?.estoque_detalhado || produtoSelecionado?.estoqueDetalhado;
                    if (produtoSelecionado && estoqueBruto && item.corEscolhida) {
                      try {
                        const estoqueObj = typeof estoqueBruto === 'string' 
                          ? (JSON.parse(estoqueBruto) as Record<string, number>) 
                          : estoqueBruto;
                        tamanhosDisponiveisNoProduto = Object.keys(estoqueObj)
                          .filter(chave => chave.startsWith(`${item.corEscolhida}-`))
                          .map(chave => chave.split('-')[1]);
                      } catch { tamanhosDisponiveisNoProduto = []; }
                    }

                    return (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 bg-gray-50 p-2 border rounded-sm items-center">
                        <div className="col-span-5">
                          <select 
                            value={item.produtoId} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'produtoId', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none"
                          >
                            <option value="">Selecione o Look...</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                          </select>
                        </div>

                        <div className="col-span-3">
                          <select 
                            value={item.corEscolhida} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'corEscolhida', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none" 
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
                            className="w-full border p-1 bg-white text-xs outline-none" 
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
                            className="w-full border p-1 text-center bg-white text-xs" 
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
              <button onClick={() => setModalFormAberto(false)} className="px-4 py-2 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase hover:bg-gray-300 cursor-pointer">Cancelar</button>
              <button onClick={salvarCondicional} className="px-5 py-2 bg-[#4a5d33] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-md cursor-pointer">Salvar Mudanças</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRIAGEM COM SELETOR DE DEVOLUÇÃO / VENDA */}
      {modalBaixaAberto && sacolaParaBaixa && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#526442] text-white p-6 shadow-2xl border border-[#3e4c32] max-w-xl w-full rounded-sm">
            <div className="flex justify-between items-center border-b border-white/20 pb-2 mb-4">
              <div>
                <h3 className="font-serif text-base uppercase tracking-wider">Processar Retorno de Peças</h3>
                <p className="text-[11px] text-gray-300">Defina o destino individualizado de cada look retornado.</p>
              </div>
              <button onClick={() => setModalBaixaAberto(false)} className="text-white/70 hover:text-white text-xl cursor-pointer">×</button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
              {itensBaixa.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[#425235] p-3 border border-[#37452c] rounded-sm gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{item.nome}</p>
                    <p className="text-[10px] text-gray-300">Grade: <span className="text-amber-300 font-bold">{item.corEscolhida} / {item.tamanhoEscolhido}</span> ({item.quantidade}x)</p>
                  </div>
                  
                  {/* SELETOR DE DESTINO DA PEÇA */}
                  <div className="w-40">
                    <select
                      value={item.statusItem}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusBaixaChange(idx, e.target.value as 'VENDIDO' | 'DEVOLVIDA')}
                      className="w-full bg-[#526442] text-white text-xs border border-white/40 p-1.5 rounded-xs outline-none focus:border-white"
                    >
                      <option value="DEVOLVIDA">🔄 DEVOLVER (Estoque)</option>
                      <option value="VENDIDO">💰 VENDIDO</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/20 flex justify-end gap-2">
              <button onClick={() => setModalBaixaAberto(false)} className="px-4 py-2 text-[10px] font-bold text-white/80 uppercase hover:underline cursor-pointer">Fechar</button>
              <button onClick={finalizarBaixaItemPorItem} className="px-5 py-2 bg-white text-gray-900 text-[10px] font-bold uppercase hover:bg-gray-100 shadow-md transition cursor-pointer">Confirmar Baixa do Estoque</button>
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