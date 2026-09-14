'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { AxiosError } from 'axios';
import { Users, MessageSquare, Mail, Pencil, Trash2, Plus, Search, CheckCircle2, RotateCcw, UserX } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';
import SystemModal from '@/components/SystemModal';
import { formatErrorMessage } from '@/utils/errorUtils';

// ─── Interfaces / Tipagens ──────────────────────────────────────────────────
export interface Usuario {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  perfil?: 'CLIENTE' | 'ADMIN' | 'VENDEDOR' | string;
  ativo?: boolean;
}

export interface FormDataUsuario {
  nome: string;
  telefone: string;
  email: string;
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
    email: '',
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

  // Máscara dinâmica de WhatsApp / Telefone
  const formatarTelefoneInput = (valor: string): string => {
    if (!valor) return '';
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 10) {
      return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
    }
    return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    if (name === 'telefone') {
      setFormData((prev) => ({ ...prev, telefone: formatarTelefoneInput(value) }));
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
      email: cliente.email || '',
      perfil: cliente.perfil || 'CLIENTE',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelarEdicao = (): void => {
    setClienteEmEdicao(null);
    setFormData({ nome: '', telefone: '', email: '', perfil: 'CLIENTE' });
  };

  // Submissão (Cadastrar ou Atualizar)
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMensagemSucesso('');
    setErro('');

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
      const msg = formatErrorMessage(err, 'Falha ao salvar. Verifique se o telefone ou e-mail já existem na base.');
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

  // Monta a URL válida para disparo direto no WhatsApp
  const linkWhatsApp = (telefone?: string): string => {
    if (!telefone) return '#';
    const numLimpo = telefone.replace(/\D/g, '');
    return `https://wa.me/55${numLimpo}`;
  };

  // Filtro local resiliente
  const clientesFiltrados = (Array.isArray(clientes) ? clientes : []).filter(
    (c) =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone?.includes(busca) ||
      c.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* CABEÇALHO */}
        <div>
          <h1 className="text-3xl font-sans font-bold text-[#2d3a22]">
            Clientes
          </h1>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 flex items-center gap-4">
            <div className="p-3 bg-[#e8eae0] text-[#2d3a22] rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Base Total de Clientes
              </p>
              <h3 className="text-2xl font-extrabold text-gray-800">
                {totalElementos > 0 ? totalElementos : clientes.length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 flex items-center gap-4">
            <div className="p-3 bg-[#e8eae0] text-[#2d3a22] rounded-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Com WhatsApp Cadastrado
              </p>
              <h3 className="text-2xl font-extrabold text-gray-800">
                {clientes.filter((c) => c.telefone).length}
              </h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 flex items-center gap-4">
            <div className="p-3 bg-[#e8eae0] text-[#2d3a22] rounded-lg">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Com E-mail Vinculado
              </p>
              <h3 className="text-2xl font-extrabold text-gray-800">
                {clientes.filter((c) => c.email).length}
              </h3>
            </div>
          </div>
        </div>

        {/* BARRA DE BUSCA PADRONIZADA */}
        <BarraBuscaFiltro
          termoBusca={busca}
          onBuscaChange={setBusca}
          placeholder="Buscar por nome, WhatsApp ou e-mail..."
        />

        {/* MENSAGENS */}
        {mensagemSucesso && (
          <div className="bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {erro && (
          <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-lg text-xs font-bold shadow-sm">
            {erro}
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* FORMULÁRIO */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#3b4a28]">
                {clienteEmEdicao
                  ? `Editar Cliente (#${clienteEmEdicao.id})`
                  : 'Cadastrar Novo Cliente'}
              </h2>
              {clienteEmEdicao && (
                <button
                  type="button"
                  onClick={handleCancelarEdicao}
                  className="text-[10px] text-red-600 font-bold uppercase hover:underline cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: Maria Silva"
                  className="w-full border border-gray-300 p-2.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b4a28]/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
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
                  className="w-full border border-gray-300 p-2.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b4a28]/50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="maria@email.com"
                  className="w-full border border-gray-300 p-2.5 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3b4a28]/50"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#3b4a28] hover:bg-[#2d3a22] text-white font-bold text-xs py-3 px-4 rounded-lg uppercase tracking-wider transition-all shadow-sm cursor-pointer"
              >
                {clienteEmEdicao ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
            </form>
          </div>

          {/* TABELA DE CLIENTES */}
          <div ref={tabelaRef} className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAbaAtiva('ATIVOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    abaAtiva === 'ATIVOS'
                      ? 'bg-[#3b4a28] text-white shadow-sm'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Clientes Ativos
                </button>

                <button
                  type="button"
                  onClick={() => setAbaAtiva('EXCLUIDOS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    abaAtiva === 'EXCLUIDOS'
                      ? 'bg-red-700 text-white shadow-sm'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" /> Clientes Inativos (Lixeira)
                </button>
              </div>

              <span className="text-[11px] font-bold text-gray-500 uppercase">
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
                    <tr className="bg-[#cbd0c0] font-bold uppercase text-gray-700 border-b border-gray-300">
                      <th className="p-3 border-r border-gray-300/50">ID</th>
                      <th className="p-3 border-r border-gray-300/50">Nome</th>
                      <th className="p-3 border-r border-gray-300/50">WhatsApp</th>
                      <th className="p-3 border-r border-gray-300/50">E-mail</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center italic text-gray-500">
                          {abaAtiva === 'EXCLUIDOS' ? 'Nenhum cliente inativo na lixeira.' : 'Nenhum cliente ativo encontrado.'}
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cli) => (
                        <tr key={cli.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-3 border-r font-bold text-gray-500">#{cli.id}</td>
                          <td className="p-3 border-r font-bold text-gray-800">{cli.nome}</td>
                          <td className="p-3 border-r text-gray-600 font-mono">
                            {cli.telefone ? formatarTelefoneInput(cli.telefone) : '—'}
                          </td>
                          <td className="p-3 border-r text-gray-600">{cli.email || '—'}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {cli.telefone ? (
                                <a
                                  href={linkWhatsApp(cli.telefone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#25D366] hover:bg-[#1ebd59] text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                                  title="Iniciar conversa no WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-white" /> Whats
                                </a>
                              ) : null}

                              {abaAtiva === 'EXCLUIDOS' ? (
                                <button
                                  type="button"
                                  onClick={() => restaurarCliente(cli.id)}
                                  className="bg-green-700 hover:bg-green-800 text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm flex items-center gap-1 cursor-pointer"
                                  title="Reativar cliente na base"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reativar
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditar(cli)}
                                    className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                                    title="Editar dados da cliente"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExcluir(cli.id, cli.nome)}
                                    className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700"
                                    title="Desativar cliente (Mover para Inativos)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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