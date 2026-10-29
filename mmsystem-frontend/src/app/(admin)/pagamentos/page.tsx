'use client';

import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Pencil, Trash2, AlertCircle, CheckCircle2, RotateCcw, MessageSquare } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import { formatErrorMessage } from '@/utils/errorUtils';
import { formatarData } from '@/utils/formatters';
import ModalWhatsAppMensagem from '@/components/ModalWhatsAppMensagem';

// ─── Interfaces / Tipagens ──────────────────────────────────────────────────
export interface PedidoRef {
  id: number;
  valorTotal?: number;
}

export interface Pagamento {
  id: number;
  pedido?: PedidoRef;
  metodoPagamento: string;
  parcelas?: number | null;
  dataVencimento?: string | null;
  valor: number | string;
  status: 'PENDENTE' | 'APROVADO' | 'CANCELADO' | 'ESTORNADO' | string;
  clienteNome?: string;
  clienteTelefone?: string;
}

export interface FormPagamentoData {
  fkPedidoId: string | number;
  valor: string | number;
  metodoPagamento: string;
  parcelas: number;
  dataVencimento: string;
  status: string;
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

function rotuloMetodoPagamento(metodo?: string, parcelas?: number | null): string {
  const mapa: Record<string, string> = {
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de crédito',
    CARTAO_DEBITO: 'Cartão de débito',
    DINHEIRO: 'Dinheiro',
    BOLETO: 'Boleto',
    PAGAMENTO_FUTURO: 'Pagamento futuro',
  };
  if (!metodo) return '—';
  const base = mapa[metodo] || metodo.replace(/_/g, ' ');
  if (metodo === 'CARTAO_CREDITO' && parcelas && parcelas > 1) {
    return `${base} (${parcelas}x)`;
  }
  if (metodo === 'CARTAO_CREDITO') {
    return `${base} (1x)`;
  }
  return base;
}

const TelaPagamentos: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pedidosOpcoes, setPedidosOpcoes] = useState<PedidoRef[]>([]);
  
  // Controle de Abas (Pagamentos Ativos vs Removidos / Lixeira)
  const [abaAtiva, setAbaAtiva] = useState<'ATIVOS' | 'EXCLUIDOS' | 'VENCIDOS'>('ATIVOS');

  // ─── Estados de Filtro e Busca ───────────────────────────────────────────
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [opcoesStatus, setOpcoesStatus] = useState<{ label: string; value: string }[]>([
    { label: 'Todos os Status', value: 'TODOS' },
  ]);
  const [loading, setLoading] = useState<boolean>(true);

  // Mensagens de Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [mensagemAviso, setMensagemAviso] = useState<string>('');
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);
  const [modalWhats, setModalWhats] = useState<{ aberto: boolean; telefone: string; mensagem: string }>({
    aberto: false, telefone: '', mensagem: '',
  });

  // Modais e Estados de Edição
  const [modalFormAberto, setModalFormAberto] = useState<boolean>(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalExcluir, setModalExcluir] = useState<ModalExcluirState>({ aberto: false, id: null });

  // Formulário Local
  const [formPagamento, setFormPagamento] = useState<FormPagamentoData>({
    fkPedidoId: '',
    valor: '',
    metodoPagamento: 'PIX',
    parcelas: 1,
    dataVencimento: new Date().toISOString().split('T')[0],
    status: 'PENDENTE'
  });

  // Referência para Auto-Scroll
  const tabelaRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalElementos, setTotalElementos] = useState<number>(0);
  const tamanhoPagina = 5;

  // ─── Busca Paginada de Pagamentos ──────────────────────────────────────────
  const buscarPagamentos = useCallback(async (pagina: number = 0, tipoAba: 'ATIVOS' | 'EXCLUIDOS' | 'VENCIDOS' = abaAtiva): Promise<void> => {
    try {
      setLoading(true);
      const url = tipoAba === 'EXCLUIDOS'
        ? `/pagamentos/excluidos?page=${pagina}&size=${tamanhoPagina}`
        : tipoAba === 'VENCIDOS'
          ? `/pagamentos/vencidos?page=${pagina}&size=${tamanhoPagina}`
          : `/pagamentos?page=${pagina}&size=${tamanhoPagina}`;

      const res = await api.get<PageSpring<Pagamento> | Pagamento[]>(url);
      
      if (res.data && Array.isArray((res.data as PageSpring<Pagamento>).content)) {
        const dados = res.data as PageSpring<Pagamento>;
        setPagamentos(dados.content);
        setTotalPaginas(dados.totalPages);
        setTotalElementos(dados.totalElements);
        setPaginaAtual(dados.number);
      } else if (Array.isArray(res.data)) {
        setPagamentos(res.data);
      } else {
        setPagamentos([]);
      }
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
      setPagamentos([]);
    } finally {
      setLoading(false);
    }
  }, [tamanhoPagina, abaAtiva]);

  const restaurarPagamento = async (id: number): Promise<void> => {
    try {
      await api.put(`/pagamentos/${id}/restaurar`);
      setMensagemSucesso('Lançamento financeiro restaurado com sucesso!');
      buscarPagamentos(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao restaurar pagamento:', err);
      setErrosValidacao(['Não foi possível restaurar o lançamento financeiro.']);
    }
  };

  // ─── Efeito de Inicialização Unificado ──────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarOpcoes = async () => {
      try {
        const [resPedidos, resFiltro] = await Promise.allSettled([
          api.get<PedidoRef[]>('/pedidos/resumo'),
          api.get<string[]>('/pagamentos/opcoes-filtro'),
        ]);

        if (!montado) return;

        if (resFiltro.status === 'fulfilled' && Array.isArray(resFiltro.value.data)) {
          const rotulos: Record<string, string> = {
            PENDENTE: 'Pendente',
            APROVADO: 'Aprovado',
            CANCELADO: 'Cancelado',
            ESTORNADO: 'Estornado',
          };
          setOpcoesStatus([
            { label: 'Todos os Status', value: 'TODOS' },
            ...resFiltro.value.data.map((value) => ({ label: rotulos[value] || value, value })),
          ]);
        }

        if (resPedidos.status === 'fulfilled' && Array.isArray(resPedidos.value.data)) {
          setPedidosOpcoes(resPedidos.value.data);
        }
      } catch (err) {
        console.error('Erro ao carregar opções de pagamentos:', err);
      }
    };

    carregarOpcoes();

    return () => {
      montado = false;
    };
  }, [tamanhoPagina]);

  useEffect(() => {
    buscarPagamentos(0, abaAtiva);
  }, [abaAtiva, buscarPagamentos]);

  // ─── Navegação com Auto-Scroll ───────────────────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarPagamentos(novaPagina);
      tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ─── Ações do Formulário ───────────────────────────────────────────────────
  const abrirNovoPagamentoForm = (): void => {
    setEditandoId(null);
    setErrosValidacao([]);
    setFormPagamento({
      fkPedidoId: '',
      valor: '',
      metodoPagamento: 'PIX',
      parcelas: 1,
      dataVencimento: new Date().toISOString().split('T')[0],
      status: 'PENDENTE'
    });
    setModalFormAberto(true);
  };

  const prepararEdicao = (pag: Pagamento): void => {
    setEditandoId(pag.id);
    setErrosValidacao([]);
    setFormPagamento({
      fkPedidoId: pag.pedido?.id || '',
      valor: pag.valor || '',
      metodoPagamento: pag.metodoPagamento || 'PIX',
      parcelas: pag.parcelas && pag.parcelas > 0 ? pag.parcelas : 1,
      dataVencimento: pag.dataVencimento || new Date().toISOString().split('T')[0],
      status: pag.status || 'PENDENTE'
    });
    setModalFormAberto(true);
  };

  const salvarPagamento = async (): Promise<void> => {
    const erros: string[] = [];
    if (!formPagamento.valor || Number(formPagamento.valor) <= 0) {
      erros.push('Informe um valor de lançamento válido e maior que R$ 0,00.');
    }
    if (!formPagamento.metodoPagamento) {
      erros.push('Selecione o método de pagamento.');
    }
    if (formPagamento.metodoPagamento === 'CARTAO_CREDITO') {
      const n = Number(formPagamento.parcelas);
      if (!n || n < 1 || n > 12) {
        erros.push('Informe de 1 a 12 parcelas no cartão de crédito.');
      }
    }

    if (erros.length > 0) {
      setErrosValidacao(erros);
      return;
    }

    try {
      const payload = {
        fkPedidoId: formPagamento.fkPedidoId ? Number(formPagamento.fkPedidoId) : null,
        valor: Number(formPagamento.valor),
        metodoPagamento: formPagamento.metodoPagamento,
        parcelas: formPagamento.metodoPagamento === 'CARTAO_CREDITO' ? Number(formPagamento.parcelas || 1) : null,
        dataVencimento: formPagamento.dataVencimento || null,
        status: formPagamento.status
      };

      if (editandoId) {
        await api.put(`/pagamentos/${editandoId}`, payload);
        setMensagemSucesso('Lançamento de pagamento atualizado com sucesso!');
      } else {
        await api.post('/pagamentos', payload);
        setMensagemSucesso('Novo pagamento registrado com sucesso!');
      }

      setModalFormAberto(false);
      buscarPagamentos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar pagamento:', err);
      const msg = formatErrorMessage(err, 'Não foi possível salvar o lançamento. Verifique as informações.');
      setErrosValidacao([msg]);
    }
  };

  const confirmarExclusao = async (): Promise<void> => {
    if (!modalExcluir.id) return;
    try {
      await api.delete(`/pagamentos/${modalExcluir.id}`);
      setMensagemSucesso('Lançamento financeiro movido para a lixeira com sucesso!');
      setModalExcluir({ aberto: false, id: null });
      buscarPagamentos(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir pagamento:', err);
      const msg = formatErrorMessage(err, 'Não foi possível mover este lançamento para a lixeira.');
      setErrosValidacao([msg]);
      setModalExcluir({ aberto: false, id: null });
    }
  };

  // ─── Lógica de Filtro do Lançamento ───────────────────────────────────────
  const pagamentosFiltrados = (Array.isArray(pagamentos) ? pagamentos : []).filter((pag) => {
    const atendeStatus =
      statusFiltro === 'TODOS'
      || pag.status === statusFiltro
      || (statusFiltro === 'APROVADO' && pag.status === 'PAGO');

    const termo = termoBusca.toLowerCase().trim();
    if (!termo) return atendeStatus;

    const matchId = String(pag.id).includes(termo);
    const matchPedido = pag.pedido?.id ? String(pag.pedido.id).includes(termo) : false;
    const matchMetodo = pag.metodoPagamento?.toLowerCase().includes(termo);
    const matchCliente = (pag.clienteNome || '').toLowerCase().includes(termo);

    return atendeStatus && (matchId || matchPedido || matchMetodo || matchCliente);
  });

  return (
    <div className="mm-page">
      <div className="mm-page-inner">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="mm-title">Pagamentos</h1>
            <p className="mm-subtitle">Controle recebimentos, vencimentos e pagamentos futuros.</p>
          </div>

          <button
            onClick={abrirNovoPagamentoForm}
            className="mm-btn-primary self-start md:self-auto"
          >
            + Novo Lançamento
          </button>
        </div>

        {mensagemSucesso && (
          <div className="mm-alert-ok">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {mensagemAviso && (
          <div className="mm-alert-warn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mensagemAviso}</span>
          </div>
        )}

        {/* BARRA DE FILTROS E BUSCA PADRONIZADA */}
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar por #ID do lançamento, pedido ref. ou método..."
          filtroValor={statusFiltro}
          onFiltroChange={setStatusFiltro}
          opcoesFiltro={opcoesStatus}
        />

        {/* Tabela de Lançamentos */}
        <section ref={tabelaRef} className="mm-card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAbaAtiva('ATIVOS')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer ${
                  abaAtiva === 'ATIVOS'
                    ? 'bg-brand-900 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                Pagamentos Ativos
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('VENCIDOS')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer ${
                  abaAtiva === 'VENCIDOS'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                Pagamentos vencidos
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('EXCLUIDOS')}
                className={`px-4 h-9 rounded-full text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'EXCLUIDOS'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-brand-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Pagamentos Removidos (Lixeira)
              </button>
            </div>

            <span className="text-[11px] font-semibold text-gray-500">
              Total: {totalElementos > 0 ? totalElementos : pagamentosFiltrados.length}
            </span>
          </div>

          {loading ? (
            <p className="p-8 text-center text-xs text-gray-500">
              Carregando pagamentos...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-300 font-semibold text-gray-700 border-b border-gray-300">
                    <th className="p-3">#ID</th>
                    <th className="p-3">Pedido Ref.</th>
                    <th className="p-3">Método</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pagamentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center italic text-gray-500">
                        {abaAtiva === 'EXCLUIDOS'
                          ? 'Nenhum pagamento removido na lixeira.'
                          : abaAtiva === 'VENCIDOS'
                            ? 'Nenhum pagamento vencido no momento.'
                            : 'Nenhum pagamento registrado.'}
                      </td>
                    </tr>
                  ) : (
                    pagamentosFiltrados.map((pag) => (
                      <tr key={pag.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-semibold text-gray-500">#{pag.id}</td>
                        <td className="p-3 font-semibold text-gray-800">
                          {pag.pedido?.id ? `Pedido #${pag.pedido.id}` : '—'}
                        </td>
                        <td className="p-3 text-xs font-sans text-gray-700">
                          {rotuloMetodoPagamento(pag.metodoPagamento, pag.parcelas)}
                        </td>
                        <td className="p-3 text-gray-600">
                          {formatarData(pag.dataVencimento)}
                        </td>
                        <td className="p-3 font-semibold text-gray-800">
                          R$ {Number(pag.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold uppercase border ${
                              pag.status === 'APROVADO' || pag.status === 'PAGO'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : pag.status === 'CANCELADO' || pag.status === 'ESTORNADO'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {pag.status === 'PAGO' ? 'APROVADO' : pag.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center items-center gap-1">
                            {abaAtiva === 'EXCLUIDOS' ? (
                              <button
                                type="button"
                                onClick={() => restaurarPagamento(pag.id)}
                                className="bg-brand-700 hover:bg-brand-800 text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                title="Restaurar lançamento financeiro"
                              >
                                <RotateCcw className="w-4 h-4" /> Restaurar
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nome = pag.clienteNome || 'Cliente';
                                    const valor = Number(pag.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                                    const metodo = rotuloMetodoPagamento(pag.metodoPagamento, pag.parcelas);
                                    const pedidoTxt = pag.pedido?.id ? ` do pedido *#${pag.pedido.id}*` : '';
                                    const aprovado = pag.status === 'APROVADO' || pag.status === 'PAGO';
                                    const texto = aprovado
                                      ? `Olá, ${nome}!\n\nConfirmamos o recebimento de *R$ ${valor}* (${metodo})${pedidoTxt} na *Maria Morena*.\n\nObrigada!`
                                      : `Olá, ${nome}!\n\nLembrete da *Maria Morena*: o pagamento de *R$ ${valor}* (${metodo})${pedidoTxt} está com vencimento em *${formatarData(pag.dataVencimento)}* e status *${pag.status}*.\n\nQualquer dúvida, fale com a gente.`;
                                    setModalWhats({
                                      aberto: true,
                                      telefone: pag.clienteTelefone || '',
                                      mensagem: texto,
                                    });
                                  }}
                                  className="bg-[#25D366] hover:bg-[#1ebd59] text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                  title="Enviar mensagem no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-white" /> Whats
                                </button>
                                <button
                                  onClick={() => prepararEdicao(pag)}
                                  className="p-2 rounded-lg text-gray-500 hover:text-brand-900 hover:bg-brand-100/70 transition cursor-pointer"
                                  title="Editar Lançamento"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setModalExcluir({ aberto: true, id: pag.id })}
                                  className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                  title="Mover Lançamento para a Lixeira"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
          <Paginacao
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalElementos={totalElementos}
            onMudarPagina={mudarPagina}
          />
        </section>

        {/* MODAL: FORMULÁRIO DE LANÇAMENTO / EDIÇÃO DE PAGAMENTO */}
        {modalFormAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md p-6 shadow-2xl rounded-3xl animate-subir max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="flex justify-between items-start gap-3 mb-5">
                <h3 className="font-display text-xl font-semibold text-brand-900">
                  {editandoId ? `Editando Pagamento #${editandoId}` : 'Novo Lançamento Financeiro'}
                </h3>
                <button
                  onClick={() => setModalFormAberto(false)}
                  className="w-9 h-9 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 text-2xl leading-none transition cursor-pointer shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {errosValidacao.length > 0 && (
                  <div className="mm-alert-err">
                    {errosValidacao.map((err, i) => (
                      <p key={i} className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                <div>
                  <label className="mm-label">
                    Vincular ao Pedido (Opcional)
                  </label>
                  <select
                    value={formPagamento.fkPedidoId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      const pedIdStr = e.target.value;
                      const pedEncontrado = pedidosOpcoes.find((p) => String(p.id) === pedIdStr);
                      setFormPagamento((prev) => ({
                        ...prev,
                        fkPedidoId: pedIdStr,
                        valor: pedEncontrado?.valorTotal ? String(pedEncontrado.valorTotal) : prev.valor
                      }));
                    }}
                    className="mm-input"
                  >
                    <option value="">Sem Pedido Vinculado (Avulso)</option>
                    {pedidosOpcoes.map((ped) => (
                      <option key={ped.id} value={ped.id}>
                        Pedido #{ped.id} {ped.valorTotal ? `— R$ ${Number(ped.valorTotal).toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mm-label">
                      Valor (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formPagamento.valor}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormPagamento({ ...formPagamento, valor: e.target.value })
                      }
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="mm-label">
                      Método *
                    </label>
                    <select
                      value={formPagamento.metodoPagamento}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setFormPagamento({
                          ...formPagamento,
                          metodoPagamento: e.target.value,
                          parcelas: e.target.value === 'CARTAO_CREDITO' ? (formPagamento.parcelas || 1) : 1,
                        })
                      }
                      className="mm-input"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CARTAO_CREDITO">Cartão de crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="PAGAMENTO_FUTURO">Pagamento futuro</option>
                    </select>
                  </div>
                </div>

                {formPagamento.metodoPagamento === 'CARTAO_CREDITO' && (
                  <div>
                    <label className="mm-label">
                      Parcelas *
                    </label>
                    <select
                      value={formPagamento.parcelas}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setFormPagamento({ ...formPagamento, parcelas: Number(e.target.value) })
                      }
                      className="mm-input"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}x {n === 1 ? '(à vista)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mm-label">
                      Data Vencimento
                    </label>
                    <input
                      type="date"
                      value={formPagamento.dataVencimento}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormPagamento({ ...formPagamento, dataVencimento: e.target.value })
                      }
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="mm-label">
                      Status Lançamento
                    </label>
                    <select
                      value={formPagamento.status}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setFormPagamento({ ...formPagamento, status: e.target.value })
                      }
                      className="mm-input"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="APROVADO">APROVADO</option>
                      <option value="CANCELADO">CANCELADO</option>
                      <option value="ESTORNADO">ESTORNADO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t flex justify-end gap-2">
                <button
                  onClick={() => setModalFormAberto(false)}
                  className="mm-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarPagamento}
                  className="mm-btn-primary"
                >
                  Salvar Lançamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EXCLUSÃO DE LANÇAMENTO */}
        {modalExcluir.aberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white p-6 max-w-sm w-full shadow-2xl rounded-3xl animate-subir max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h4 className="font-serif text-base text-red-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                Excluir Pagamento
              </h4>
              <p className="text-sm text-gray-600 mb-5">
                Confirma a remoção permanente deste lançamento financeiro?
              </p>
              <div className="flex justify-end gap-2 text-[11px] font-semibold">
                <button
                  onClick={() => setModalExcluir({ aberto: false, id: null })}
                  className="mm-btn-secondary"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarExclusao}
                  className="mm-btn-danger"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        <ModalWhatsAppMensagem
          isOpen={modalWhats.aberto}
          titulo="Mensagem de pagamento"
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
    </div>
  );
};

export default TelaPagamentos;