'use client';

import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { ShoppingBag, Eye, X, User, Phone, Calendar, Pencil, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SelectProdutoFilter from '@/components/SelectProdutoFilter';

// ─── Auxiliar de UUID ────────────────────────────────────────────────────────
const gerarUuid = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// ─── Tipagens e Interfaces ──────────────────────────────────────────────────
export type StatusPedido = 'PENDENTE' | 'PAGO' | 'ENVIADO' | 'ENTREGUE' | 'CANCELADO';

export interface ClientePedido {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
}

export interface ProdutoRef {
  id: number;
  nome: string;
  preco: number;
}

export interface ItemPedidoForm {
  uuid: string;
  fkProdutoId: string | number;
  quantidade: number;
}

export interface ItemPedidoResponse {
  id?: number;
  produto?: ProdutoRef;
  produtoNome?: string;
  variacao?: string;
  quantidade: number;
  precoUnitario?: number;
}

export interface FormPedidoData {
  fkClienteId: string | number;
  dataPedido: string;
  status: StatusPedido;
  itens: ItemPedidoForm[];
}

export interface Pedido {
  id: number;
  cliente?: ClientePedido;
  dataPedido: string;
  status: StatusPedido;
  valorTotal: number;
  metodoPagamento?: string;
  enderecoEntrega?: string;
  itens?: ItemPedidoResponse[];
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

const TelaPedidos: React.FC = () => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientesOpcoes, setClientesOpcoes] = useState<ClientePedido[]>([]);
  const [produtosOpcoes, setProdutosOpcoes] = useState<ProdutoRef[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');

  // Feedbacks e Modais
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  const [modalFormAberto, setModalFormAberto] = useState<boolean>(false);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState<boolean>(false);
  const [modalExcluir, setModalExcluir] = useState<ModalExcluirState>({ aberto: false, id: null });

  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // Formulário do Pedido
  const [formPedido, setFormPedido] = useState<FormPedidoData>({
    fkClienteId: '',
    dataPedido: new Date().toISOString().split('T')[0],
    status: 'PENDENTE',
    itens: [{ uuid: gerarUuid(), fkProdutoId: '', quantidade: 1 }]
  });

  // Referência para Auto-Scroll
  const tabelaRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalElementos, setTotalElementos] = useState<number>(0);
  const tamanhoPagina = 5;

  // ─── Busca Paginada de Pedidos ─────────────────────────────────────────────
  const buscarPedidos = useCallback(async (pagina: number = 0): Promise<void> => {
    try {
      setLoading(true);
      const res = await api.get<PageSpring<Pedido> | Pedido[]>(`/pedidos?page=${pagina}&size=${tamanhoPagina}`);
      
      if (res.data && Array.isArray((res.data as PageSpring<Pedido>).content)) {
        const dados = res.data as PageSpring<Pedido>;
        setPedidos(dados.content);
        setTotalPaginas(dados.totalPages);
        setTotalElementos(dados.totalElements);
        setPaginaAtual(dados.number);
      } else if (Array.isArray(res.data)) {
        setPedidos(res.data);
      } else {
        setPedidos([]);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, [tamanhoPagina]);

  // ─── Efeito de Inicialização Unificado ────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarTudo = async () => {
      try {
        setLoading(true);

        const [resPedidos, resCli, resProd] = await Promise.allSettled([
          api.get<PageSpring<Pedido> | Pedido[]>(`/pedidos?page=0&size=${tamanhoPagina}`),
          api.get<PageSpring<ClientePedido> | ClientePedido[]>('/usuarios?size=1000'),
          api.get<PageSpring<ProdutoRef> | ProdutoRef[]>('/produtos?size=1000')
        ]);

        if (!montado) return;

        // Trata os pedidos
        if (resPedidos.status === 'fulfilled' && resPedidos.value.data) {
          const dados = resPedidos.value.data;
          if (Array.isArray((dados as PageSpring<Pedido>).content)) {
            const pageData = dados as PageSpring<Pedido>;
            setPedidos(pageData.content);
            setTotalPaginas(pageData.totalPages);
            setTotalElementos(pageData.totalElements);
            setPaginaAtual(pageData.number);
          } else if (Array.isArray(dados)) {
            setPedidos(dados);
          }
        }

        // Trata a lista de Clientes
        if (resCli.status === 'fulfilled' && resCli.value.data) {
          const dadosCli = resCli.value.data;
          if (Array.isArray((dadosCli as PageSpring<ClientePedido>).content)) {
            setClientesOpcoes((dadosCli as PageSpring<ClientePedido>).content);
          } else if (Array.isArray(dadosCli)) {
            setClientesOpcoes(dadosCli);
          }
        }

        // Trata a lista de Produtos
        if (resProd.status === 'fulfilled' && resProd.value.data) {
          const dadosProd = resProd.value.data;
          if (Array.isArray((dadosProd as PageSpring<ProdutoRef>).content)) {
            setProdutosOpcoes((dadosProd as PageSpring<ProdutoRef>).content);
          } else if (Array.isArray(dadosProd)) {
            setProdutosOpcoes(dadosProd);
          }
        }

      } catch (err) {
        console.error('Erro ao carregar dados dos pedidos:', err);
      } finally {
        if (montado) {
          setLoading(false);
        }
      }
    };

    carregarTudo();

    return () => {
      montado = false;
    };
  }, [tamanhoPagina]);

  // ─── Navegação da Paginação ─────────────────────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarPedidos(novaPagina);
    }
  };

  // ─── Métodos para Formulário Dinâmico ────────────────────────────────────
  const abrirNovoPedidoForm = (): void => {
    setEditandoId(null);
    setErrosValidacao([]);
    setFormPedido({
      fkClienteId: '',
      dataPedido: new Date().toISOString().split('T')[0],
      status: 'PENDENTE',
      itens: [{ uuid: gerarUuid(), fkProdutoId: '', quantidade: 1 }]
    });
    setModalFormAberto(true);
  };

  const prepararEdicao = (ped: Pedido): void => {
    setEditandoId(ped.id);
    setErrosValidacao([]);
    setFormPedido({
      fkClienteId: ped.cliente?.id || '',
      dataPedido: ped.dataPedido || new Date().toISOString().split('T')[0],
      status: ped.status || 'PENDENTE',
      itens: ped.itens && ped.itens.length > 0
        ? ped.itens.map(it => ({
            uuid: gerarUuid(),
            fkProdutoId: it.produto?.id || '',
            quantidade: it.quantidade || 1
          }))
        : [{ uuid: gerarUuid(), fkProdutoId: '', quantidade: 1 }]
    });
    setModalFormAberto(true);
  };

  const handleItemChange = (uuid: string, campo: keyof ItemPedidoForm, valor: string | number): void => {
    setFormPedido(prev => ({
      ...prev,
      itens: prev.itens.map(it => (it.uuid === uuid ? { ...it, [campo]: valor } : it))
    }));
  };

  const handleQuantidadeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleQuantidadeChange = (uuid: string, rawVal: string) => {
    const limpo = rawVal.replace(/\D/g, '');
    let valNum = parseInt(limpo, 10);
    if (isNaN(valNum) || valNum < 1) {
      valNum = 1;
    } else if (valNum > 9999) {
      valNum = 9999;
    }
    handleItemChange(uuid, 'quantidade', valNum);
  };

  const podeAdicionarItem = formPedido.itens.length === 0 || formPedido.itens.every(it => Boolean(it.fkProdutoId));

  const adicionarLinhaItem = (): void => {
    if (!podeAdicionarItem) return;
    setFormPedido(prev => ({
      ...prev,
      itens: [...prev.itens, { uuid: gerarUuid(), fkProdutoId: '', quantidade: 1 }]
    }));
  };

  const removerLinhaItem = (uuid: string): void => {
    setFormPedido(prev => ({
      ...prev,
      itens: prev.itens.filter(it => it.uuid !== uuid)
    }));
  };

  const calcularValorTotalPedido = (): number => {
    return formPedido.itens.reduce((acc, item) => {
      const produto = produtosOpcoes.find(p => String(p.id) === String(item.fkProdutoId));
      const preco = produto ? Number(produto.preco || 0) : 0;
      const qtd = Number(item.quantidade || 0);
      return acc + (preco * qtd);
    }, 0);
  };

  const salvarPedido = async (): Promise<void> => {
    const erros: string[] = [];
    if (!formPedido.fkClienteId) {
      erros.push('Selecione uma cliente para vincular ao pedido.');
    }
    if (!formPedido.itens || formPedido.itens.length === 0) {
      erros.push('Adicione pelo menos um produto ao pedido.');
    }

    const temItemIncompleto = formPedido.itens.some(i => !i.fkProdutoId || Number(i.quantidade) <= 0);
    if (temItemIncompleto) {
      erros.push('Verifique os produtos e quantidades inseridas no pedido.');
    }

    if (!editandoId) {
      const valorTotalAtual = calcularValorTotalPedido();
      const pedidoDuplicado = pedidos.some(p =>
        String(p.cliente?.id) === String(formPedido.fkClienteId) &&
        p.dataPedido === formPedido.dataPedido &&
        Math.abs(Number(p.valorTotal) - valorTotalAtual) < 0.01
      );
      if (pedidoDuplicado) {
        erros.push('Já existe um pedido idêntico cadastrado para este cliente nesta data.');
      }
    }

    if (erros.length > 0) {
      setErrosValidacao(erros);
      return;
    }

    try {
      const payload = {
        fkClienteId: Number(formPedido.fkClienteId),
        dataPedido: formPedido.dataPedido,
        status: formPedido.status,
        valorTotal: calcularValorTotalPedido(),
        itens: formPedido.itens.map(it => ({
          fkProdutoId: Number(it.fkProdutoId),
          quantidade: Number(it.quantidade)
        }))
      };

      if (editandoId) {
        await api.put(`/pedidos/${editandoId}`, payload);
        setMensagemSucesso('Pedido alterado com sucesso!');
      } else {
        await api.post('/pedidos', payload);
        setMensagemSucesso('Novo pedido cadastrado com sucesso!');
      }

      setModalFormAberto(false);
      buscarPedidos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar pedido:', err);
      const msgServidor = err?.response?.data?.mensagem || 'Falha ao salvar pedido na base de dados.';
      setErrosValidacao([msgServidor]);
    }
  };

  const handleAtualizarStatus = async (pedidoId: number, novoStatus: StatusPedido): Promise<void> => {
    try {
      await api.patch(`/pedidos/${pedidoId}/status`, { status: novoStatus });
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
      );
      if (pedidoSelecionado && pedidoSelecionado.id === pedidoId) {
        setPedidoSelecionado({ ...pedidoSelecionado, status: novoStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
    }
  };

  const confirmarExclusao = async (): Promise<void> => {
    if (!modalExcluir.id) return;
    try {
      await api.delete(`/pedidos/${modalExcluir.id}`);
      setMensagemSucesso('Pedido removido com sucesso!');
      setModalExcluir({ aberto: false, id: null });
      buscarPedidos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir pedido:', err);
      setErrosValidacao(['Não foi possível excluir este pedido.']);
    }
  };

  const dispararWhatsAppComprovante = (pedido: Pedido): void => {
    const nomeCliente = pedido.cliente?.nome || 'Cliente';
    const telefone = pedido.cliente?.telefone?.replace(/\D/g, '') || '';

    const texto =
      `Olá, ${nomeCliente}!\n\n` +
      `Seu pedido *#${pedido.id}* na *Maria Morena* foi registrado!\n` +
      `*Data:* ${pedido.dataPedido}\n` +
      `*Total:* R$ ${Number(pedido.valorTotal).toFixed(2).replace('.', ',')}\n` +
      `*Status:* ${pedido.status}\n\n` +
      `Obrigada pela preferência!`;

    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const abrirDetalhes = (pedido: Pedido): void => {
    setPedidoSelecionado(pedido);
    setModalDetalhesAberto(true);
  };

  const renderBadgeStatus = (status: StatusPedido) => {
    const estilos: Record<StatusPedido, string> = {
      PENDENTE: 'bg-amber-100 text-amber-800 border-amber-300',
      PAGO: 'bg-blue-100 text-blue-800 border-blue-300',
      ENVIADO: 'bg-purple-100 text-purple-800 border-purple-300',
      ENTREGUE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      CANCELADO: 'bg-rose-100 text-rose-800 border-rose-300',
    };

    return (
      <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${estilos[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const pedidosFiltrados = (Array.isArray(pedidos) ? pedidos : []).filter((p) => {
    const atendeStatus = statusFiltro === 'TODOS' || p.status === statusFiltro;
    const atendeBusca =
      (p.cliente?.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
      p.id.toString().includes(termoBusca);
    return atendeStatus && atendeBusca;
  });

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#2d3a22] flex items-center gap-2">
              <ShoppingBag className="w-8 h-8 text-[#2d3a22]" />
              Pedidos
            </h1>
          </div>

          <button
            onClick={abrirNovoPedidoForm}
            className="bg-[#2d3a22] hover:bg-[#3d5427] text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            + Novo Pedido
          </button>
        </div>

        {mensagemSucesso && (
          <div className="bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs rounded-sm shadow-sm">
            ✓ {mensagemSucesso}
          </div>
        )}

        {/* Barra de Filtros Padronizada */}
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar por #ID do pedido ou nome do cliente..."
          filtroValor={statusFiltro}
          onFiltroChange={setStatusFiltro}
          opcoesFiltro={[
            { label: 'Todos os Status', value: 'TODOS' },
            { label: 'Pendente', value: 'PENDENTE' },
            { label: 'Pago', value: 'PAGO' },
            { label: 'Enviado', value: 'ENVIADO' },
            { label: 'Entregue', value: 'ENTREGUE' },
            { label: 'Cancelado', value: 'CANCELADO' }
          ]}
        />

        {/* Tabela Principal */}
        <section ref={tabelaRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase text-gray-700">
                Pedidos Registrados ({totalElementos > 0 ? totalElementos : pedidosFiltrados.length})
              </h2>
            </div>

            {loading ? (
              <p className="p-8 text-center text-xs text-gray-500">Carregando pedidos...</p>
            ) : (
              <div className="overflow-x-auto min-h-[360px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#cbd0c0] font-bold uppercase text-gray-700">
                      <th className="p-3">#ID</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Valor Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pedidosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center italic text-gray-500">
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    ) : (
                      pedidosFiltrados.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-bold text-gray-500">#{p.id}</td>
                          <td className="p-3 font-bold text-gray-800">{p.cliente?.nome || '—'}</td>
                          <td className="p-3 text-gray-600">{p.dataPedido}</td>
                          <td className="p-3 font-bold text-gray-800">
                            R$ {Number(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3">{renderBadgeStatus(p.status)}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => dispararWhatsAppComprovante(p)}
                                className="bg-[#25D366] hover:bg-[#1ebd59] text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                                title="Enviar comprovante no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-white" /> Whats
                              </button>
                              <button
                                onClick={() => abrirDetalhes(p)}
                                className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                                title="Ver Detalhes do Pedido"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => prepararEdicao(p)}
                                className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                                title="Editar Pedido"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setModalExcluir({ aberto: true, id: p.id })}
                                className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700"
                                title="Excluir Pedido"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
          <Paginacao
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalElementos={totalElementos}
            onMudarPagina={mudarPagina}
          />
        </section>

        {/* MODAL: FORMULÁRIO DE CADASTRO E EDIÇÃO DE PEDIDO */}
        {modalFormAberto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-2xl border-t-4 border-[#4a5d33]">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h3 className="font-serif text-lg text-gray-900">
                  {editandoId ? `Editando Pedido #${editandoId}` : 'Novo Pedido de Venda'}
                </h3>
                <button onClick={() => setModalFormAberto(false)} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {errosValidacao.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-600 p-2.5 text-red-900 font-semibold rounded-sm space-y-1">
                    {errosValidacao.map((err, i) => <p key={i}>⚠️ {err}</p>)}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Selecione a Cliente *</label>
                  <select
                    value={formPedido.fkClienteId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormPedido({ ...formPedido, fkClienteId: e.target.value })}
                    className="w-full border border-gray-300 p-2 bg-gray-50 text-xs outline-none focus:border-[#4a5d33] rounded-md"
                  >
                    <option value="">Escolha uma cliente...</option>
                    {clientesOpcoes.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Data do Pedido</label>
                    <input
                      type="date"
                      value={formPedido.dataPedido}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormPedido({ ...formPedido, dataPedido: e.target.value })}
                      className="w-full border border-gray-300 p-2 bg-gray-50 text-xs outline-none rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Status Inicial</label>
                    <select
                      value={formPedido.status}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormPedido({ ...formPedido, status: e.target.value as StatusPedido })}
                      className="w-full border border-gray-300 p-2 bg-gray-50 text-xs outline-none font-bold rounded-md"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="PAGO">PAGO</option>
                      <option value="ENVIADO">ENVIADO</option>
                      <option value="ENTREGUE">ENTREGUE</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </select>
                  </div>
                </div>

                {/* SESSÃO DINÂMICA DE ITENS */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-bold uppercase text-gray-500">Itens do Pedido</label>
                    <button
                      type="button"
                      onClick={adicionarLinhaItem}
                      disabled={!podeAdicionarItem}
                      title={!podeAdicionarItem ? 'Selecione o produto do item atual antes de adicionar outro' : ''}
                      className={`text-[10px] font-bold transition-all cursor-pointer ${
                        podeAdicionarItem
                          ? 'text-[#4a5d33] hover:underline'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      + Adicionar Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formPedido.itens.map((item) => (
                      <div key={item.uuid} className="grid grid-cols-12 gap-2 bg-gray-50 p-2 border border-gray-200 rounded-md items-center">
                        <div className="col-span-8">
                          <SelectProdutoFilter
                            produtos={produtosOpcoes}
                            valorSelecionado={item.fkProdutoId}
                            onChange={(valor) => handleItemChange(item.uuid, 'fkProdutoId', valor)}
                            placeholder="Selecione o Produto..."
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={item.quantidade}
                            onKeyDown={handleQuantidadeKeyDown}
                            onChange={(e) => handleQuantidadeChange(item.uuid, e.target.value)}
                            className="w-full border border-gray-300 p-2 text-center bg-white text-xs font-bold rounded-md outline-none focus:border-[#4a5d33]"
                            placeholder="Qtd"
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          {formPedido.itens.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerLinhaItem(item.uuid)}
                              className="text-red-600 font-bold hover:text-red-800 cursor-pointer p-1 text-base"
                              title="Remover Item"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-100 p-3 rounded text-right font-extrabold text-sm text-[#2d3a22] border">
                  Total Estimado: R$ {calcularValorTotalPedido().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                <button onClick={() => setModalFormAberto(false)} className="px-4 py-2 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase hover:bg-gray-300 cursor-pointer rounded-sm">Cancelar</button>
                <button onClick={salvarPedido} className="px-5 py-2 bg-[#4a5d33] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-md cursor-pointer rounded-sm">Salvar Pedido</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DETALHES DO PEDIDO */}
        {modalDetalhesAberto && pedidoSelecionado && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border-t-4 border-[#2d3a22] w-full max-w-xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-gray-900">
                    Pedido #{pedidoSelecionado.id}
                  </h3>
                  {renderBadgeStatus(pedidoSelecionado.status)}
                </div>
                <button onClick={() => setModalDetalhesAberto(false)} className="text-gray-400 hover:text-black cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Atualização Rápida de Etapa */}
              <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                <label className="block text-[10px] font-bold uppercase text-gray-500">
                  Alterar Status do Pedido:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(['PENDENTE', 'PAGO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'] as StatusPedido[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleAtualizarStatus(pedidoSelecionado.id, st)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                        pedidoSelecionado.status === st
                          ? 'bg-[#2d3a22] text-white border-[#2d3a22]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-lg border space-y-1">
                  <p className="font-bold text-gray-700 flex items-center gap-1 text-[11px]">
                    <User className="w-3.5 h-3.5 text-[#2d3a22]" /> Cliente
                  </p>
                  <p className="font-semibold text-gray-900">{pedidoSelecionado.cliente?.nome || '—'}</p>
                  <p className="text-gray-500">{pedidoSelecionado.cliente?.email || 'Sem e-mail'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border space-y-1">
                  <p className="font-bold text-gray-700 flex items-center gap-1 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-[#2d3a22]" /> Contato / Data
                  </p>
                  <p className="text-gray-800">{pedidoSelecionado.cliente?.telefone || 'Sem telefone'}</p>
                  <p className="text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {pedidoSelecionado.dataPedido}
                  </p>
                </div>
              </div>

              {/* Lista de Itens do Pedido */}
              {pedidoSelecionado.itens && pedidoSelecionado.itens.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase text-gray-500">Itens do Pedido</h4>
                  <div className="border rounded-lg divide-y text-xs">
                    {pedidoSelecionado.itens.map((item, idx) => {
                      const nomeProd = item.produto?.nome || item.produtoNome || 'Produto';
                      const precoUnit = item.produto?.preco || item.precoUnitario || 0;

                      return (
                        <div key={idx} className="p-2.5 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-800">{nomeProd}</p>
                            {item.variacao && <p className="text-gray-500 text-[10px]">Variação: {item.variacao}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-gray-600">{item.quantidade}x R$ {Number(precoUnit).toFixed(2)}</p>
                            <p className="font-bold text-gray-900">R$ {(item.quantidade * Number(precoUnit)).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rodapé do Modal */}
              <div className="flex justify-between items-center pt-3 border-t">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Total</span>
                  <span className="text-lg font-extrabold text-[#2d3a22]">
                    R$ {Number(pedidoSelecionado.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={() => setModalDetalhesAberto(false)}
                  className="px-4 py-1.5 bg-gray-800 hover:bg-black text-white rounded text-xs font-bold uppercase cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EXCLUSÃO DE PEDIDO */}
        {modalExcluir.aberto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-5 max-w-xs w-full rounded-sm border-t-4 border-red-600 shadow-2xl">
              <h4 className="font-serif text-base text-red-700 mb-1">⚠️ Excluir Pedido</h4>
              <p className="text-xs text-gray-600 mb-4">
                Confirma a remoção permanente deste pedido do sistema?
              </p>
              <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
                <button
                  onClick={() => setModalExcluir({ aberto: false, id: null })}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarExclusao}
                  className="px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TelaPedidos;