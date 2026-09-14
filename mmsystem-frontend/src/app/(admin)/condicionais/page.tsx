'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, FolderCheck, MessageSquare, Pencil, Trash2, AlertCircle, CheckCircle2, Search, Info, RotateCcw } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SystemModal from '@/components/SystemModal';
import { formatErrorMessage } from '@/utils/errorUtils';

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

  // Controle de Abas: 'ativas', 'finalizadas' ou 'excluidas'
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'finalizadas' | 'excluidas'>('ativas');

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
  const buscarCondicionais = useCallback(async (pagina: number = 0, tipoAba: 'ativas' | 'finalizadas' | 'excluidas' = abaAtiva): Promise<void> => {
    try {
      const url = tipoAba === 'excluidas'
        ? `/condicionais/excluidos?page=${pagina}&size=${tamanhoPagina}`
        : `/condicionais?page=${pagina}&size=${tamanhoPagina}`;

      const resCond = await api.get<PageSpring<Condicional> | Condicional[]>(url);
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
  }, [tamanhoPagina, abaAtiva]);

  const restaurarCondicional = async (id: number): Promise<void> => {
    try {
      await api.put(`/condicionais/${id}/restaurar`);
      setMensagemSucesso('Sacola condicional restaurada com sucesso!');
      buscarCondicionais(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao restaurar condicional:', err);
      setErrosValidacao(['Não foi possível restaurar a sacola condicional.']);
    }
  };

  const confirmarExclusao = async (): Promise<void> => {
    if (!modalExcluir.id) return;
    try {
      await api.delete(`/condicionais/${modalExcluir.id}`);
      setMensagemSucesso('Sacola condicional movida para a lixeira com sucesso!');
      setModalExcluir({ aberto: false, id: null });
      buscarCondicionais(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir condicional:', err);
      const msg = formatErrorMessage(err, 'Não foi possível mover a sacola condicional para a lixeira.');
      setErrosValidacao([msg]);
      setModalExcluir({ aberto: false, id: null });
    }
  };

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

  useEffect(() => {
    buscarCondicionais(0, abaAtiva);
  }, [abaAtiva, buscarCondicionais]);

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
    if (formCondicional.itens.length > 0) {
      const ultimaPeca = formCondicional.itens[formCondicional.itens.length - 1];
      if (!ultimaPeca.produtoId || !ultimaPeca.corEscolhida || !ultimaPeca.tamanhoEscolhido || !ultimaPeca.quantidade || Number(ultimaPeca.quantidade) <= 0) {
        setErrosValidacao(["Atenção! Selecione o Produto, Cor, Tamanho e Quantidade da peça atual antes de adicionar uma nova."]);
        return;
      }
    }
    setErrosValidacao([]);
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

  const exibirErroModal = (mensagens: string[]): void => {
    setErrosValidacao(mensagens);
    setTimeout(() => {
      document.getElementById('modal-condicional-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const salvarCondicional = async (): Promise<void> => {
    if (!formCondicional.clienteId || !formCondicional.dataRetorno) {
      exibirErroModal(["Vincule um cliente e determine a data limite de devolução."]);
      return;
    }

    const dataIni = new Date(formCondicional.dataSaida);
    const dataFim = new Date(formCondicional.dataRetorno);
    const diferencaTempo = dataFim.getTime() - dataIni.getTime();
    const diferencaDias = diferencaTempo / (1000 * 3600 * 24);

    if (diferencaDias > 30 || diferencaDias < 0) {
      exibirErroModal(["Prazo inválido! Verifique o intervalo de datas (Máx 30 dias)."]);
      return;
    }

    if (!formCondicional.itens || formCondicional.itens.length === 0) {
      exibirErroModal(["Adicione pelo menos um produto na sacola antes de salvar."]);
      return;
    }

    const temAtributoIncompleto = formCondicional.itens.some(
      item => !item.produtoId || !item.corEscolhida || !item.tamanhoEscolhido
    );
    
    if (temAtributoIncompleto) {
      exibirErroModal(["Atenção! Selecione a Cor e o Tamanho para todos os produtos adicionados na sacola."]);
      return;
    }

    for (let i = 0; i < formCondicional.itens.length; i++) {
      const item = formCondicional.itens[i];
      const disponivel = obterEstoqueDisponivel(item.produtoId, item.corEscolhida, item.tamanhoEscolhido);
      
      if (Number(item.quantidade) > disponivel) {
        const prodNome = produtos.find(p => String(p.id) === String(item.produtoId))?.nome || "Produto";
        exibirErroModal([`Quantidade indisponível para ${prodNome}. Estoque atual: ${disponivel} pç(s)`]);
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
      console.error("Erro ao salvar condicional:", err);
      const msgErro = formatErrorMessage(err, "Não foi possível salvar a sacola condicional.");
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
    } catch (err) {
      console.error("Erro ao deletar condicional:", err);
      const msg = formatErrorMessage(err, 'Não foi possível excluir o registro.');
      setErrosValidacao([msg]);
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
      setMensagemSucesso("Baixa concluída! Estoque atualizado e Venda/Pagamento gerados com sucesso!");
      buscarCondicionais(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error("Erro ao finalizar baixa:", err);
      const msg = formatErrorMessage(err, "Não foi possível salvar o fechamento da sacola.");
      setErrosValidacao([msg]);
      setModalBaixaAberto(false);
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
    const atendeAba = abaAtiva === 'excluidas'
      ? true
      : (abaAtiva === 'ativas' ? c.status === 'ABERTA' : (c.status === 'FINALIZADA' || c.status === 'DEVOLVIDA'));
    const atendeStatus = statusFiltro === 'TODOS' || c.status === statusFiltro;
    
    const termo = termoBusca.toLowerCase();
    const nomeCliente = (c.usuario?.nome || c.cliente?.nome || '').toLowerCase();
    const idCond = String(c.id);
    const temProduto = (c.itens || []).some(i => (i.produto?.nome || '').toLowerCase().includes(termo));

    return atendeAba && atendeStatus && (nomeCliente.includes(termo) || idCond.includes(termo) || temProduto);
  });

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-sans font-bold text-[#2d3a22]">Painel de Condicionais</h1>
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
          <div className="bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {errosValidacao.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 p-3 text-red-900 font-semibold text-xs rounded-lg shadow-sm space-y-1 mb-4">
            {errosValidacao.map((e, idx) => (
              <p key={idx} className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{e}</span>
              </p>
            ))}
          </div>
        )}

        {/* BARRA DE PESQUISA E FILTROS */}
        <div className="mb-6">
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
        <section ref={tabelaRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('ativas')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  abaAtiva === 'ativas'
                    ? 'bg-[#2d3a22] text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Condicionais Ativos
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('finalizadas')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  abaAtiva === 'finalizadas'
                    ? 'bg-[#2d3a22] text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Histórico de Finalizados
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('excluidas')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'excluidas'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Sacolas Removidas (Lixeira)
              </button>
            </div>

            <span className="text-[11px] font-bold text-gray-500 uppercase">
              TOTAL: {totalElementos > 0 ? totalElementos : listaFiltrada.length}
            </span>
          </div>
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
                            {abaAtiva === 'excluidas' ? (
                              <button
                                type="button"
                                onClick={() => restaurarCondicional(c.id)}
                                className="bg-green-700 hover:bg-green-800 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 cursor-pointer"
                                title="Restaurar sacola da lixeira"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                              </button>
                            ) : c.status === 'ABERTA' ? (
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
                                  className="bg-[#4a5d33] hover:bg-[#3d5427] text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 transition-all cursor-pointer" 
                                  title="Dar Baixa nas Peças e Atualizar Estoque"
                                >
                                  Baixa
                                </button>
                                <button 
                                  onClick={() => prepararEdicaoLocal(c)} 
                                  className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black" 
                                  title="Editar Sacola"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setModalExcluir({ aberto: true, id: c.id })} 
                                  className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700" 
                                  title="Excluir Sacola"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 font-bold uppercase rounded-md border border-gray-200">
                                Histórico / Finalizado
                              </span>
                            )}
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
      </div>

      {/* MODAL: FORMULÁRIO DE CRIAÇÃO E EDIÇÃO */}
      {modalFormAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border-t-4 border-[#4a5d33]">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h3 className="font-serif text-lg text-gray-900">{editandoId ? `Editando Sacola Nº ${editandoId}` : 'Nova Sacola Condicional'}</h3>
              <button onClick={() => setModalFormAberto(false)} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
            </div>

            <div id="modal-condicional-container" className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Erros de validação dentro da modal */}
              {errosValidacao.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 text-red-900 font-semibold text-xs rounded-lg shadow-sm space-y-1 mb-4">
                  {errosValidacao.map((e, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{e}</span>
                    </p>
                  ))}
                </div>
              )}
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

                    const obterEstoqueTotalProduto = (p: ProdutoCondicional): number => {
                      const est = p.estoque_detalhado || p.estoqueDetalhado;
                      if (est) {
                        try {
                          const mapa = typeof est === 'string' ? JSON.parse(est) : est;
                          if (typeof mapa === 'object' && mapa !== null) {
                            return Object.values(mapa).reduce((acc: number, curr: unknown) => acc + Number(curr || 0), 0);
                          }
                        } catch {}
                      }
                      return 99;
                    };

                    const obterEstoqueGradeVariacao = (p: ProdutoCondicional, corChoice?: string, tamChoice?: string): number => {
                      const est = p.estoque_detalhado || p.estoqueDetalhado;
                      if (!est) return 99;
                      try {
                        const mapa = typeof est === 'string' ? JSON.parse(est) : est;
                        if (!mapa || typeof mapa !== 'object') return 99;

                        if (corChoice && tamChoice) {
                          const c1 = `${corChoice}-${tamChoice}`;
                          if (c1 in mapa) return Number(mapa[c1] || 0);
                          const c2 = `${tamChoice}-${corChoice}`;
                          if (c2 in mapa) return Number(mapa[c2] || 0);
                          return 0;
                        }
                        if (corChoice) {
                          let somaCor = 0;
                          for (const [k, v] of Object.entries(mapa)) {
                            if (k.startsWith(corChoice + '-') || k.endsWith('-' + corChoice) || k === corChoice) {
                              somaCor += Number(v || 0);
                            }
                          }
                          return somaCor;
                        }
                        return Object.values(mapa).reduce((acc: number, curr: unknown) => acc + Number(curr || 0), 0);
                      } catch {
                        return 99;
                      }
                    };

                    let coresDisponiveisNoProduto: { nome: string; estoque: number }[] = [];
                    let tamanhosDisponiveisNoProduto: { nome: string; estoque: number }[] = [];

                    if (prodSelecionado) {
                      const estoqueBruto = prodSelecionado.estoque_detalhado || prodSelecionado.estoqueDetalhado;
                      if (estoqueBruto) {
                        try {
                          const estoque = typeof estoqueBruto === 'string' ? JSON.parse(estoqueBruto) : estoqueBruto;
                          const chaves = Object.keys(estoque);
                          const listaCores = Array.from(new Set(chaves.map(k => k.split('-')[0])));
                          
                          coresDisponiveisNoProduto = listaCores.map(c => ({
                            nome: c,
                            estoque: obterEstoqueGradeVariacao(prodSelecionado, c)
                          })).filter(c => c.estoque > 0 || c.nome === item.corEscolhida);

                          if (item.corEscolhida) {
                            const listaTams = chaves
                              .filter(k => k.startsWith(item.corEscolhida + '-'))
                              .map(k => k.split('-')[1]);

                            tamanhosDisponiveisNoProduto = listaTams.map(t => ({
                              nome: t,
                              estoque: obterEstoqueGradeVariacao(prodSelecionado, item.corEscolhida, t)
                            })).filter(t => t.estoque > 0 || t.nome === item.tamanhoEscolhido);
                          }
                        } catch (e) {
                          console.error("Erro parsing estoque grade:", e);
                        }
                      }
                    }

                    const produtosDisponiveis = produtos.filter(p =>
                      obterEstoqueTotalProduto(p) > 0 || String(p.id) === String(item.produtoId)
                    );

                    const estoqueMaxVar = prodSelecionado
                      ? obterEstoqueGradeVariacao(prodSelecionado, item.corEscolhida, item.tamanhoEscolhido)
                      : 99;

                    return (
                      <div key={idx} className="grid grid-cols-12 gap-2 bg-gray-50 p-2 border rounded-md items-center">
                        <div className="col-span-5">
                          <select 
                            value={item.produtoId} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'produtoId', e.target.value)} 
                            className="w-full border p-1 bg-white text-xs outline-none rounded"
                          >
                            <option value="">Selecione o Produto...</option>
                            {produtosDisponiveis.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nome} ({obterEstoqueTotalProduto(p)} un. em estoque)
                              </option>
                            ))}
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
                            {coresDisponiveisNoProduto.map(c => (
                              <option key={c.nome} value={c.nome}>
                                {c.nome} ({c.estoque} un.)
                              </option>
                            ))}
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
                            {tamanhosDisponiveisNoProduto.map(t => (
                              <option key={t.nome} value={t.nome}>
                                {t.nome} ({t.estoque} un. disp.)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2 flex flex-col items-center">
                          <input 
                            type="number" 
                            min="1" 
                            max={estoqueMaxVar > 0 ? estoqueMaxVar : 1}
                            value={item.quantidade} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(idx, 'quantidade', parseInt(e.target.value, 10) || 1)} 
                            className="w-full border p-1 text-center bg-white text-xs rounded font-bold" 
                          />
                          {prodSelecionado && (
                            <span className="text-[9px] font-bold text-[#4a5d33] mt-0.5">
                              ({estoqueMaxVar} un. disp.)
                            </span>
                          )}
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
                      <option value="DEVOLVIDA">DEVOLVER (Loja)</option>
                      <option value="VENDIDO">VENDIDO (Dar Baixa)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/10 rounded-lg text-xs text-gray-200 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>As peças marcadas como <strong>VENDIDO</strong> darão baixa imediata no estoque e criarão automaticamente um <strong>Pedido de Venda</strong> e uma cobrança em <strong>Pagamentos</strong>.</span>
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
          <div className="bg-white p-5 max-w-xs w-full rounded-xl border-t-4 border-red-600 shadow-2xl">
            <h4 className="font-sans font-bold text-base text-red-700 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Excluir Sacola Condicional
            </h4>
            <p className="text-xs text-gray-600 mb-4">Tem certeza que deseja mover esta sacola condicional para a lixeira?</p>
            <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
              <button onClick={() => setModalExcluir({ aberto: false, id: null })} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded cursor-pointer">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded cursor-pointer">Mover para a Lixeira</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelaCondicionais;