'use client';

import React, { useState, useEffect, ChangeEvent, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, FolderCheck, MessageSquare, Pencil, Trash2, AlertCircle, CheckCircle2, Search, Info, RotateCcw } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SystemModal from '@/components/SystemModal';
import { formatErrorMessage } from '@/utils/errorUtils';
import { formatarData, rotuloStatus } from '@/utils/formatters';
import ModalWhatsAppMensagem from '@/components/ModalWhatsAppMensagem';
import CampoAjuda from '@/components/CampoAjuda';

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
  funcionario?: Usuario;
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
  const [opcoesStatus, setOpcoesStatus] = useState<{ label: string; value: string }[]>([
    { label: 'Todos os Status', value: 'TODOS' },
  ]);

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
  const [modalWhats, setModalWhats] = useState<{ aberto: boolean; telefone: string; mensagem: string }>({
    aberto: false, telefone: '', mensagem: '',
  });

  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemAviso, setMensagemAviso] = useState<string>('');
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
        : tipoAba === 'ativas'
          ? `/condicionais?page=${pagina}&size=${tamanhoPagina}&status=ABERTA`
          : `/condicionais?page=${pagina}&size=${tamanhoPagina}&status=FINALIZADAS`;

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
      const res = await api.put<Condicional>(`/condicionais/${id}/restaurar`);
      const status = (res.data?.status || 'ABERTA').toUpperCase();
      const destino = status === 'ABERTA' ? 'ativas' : 'finalizadas';
      setMensagemSucesso('Sacola condicional restaurada com sucesso!');
      if (abaAtiva === destino) {
        buscarCondicionais(0, destino);
      } else {
        setAbaAtiva(destino);
      }
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao restaurar condicional:', err);
      setErrosValidacao([formatErrorMessage(err, 'Não foi possível restaurar a sacola condicional.')]);
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
        const [resCond, resCli, resProd, resFiltro] = await Promise.allSettled([
          api.get<PageSpring<Condicional> | Condicional[]>(`/condicionais?page=0&size=${tamanhoPagina}&status=ABERTA`),
          api.get<PageSpring<Usuario> | Usuario[]>('/usuarios?size=1000'),
          api.get<ProdutoCondicional[]>('/produtos/opcoes'),
          api.get<string[]>('/condicionais/opcoes-filtro'),
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

          if (resFiltro.status === 'fulfilled' && Array.isArray(resFiltro.value.data)) {
            const rotulos: Record<string, string> = {
              ABERTA: 'Aberta',
              ATRASADA: 'Atrasada (prazo vencido)',
              FINALIZADA: 'Finalizada',
              DEVOLVIDA: 'Devolvida',
            };
            setOpcoesStatus([
              { label: 'Todos os Status', value: 'TODOS' },
              ...resFiltro.value.data.map((value) => ({ label: rotulos[value] || value, value })),
            ]);
          }

          if (resProd.status === 'fulfilled' && Array.isArray(resProd.value.data)) {
            setProdutos(resProd.value.data);
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

  const abrirWhatsAppCondicional = (c: Condicional) => {
    const nome = c.usuario?.nome || c.cliente?.nome || 'Cliente';
    const tel = (c.usuario?.telefone || c.cliente?.telefone || '').replace(/\D/g, '');
    const prazo = calcularPrazo(c.dataRetorno);
    const msg = `Olá, ${nome}!\n\n` +
      `Passando para lembrar da sua sacola condicional *#${c.id}* da *Maria Morena*.\n` +
      `*Data limite para retorno:* ${c.dataRetorno} (${prazo.texto}).\n\n` +
      `Já decidiu quais peças vai levar para arrasar? Se precisar de mais tempo, nos avise!`;
    setModalWhats({ aberto: true, telefone: tel, mensagem: msg });
  };

  // ─── Filtro Local dos Condicionais ───────────────────────────────────────
  const listaFiltrada = (Array.isArray(listaCondicionais) ? listaCondicionais : []).filter(c => {
    const atendeAba = abaAtiva === 'excluidas'
      ? true
      : (abaAtiva === 'ativas' ? c.status === 'ABERTA' : (c.status === 'FINALIZADA' || c.status === 'DEVOLVIDA'));
    const atrasada = c.status === 'ABERTA'
      && c.dataRetorno
      && new Date(c.dataRetorno + 'T00:00:00') <= new Date(new Date().toDateString());
    const atendeStatus = statusFiltro === 'TODOS'
      || (statusFiltro === 'ATRASADA' ? atrasada : c.status === statusFiltro);
    
    const termo = termoBusca.toLowerCase();
    const nomeCliente = (c.usuario?.nome || c.cliente?.nome || '').toLowerCase();
    const idCond = String(c.id);
    const temProduto = (c.itens || []).some(i => (i.produto?.nome || '').toLowerCase().includes(termo));

    return atendeAba && atendeStatus && (nomeCliente.includes(termo) || idCond.includes(termo) || temProduto);
  });

  return (
    <div className="mm-page">
      <div className="mm-page-inner">
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="mm-title">Condicionais</h1>
            <p className="mm-subtitle">Sacolas em prova: saídas, devoluções e baixas.</p>
          </div>

          <button 
            onClick={abrirNovaSacolaForm}
            className="mm-btn-primary self-start md:self-auto"
          >
            + Nova Sacola Condicional
          </button>
        </div>

        {/* FEEDBACKS */}
        {mensagemSucesso && (
          <div className="mm-alert-ok">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {mensagemAviso && (
          <div className="mm-alert-warn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{mensagemAviso}</span>
          </div>
        )}

        {errosValidacao.length > 0 && (
          <div className="mm-alert-err flex-col items-start gap-1">
            {errosValidacao.map((e, idx) => (
              <p key={idx} className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{e}</span>
              </p>
            ))}
          </div>
        )}

        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar sacola por código, cliente ou peça..."
          filtroValor={statusFiltro}
          onFiltroChange={setStatusFiltro}
          opcoesFiltro={opcoesStatus}
        />

        {/* TABELA DE REGISTROS */}
        <section ref={tabelaRef} className="mm-card overflow-hidden flex flex-col justify-between">
          <div className="px-4 py-3.5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('ativas')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer ${
                  abaAtiva === 'ativas'
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                Condicionais Ativos
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('finalizadas')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer ${
                  abaAtiva === 'finalizadas'
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                Histórico de Finalizados
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('excluidas')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'excluidas'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Sacolas Removidas (Lixeira)
              </button>
            </div>

            <span className="text-xs font-semibold text-gray-500">
              Total: {totalElementos > 0 ? totalElementos : listaFiltrada.length}
            </span>
          </div>
          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Valor estimado</th>
                  <th>Prazo</th>
                  <th>Status</th>
                  <th>Peças</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {listaFiltrada.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 bg-white">Nenhum registro encontrado nesta aba.</td>
                  </tr>
                ) : (
                  listaFiltrada.map((c) => {
                    const prazo = calcularPrazo(c.dataRetorno);
                    return (
                      <tr key={c.id} className="transition-colors bg-white">
                        <td className="font-semibold text-gray-500">#{String(c.id).padStart(3, '0')}</td>
                        <td className="whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{c.usuario?.nome || c.cliente?.nome || '—'}</p>
                          <p className="text-xs text-gray-500">{c.usuario?.telefone || c.cliente?.telefone || ''}</p>
                          {c.funcionario?.nome && (
                            <p className="text-xs text-brand-800">Resp.: {c.funcionario.nome}</p>
                          )}
                        </td>
                        <td className="font-semibold text-gray-900 whitespace-nowrap">
                          R$ {Number(c.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="block font-medium text-gray-800">{formatarData(c.dataRetorno)}</span>
                          <span className="block text-xs text-gray-500">Saída {formatarData(c.dataSaida)}</span>
                          {c.status === 'ABERTA' && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 border ${
                              prazo.status === 'ATRASADO' ? 'bg-red-50 text-red-700 border-red-200' :
                              prazo.status === 'HOJE' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {prazo.texto}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                            c.status === 'ABERTA' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            c.status === 'FINALIZADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            {rotuloStatus(c.status)}
                          </span>
                        </td>
                        <td className="text-gray-600 min-w-[170px] max-w-[220px]">
                          <div className="space-y-1">
                            {(c.itens || []).map((i, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 px-2 py-1 border border-gray-200 rounded-lg flex justify-between items-center gap-2">
                                <span className="truncate">{i.produto?.nome} <strong>({i.corEscolhida || '-'}/{i.tamanhoEscolhido || '-'})</strong></span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border shrink-0 ${
                                  i.statusItem === 'VENDIDO' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                  i.statusItem === 'DEVOLVIDA' || i.statusItem === 'DISPONIVEL' ? 'bg-sky-50 border-sky-200 text-sky-700' :
                                  'bg-white border-gray-200 text-gray-500'
                                }`}>
                                  {rotuloStatus(i.statusItem || 'Em cond.')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center items-center gap-1">
                            {abaAtiva === 'excluidas' ? (
                              <button
                                type="button"
                                onClick={() => restaurarCondicional(c.id)}
                                className="bg-brand-700 hover:bg-brand-800 text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                title="Restaurar sacola da lixeira"
                              >
                                <RotateCcw className="w-4 h-4" /> Restaurar
                              </button>
                            ) : c.status === 'ABERTA' ? (
                              <>
                                <button
                                  onClick={() => abrirWhatsAppCondicional(c)}
                                  className="bg-[#25D366] hover:bg-[#1ebd59] text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                  title="Enviar lembrete no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-white" /> Whats
                                </button>
                                <button 
                                  onClick={() => prepararBaixaIndividual(c)} 
                                  className="bg-brand-700 hover:bg-brand-800 text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer" 
                                  title="Dar Baixa nas Peças e Atualizar Estoque"
                                >
                                  Baixa
                                </button>
                                <button 
                                  onClick={() => prepararEdicaoLocal(c)} 
                                  className="p-2 rounded-lg text-gray-500 hover:text-brand-900 hover:bg-brand-100/70 transition cursor-pointer" 
                                  title="Editar Sacola"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setModalExcluir({ aberto: true, id: c.id })} 
                                  className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer" 
                                  title="Excluir Sacola"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 font-semibold rounded-md border border-gray-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl rounded-3xl animate-subir">
            <div className="flex justify-between items-start gap-3 mb-5">
              <h3 className="font-display text-xl font-semibold text-brand-900">{editandoId ? `Editando Sacola Nº ${editandoId}` : 'Nova Sacola Condicional'}</h3>
              <button onClick={() => setModalFormAberto(false)} className="w-9 h-9 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-2xl leading-none transition cursor-pointer shrink-0">×</button>
            </div>

            <div id="modal-condicional-container" className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm">
              {/* Erros de validação dentro da modal */}
              {errosValidacao.length > 0 && (
                <div className="mm-alert-err flex-col items-start gap-1">
                  {errosValidacao.map((e, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{e}</span>
                    </p>
                  ))}
                </div>
              )}
              <div>
                <label className="mm-label flex items-center gap-1.5">
                  Selecione a cliente *
                  <CampoAjuda texto="Quem leva as peças. Cadastro pelo WhatsApp/telefone." />
                </label>
                <select
                  value={formCondicional.clienteId}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormCondicional({ ...formCondicional, clienteId: e.target.value })}
                  className="mm-input"
                >
                  <option value="">Escolha uma cliente...</option>
                  {clientes.map(cli => (
                    <option key={cli.id} value={cli.id}>{cli.nome} {cli.telefone ? `(${cli.telefone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mm-label flex items-center gap-1.5">
                    Data de saída
                    <CampoAjuda texto="Dia em que a sacola saiu da loja." />
                  </label>
                  <input 
                    type="date" 
                    value={formCondicional.dataSaida} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({ ...formCondicional, dataSaida: e.target.value })} 
                    className="mm-input" 
                  />
                </div>
                <div>
                  <label className="mm-label flex items-center gap-1.5">
                    Data limite de retorno *
                    <CampoAjuda texto="Prazo para devolver ou comprar. Usada para saber se a sacola está atrasada." />
                  </label>
                  <input 
                    type="date" 
                    value={formCondicional.dataRetorno} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormCondicional({ ...formCondicional, dataRetorno: e.target.value })} 
                    className="mm-input" 
                  />
                </div>
              </div>

              {/* SESSÃO DINÂMICA DE ITENS */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <label className="mm-label flex items-center gap-1.5">
                    Peças na sacola
                    <CampoAjuda texto="Produto, cor, tamanho e quantidade que saíram do estoque para esta cliente." />
                  </label>
                  <button type="button" onClick={adicionarLinhaProduto} className="text-brand-700 hover:underline text-[11px] font-semibold cursor-pointer">+ Adicionar Peça</button>
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
                      <div key={idx} className="bg-gray-50 p-2.5 border border-gray-200 rounded-xl min-w-0 space-y-1.5">
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center min-w-0">
                          <select 
                            value={item.produtoId} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'produtoId', e.target.value)} 
                            className="min-w-0 flex-1 border border-gray-300 h-10 px-2.5 bg-white text-sm rounded-xl"
                          >
                            <option value="">Produto...</option>
                            {produtosDisponiveis.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                          <select 
                            value={item.corEscolhida} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'corEscolhida', e.target.value)} 
                            className="w-28 shrink-0 border border-gray-300 h-10 px-2.5 bg-white text-sm rounded-xl" 
                            disabled={!item.produtoId}
                          >
                            <option value="">Cor</option>
                            {coresDisponiveisNoProduto.map(c => (
                              <option key={c.nome} value={c.nome}>{c.nome}</option>
                            ))}
                          </select>
                          <select 
                            value={item.tamanhoEscolhido} 
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => handleItemChange(idx, 'tamanhoEscolhido', e.target.value)} 
                            className="w-20 shrink-0 border border-gray-300 h-10 px-2.5 bg-white text-sm rounded-xl" 
                            disabled={!item.corEscolhida}
                          >
                            <option value="">Tam</option>
                            {tamanhosDisponiveisNoProduto.map(t => (
                              <option key={t.nome} value={t.nome}>{t.nome}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            min="1" 
                            max={estoqueMaxVar > 0 ? estoqueMaxVar : 1}
                            value={item.quantidade} 
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(idx, 'quantidade', parseInt(e.target.value, 10) || 1)} 
                            className="w-16 shrink-0 border border-gray-300 h-10 px-1 text-center bg-white text-sm rounded-xl font-semibold" 
                            aria-label="Quantidade"
                          />
                          {formCondicional.itens.length > 1 && (
                            <button type="button" onClick={() => removerLinhaProduto(idx)} className="text-red-600 font-semibold hover:text-red-800 cursor-pointer w-6 shrink-0">×</button>
                          )}
                        </div>
                        {prodSelecionado && (
                          <p className="text-[11px] text-brand-700">
                            {estoqueMaxVar} un. disponíveis nesta variação
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-2.5">
              <button onClick={() => setModalFormAberto(false)} className="mm-btn-secondary">Cancelar</button>
              <button onClick={salvarCondicional} className="mm-btn-primary">Salvar Mudanças</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TRIAGEM COM SELETOR DE DEVOLUÇÃO / VENDA */}
      {modalBaixaAberto && sacolaParaBaixa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white text-gray-800 p-6 shadow-2xl max-w-xl w-full rounded-3xl animate-subir max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex justify-between items-start gap-3 mb-5">
              <div>
                <h3 className="font-display text-xl font-semibold text-brand-900">Processar Retorno de Peças (Baixa)</h3>
                <p className="text-sm text-gray-500 mt-1">Defina quais peças foram vendidas (baixa no estoque) e quais retornaram para a loja.</p>
              </div>
              <button onClick={() => setModalBaixaAberto(false)} className="w-9 h-9 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-2xl leading-none transition cursor-pointer shrink-0">×</button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4 pr-1">
              {itensBaixa.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 border border-gray-200 rounded-xl gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{item.nome}</p>
                    <p className="text-xs text-gray-500">Grade: <span className="text-clay-600 font-semibold">{item.corEscolhida} / {item.tamanhoEscolhido}</span> ({item.quantidade}x)</p>
                  </div>
                  
                  {/* SELETOR DE DESTINO DA PEÇA */}
                  <div className="w-44">
                    <select
                      value={item.statusItem}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusBaixaChange(idx, e.target.value as 'VENDIDO' | 'DEVOLVIDA')}
                      className={`w-full h-10 px-2 text-sm font-semibold border rounded-xl cursor-pointer ${
                        item.statusItem === 'VENDIDO' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      <option value="DEVOLVIDA">DEVOLVER (Loja)</option>
                      <option value="VENDIDO">VENDIDO (Dar Baixa)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-xl text-sm text-gray-700 mb-4 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
              <span>As peças marcadas como <strong>VENDIDO</strong> darão baixa imediata no estoque e criarão automaticamente um <strong>Pedido de Venda</strong> e uma cobrança em <strong>Pagamentos</strong>.</span>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-2.5">
              <button onClick={() => setModalBaixaAberto(false)} className="mm-btn-secondary">Fechar</button>
              <button onClick={finalizarBaixaItemPorItem} className="mm-btn-primary">Confirmar Baixa do Estoque</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {modalExcluir.aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white p-6 max-w-sm w-full shadow-2xl rounded-3xl animate-subir max-h-[calc(100vh-2rem)] overflow-y-auto">
            <h4 className="font-sans font-semibold text-base text-red-700 mb-1 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Excluir Sacola Condicional
            </h4>
            <p className="text-sm text-gray-600 mb-5">Tem certeza que deseja mover esta sacola condicional para a lixeira?</p>
            <div className="flex justify-end gap-2 text-[11px] font-semibold">
              <button onClick={() => setModalExcluir({ aberto: false, id: null })} className="mm-btn-secondary">Cancelar</button>
              <button onClick={confirmarExclusao} className="mm-btn-danger">Mover para a Lixeira</button>
            </div>
          </div>
        </div>
      )}

      <ModalWhatsAppMensagem
        isOpen={modalWhats.aberto}
        titulo="Lembrete da sacola"
        telefone={modalWhats.telefone}
        mensagemInicial={modalWhats.mensagem}
        onClose={() => setModalWhats({ aberto: false, telefone: '', mensagem: '' })}
        onEnviado={(aviso) => {
          setMensagemAviso('');
          setMensagemSucesso(aviso);
          setTimeout(() => setMensagemSucesso(''), 5000);
        }}
        onAviso={(aviso) => {
          setMensagemSucesso('');
          setMensagemAviso(aviso);
          setTimeout(() => setMensagemAviso(''), 8000);
        }}
      />
    </div>
  );
};

export default TelaCondicionais;