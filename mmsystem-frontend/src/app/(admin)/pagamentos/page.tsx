'use client';

import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { Pencil, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import { formatErrorMessage } from '@/utils/errorUtils';

// ─── Interfaces / Tipagens ──────────────────────────────────────────────────
export interface PedidoRef {
  id: number;
  valorTotal?: number;
}

export interface Pagamento {
  id: number;
  pedido?: PedidoRef;
  metodoPagamento: string;
  dataVencimento?: string | null;
  valor: number | string;
  status: 'PAGO' | 'PENDENTE' | 'ATRASADO' | string;
}

export interface FormPagamentoData {
  fkPedidoId: string | number;
  valor: string | number;
  metodoPagamento: string;
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

const TelaPagamentos: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pedidosOpcoes, setPedidosOpcoes] = useState<PedidoRef[]>([]);
  
  // ─── Estados de Filtro e Busca ───────────────────────────────────────────
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [loading, setLoading] = useState<boolean>(true);

  // Mensagens de Feedback
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  // Modais e Estados de Edição
  const [modalFormAberto, setModalFormAberto] = useState<boolean>(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalExcluir, setModalExcluir] = useState<ModalExcluirState>({ aberto: false, id: null });

  // Formulário Local
  const [formPagamento, setFormPagamento] = useState<FormPagamentoData>({
    fkPedidoId: '',
    valor: '',
    metodoPagamento: 'PIX',
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
  const buscarPagamentos = useCallback(async (pagina: number = 0): Promise<void> => {
    try {
      setLoading(true);
      const res = await api.get<PageSpring<Pagamento> | Pagamento[]>(`/pagamentos?page=${pagina}&size=${tamanhoPagina}`);
      
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
  }, [tamanhoPagina]);

  // ─── Efeito de Inicialização Unificado ──────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarTudo = async () => {
      try {
        setLoading(true);

        const [resPagamentos, resPedidos] = await Promise.allSettled([
          api.get<PageSpring<Pagamento> | Pagamento[]>(`/pagamentos?page=0&size=${tamanhoPagina}`),
          api.get<PageSpring<PedidoRef> | PedidoRef[]>('/pedidos?size=1000')
        ]);

        if (!montado) return;

        if (resPagamentos.status === 'fulfilled' && resPagamentos.value.data) {
          const dados = resPagamentos.value.data;
          if (Array.isArray((dados as PageSpring<Pagamento>).content)) {
            const pageData = dados as PageSpring<Pagamento>;
            setPagamentos(pageData.content);
            setTotalPaginas(pageData.totalPages);
            setTotalElementos(pageData.totalElements);
            setPaginaAtual(pageData.number);
          } else if (Array.isArray(dados)) {
            setPagamentos(dados);
          }
        }

        if (resPedidos.status === 'fulfilled' && resPedidos.value.data) {
          const dadosPed = resPedidos.value.data;
          if (Array.isArray((dadosPed as PageSpring<PedidoRef>).content)) {
            setPedidosOpcoes((dadosPed as PageSpring<PedidoRef>).content);
          } else if (Array.isArray(dadosPed)) {
            setPedidosOpcoes(dadosPed);
          }
        }

      } catch (err) {
        console.error('Erro ao carregar dados iniciais de pagamentos:', err);
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

    if (erros.length > 0) {
      setErrosValidacao(erros);
      return;
    }

    try {
      const payload = {
        fkPedidoId: formPagamento.fkPedidoId ? Number(formPagamento.fkPedidoId) : null,
        valor: Number(formPagamento.valor),
        metodoPagamento: formPagamento.metodoPagamento,
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
      setMensagemSucesso('Lançamento removido com sucesso!');
      setModalExcluir({ aberto: false, id: null });
      buscarPagamentos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir pagamento:', err);
      const msg = formatErrorMessage(err, 'Não foi possível excluir este lançamento.');
      setErrosValidacao([msg]);
      setModalExcluir({ aberto: false, id: null });
    }
  };

  // ─── Lógica de Filtro do Lançamento ───────────────────────────────────────
  const pagamentosFiltrados = (Array.isArray(pagamentos) ? pagamentos : []).filter((pag) => {
    const atendeStatus = statusFiltro === 'TODOS' || pag.status === statusFiltro;

    const termo = termoBusca.toLowerCase().trim();
    if (!termo) return atendeStatus;

    const matchId = String(pag.id).includes(termo);
    const matchPedido = pag.pedido?.id ? String(pag.pedido.id).includes(termo) : false;
    const matchMetodo = pag.metodoPagamento?.toLowerCase().includes(termo);

    return atendeStatus && (matchId || matchPedido || matchMetodo);
  });

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-[#2d3a22]">
              Pagamentos &amp; Lançamentos
            </h1>
          </div>

          <button
            onClick={abrirNovoPagamentoForm}
            className="bg-[#2d3a22] hover:bg-[#3d5427] text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer self-start md:self-auto"
          >
            + Novo Lançamento
          </button>
        </div>

        {mensagemSucesso && (
          <div className="bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}

        {/* BARRA DE FILTROS E BUSCA PADRONIZADA */}
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar por #ID do lançamento, pedido ref. ou método..."
          filtroValor={statusFiltro}
          onFiltroChange={setStatusFiltro}
          opcoesFiltro={[
            { label: 'Todos os Status', value: 'TODOS' },
            { label: 'Pago', value: 'PAGO' },
            { label: 'Pendente', value: 'PENDENTE' },
            { label: 'Atrasado', value: 'ATRASADO' }
          ]}
        />

        {/* Tabela de Lançamentos */}
        <section ref={tabelaRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase text-gray-700">
              Histórico de Lançamentos ({totalElementos > 0 ? totalElementos : pagamentosFiltrados.length})
            </h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-xs text-gray-500">
              Carregando pagamentos...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#cbd0c0] font-bold uppercase text-gray-700 border-b border-gray-300">
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
                        Nenhum pagamento registrado.
                      </td>
                    </tr>
                  ) : (
                    pagamentosFiltrados.map((pag) => (
                      <tr key={pag.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-500">#{pag.id}</td>
                        <td className="p-3 font-bold text-gray-800">
                          {pag.pedido?.id ? `Pedido #${pag.pedido.id}` : '—'}
                        </td>
                        <td className="p-3 font-mono text-gray-700 uppercase">
                          {pag.metodoPagamento}
                        </td>
                        <td className="p-3 text-gray-600">
                          {pag.dataVencimento || '—'}
                        </td>
                        <td className="p-3 font-bold text-gray-800">
                          R$ {Number(pag.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              pag.status === 'PAGO'
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : pag.status === 'ATRASADO'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                          >
                            {pag.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => prepararEdicao(pag)}
                              className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                              title="Editar Lançamento"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setModalExcluir({ aberto: true, id: pag.id })}
                              className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700"
                              title="Excluir Lançamento"
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
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-sm w-full max-w-md p-6 shadow-2xl border-t-4 border-[#4a5d33]">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h3 className="font-serif text-lg text-gray-900">
                  {editandoId ? `Editando Pagamento #${editandoId}` : 'Novo Lançamento Financeiro'}
                </h3>
                <button
                  onClick={() => setModalFormAberto(false)}
                  className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {errosValidacao.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-red-600 p-2.5 text-red-900 font-semibold rounded-sm">
                    {errosValidacao.map((err, i) => (
                      <p key={i} className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
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
                    className="w-full border p-2 bg-gray-50 text-xs outline-none focus:border-gray-400 rounded-lg"
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
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
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
                      className="w-full border p-2 bg-gray-50 text-xs outline-none font-bold text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Método *
                    </label>
                    <select
                      value={formPagamento.metodoPagamento}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setFormPagamento({ ...formPagamento, metodoPagamento: e.target.value })
                      }
                      className="w-full border p-2 bg-gray-50 text-xs outline-none uppercase font-mono"
                    >
                      <option value="PIX">PIX</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de Débito</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="BOLETO">Boleto</option>
                      <option value="PAGAMENTO_FUTURO">Pagamento Futuro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Data Vencimento
                    </label>
                    <input
                      type="date"
                      value={formPagamento.dataVencimento}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setFormPagamento({ ...formPagamento, dataVencimento: e.target.value })
                      }
                      className="w-full border p-2 bg-gray-50 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Status Lançamento
                    </label>
                    <select
                      value={formPagamento.status}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        setFormPagamento({ ...formPagamento, status: e.target.value })
                      }
                      className="w-full border p-2 bg-gray-50 text-xs outline-none font-bold"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="PAGO">PAGO</option>
                      <option value="ATRASADO">ATRASADO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t flex justify-end gap-2">
                <button
                  onClick={() => setModalFormAberto(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-[10px] font-bold uppercase hover:bg-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarPagamento}
                  className="px-5 py-2 bg-[#4a5d33] text-white text-[10px] font-bold uppercase hover:brightness-110 shadow-md cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EXCLUSÃO DE LANÇAMENTO */}
        {modalExcluir.aberto && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-5 max-w-xs w-full rounded-sm border-t-4 border-red-600 shadow-2xl">
              <h4 className="font-serif text-base text-red-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                Excluir Pagamento
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                Confirma a remoção permanente deste lançamento financeiro?
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

export default TelaPagamentos;