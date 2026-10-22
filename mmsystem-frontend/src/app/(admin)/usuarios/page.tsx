'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { AxiosError } from 'axios';
import { Users, MessageSquare, Pencil, Trash2, CheckCircle2, RotateCcw, UserX } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SystemModal from '@/components/SystemModal';
import { formatErrorMessage } from '@/utils/errorUtils';
import { formatarNomePessoa, formatarTelefoneInput, validarNomePessoa, validarWhatsApp } from '@/utils/contato';

// ─── Interfaces / Tipagens ──────────────────────────────────────────────────
export interface Usuario {
  id: number;
  nome: string;
  telefone?: string;
  perfil?: 'CLIENTE' | 'ADMIN' | 'VENDEDOR' | string;
  ativo?: boolean;
}

export interface FormDataUsuario {
  nome: string;
  telefone: string;
  perfil: string;
}

interface PageSpring<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface ApiErrorResponse {
  message?: string;
  erro?: string;
}

const TelaUsuarios: React.FC = () => {
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [erro, setErro] = useState<string>('');
  const [busca, setBusca] = useState<string>('');

  // Controle de Abas (Ativos vs Excluídos/Inativos)
  const [abaAtiva, setAbaAtiva] = useState<'ATIVOS' | 'EXCLUIDOS'>('ATIVOS');

  // Referência para Auto-Scroll na tabela
  const tabelaRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalElementos, setTotalElementos] = useState<number>(0);
  const tamanhoPagina = 5;

  // Estado para controle de edição
  const [clienteEmEdicao, setClienteEmEdicao] = useState<Usuario | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState<FormDataUsuario>({
    nome: '',
    telefone: '',
    perfil: 'CLIENTE',
  });

  // ─── Função de Busca Paginada ──────────────────────────────────────────────
  const buscarClientesPagina = async (pagina: number = 0, tipoAba: 'ATIVOS' | 'EXCLUIDOS' = abaAtiva): Promise<void> => {
    try {
      setLoading(true);
      const url = tipoAba === 'EXCLUIDOS'
        ? `/usuarios/excluidos?page=${pagina}&size=${tamanhoPagina}`
        : `/usuarios?page=${pagina}&size=${tamanhoPagina}`;

      const res = await api.get<PageSpring<Usuario> | Usuario[]>(url);
      
      if (res.data && Array.isArray((res.data as PageSpring<Usuario>).content)) {
        const dados = res.data as PageSpring<Usuario>;
        setClientes(dados.content);
        setTotalPaginas(dados.totalPages);
        setTotalElementos(dados.totalElements);
        setPaginaAtual(dados.number);
      } else if (Array.isArray(res.data)) {
        setClientes(res.data);
      } else {
        setClientes([]);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setErro('Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarClientesPagina(0, abaAtiva);
  }, [abaAtiva]);

  // ─── Navegação com Auto-Scroll ───────────────────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarClientesPagina(novaPagina, abaAtiva);
      tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const restaurarCliente = async (id: number): Promise<void> => {
    try {
      await api.put(`/usuarios/${id}/restaurar`);
      setMensagemSucesso('Cliente reativado com sucesso!');
      buscarClientesPagina(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao restaurar cliente:', err);
      setErro('Não foi possível reativar o cliente.');
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    if (name === 'telefone') {
      setFormData((prev) => ({ ...prev, telefone: formatarTelefoneInput(value) }));
    } else if (name === 'nome') {
      setFormData((prev) => ({ ...prev, nome: formatarNomePessoa(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Prepara o formulário para edição
  const handleEditar = (cliente: Usuario): void => {
    setClienteEmEdicao(cliente);
    setFormData({
      nome: cliente.nome || '',
      telefone: cliente.telefone ? formatarTelefoneInput(cliente.telefone) : '',
      perfil: cliente.perfil || 'CLIENTE',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = (): void => {
    setClienteEmEdicao(null);
    setFormData({ nome: '', telefone: '', perfil: 'CLIENTE' });
  };

  // Submissão (Cadastrar ou Atualizar)
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMensagemSucesso('');
    setErro('');

    const erroNome = validarNomePessoa(formData.nome);
    if (erroNome) {
      setErro(erroNome);
      return;
    }
    const erroTel = validarWhatsApp(formData.telefone);
    if (erroTel) {
      setErro(erroTel);
      return;
    }

    const dadosParaEnvio = {
      ...formData,
      telefone: formData.telefone.replace(/\D/g, ''),
    };

    try {
      if (clienteEmEdicao) {
        await api.put(`/usuarios/${clienteEmEdicao.id}`, dadosParaEnvio);
        setMensagemSucesso('Cliente atualizado com sucesso!');
      } else {
        await api.post('/usuarios', dadosParaEnvio);
        setMensagemSucesso('Cliente cadastrado com sucesso!');
      }

      handleCancelarEdicao();
      buscarClientesPagina(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      const msg = formatErrorMessage(err, 'Falha ao salvar. Verifique se o WhatsApp já existe na base.');
      setErro(msg);
    }
  };

  // Modal de confirmação do sistema
  const [modalConfirm, setModalConfirm] = useState<{
    isOpen: boolean;
    id?: number;
    nome?: string;
  }>({
    isOpen: false,
  });

  // Exclusão via DELETE /usuarios/{id}
  const handleExcluir = (id: number, nome: string): void => {
    setModalConfirm({
      isOpen: true,
      id,
      nome,
    });
  };

  const confirmarExclusao = async (): Promise<void> => {
    if (!modalConfirm.id) return;
    try {
      await api.delete(`/usuarios/${modalConfirm.id}`);
      setMensagemSucesso('Cliente movido para a lixeira com sucesso!');
      setModalConfirm({ isOpen: false });
      buscarClientesPagina(paginaAtual, abaAtiva);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
      const msg = formatErrorMessage(err, 'Não foi possível mover o cliente para a lixeira.');
      setErro(msg);
      setModalConfirm({ isOpen: false });
    }
  };

  // Filtro local resiliente
  const clientesFiltrados = (Array.isArray(clientes) ? clientes : []).filter(
    (c) =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca)
  );

  return (
    <div className="mm-page">
      <div className="mm-page-inner">
        {/* CABEÇALHO */}
        <div>
          <h1 className="mm-title">Clientes</h1>
          <p className="mm-subtitle">Cadastro e contato das clientes da loja.</p>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          <div className="mm-card mm-card-hover p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 text-brand-800 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Base total de clientes</p>
              <h3 className="text-2xl font-semibold text-brand-900 tabular-nums">
                {totalElementos > 0 ? totalElementos : clientes.length}
              </h3>
            </div>
          </div>

          <div className="mm-card mm-card-hover p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-clay-100 text-clay-600 rounded-2xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Com WhatsApp cadastrado</p>
              <h3 className="text-2xl font-semibold text-brand-900 tabular-nums">
                {clientes.filter((c) => c.telefone).length}
              </h3>
            </div>
          </div>
        </div>

        {/* BARRA DE BUSCA PADRONIZADA */}
        <BarraBuscaFiltro
          termoBusca={busca}
          onBuscaChange={setBusca}
          placeholder="Buscar por nome ou WhatsApp..."
        />

        {/* MENSAGENS */}
        {mensagemSucesso && (
          <div className="mm-alert-ok">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold shadow-sm">
            {erro}
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* FORMULÁRIO */}
          <div className="mm-card p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-xl font-semibold text-brand-900">
                {clienteEmEdicao
                  ? `Editar Cliente (#${clienteEmEdicao.id})`
                  : 'Cadastrar Novo Cliente'}
              </h2>
              {clienteEmEdicao && (
                <button
                  type="button"
                  onClick={handleCancelarEdicao}
                  className="text-[11px] text-red-600 font-semibold hover:underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mm-label">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Maria Silva"
                  maxLength={40}
                  className="mm-input"
                />
              </div>

              <div>
                <label className="mm-label">
                  WhatsApp / Telefone *
                </label>
                <input
                  type="text"
                  name="telefone"
                  required
                  maxLength={15}
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(43) 99999-8888"
                  className="mm-input"
                />
              </div>

              <button
                type="submit"
                className="mm-btn-primary w-full"
              >
                {clienteEmEdicao ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
            </form>
          </div>

          {/* TABELA DE CLIENTES */}
          <div ref={tabelaRef} className="lg:col-span-2 mm-card overflow-hidden">
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
                  Clientes Ativos
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
                  <UserX className="w-3.5 h-3.5" /> Clientes Inativos (Lixeira)
                </button>
              </div>

              <span className="text-[11px] font-semibold text-gray-500">
                Total: {totalElementos > 0 ? totalElementos : clientesFiltrados.length}
              </span>
            </div>

            {loading ? (
              <p className="p-8 text-center text-xs text-gray-500 font-medium">
                Carregando clientes...
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-300 font-semibold text-gray-700 border-b border-gray-300">
                      <th className="p-3 border-r border-gray-300/50">ID</th>
                      <th className="p-3 border-r border-gray-300/50">Nome</th>
                      <th className="p-3 border-r border-gray-300/50">WhatsApp</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center italic text-gray-500">
                          {abaAtiva === 'EXCLUIDOS' ? 'Nenhum cliente inativo na lixeira.' : 'Nenhum cliente ativo encontrado.'}
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cli) => (
                        <tr key={cli.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 border-r font-semibold text-gray-500">#{cli.id}</td>
                          <td className="p-3 border-r font-semibold text-gray-800">{cli.nome}</td>
                          <td className="text-gray-600 tabular-nums">
                            {cli.telefone ? formatarTelefoneInput(cli.telefone) : '—'}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {abaAtiva === 'EXCLUIDOS' ? (
                                <button
                                  type="button"
                                  onClick={() => restaurarCliente(cli.id)}
                                  className="bg-brand-700 hover:bg-brand-800 text-white px-2.5 h-8 rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                                  title="Reativar cliente na base"
                                >
                                  <RotateCcw className="w-4 h-4" /> Reativar
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditar(cli)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-brand-900 hover:bg-brand-100/70 transition cursor-pointer"
                                    title="Editar dados da cliente"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExcluir(cli.id, cli.nome)}
                                    className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                    title="Desativar cliente (Mover para Inativos)"
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
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE SOFT DELETE */}
      <SystemModal
        isOpen={modalConfirm.isOpen}
        title="Mover Cliente para a Lixeira"
        onClose={() => setModalConfirm({ isOpen: false })}
        onConfirm={confirmarExclusao}
        confirmText="Mover para a Lixeira"
        confirmVariant="danger"
      >
        <p className="text-xs text-gray-700">
          Tem certeza que deseja mover a cliente <strong>{modalConfirm.nome}</strong> para a lixeira?
        </p>
        <p className="text-[11px] text-gray-500 mt-2">
          A cliente será desativada, mas todo o histórico de compras, pedidos e condicionais permanecerá 100% preservado no sistema.
        </p>
      </SystemModal>
    </div>
  );
};

export default TelaUsuarios;