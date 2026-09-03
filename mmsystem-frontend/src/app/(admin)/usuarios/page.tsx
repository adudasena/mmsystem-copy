'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { AxiosError } from 'axios';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';

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

  // ─── Efeito de Inicialização Segura ───────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarInicial = async () => {
      try {
        setLoading(true);
        const res = await api.get<PageSpring<Usuario> | Usuario[]>(`/usuarios?page=0&size=${tamanhoPagina}`);
        
        if (montado) {
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
        }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        if (montado) {
        }
      } finally {
        if (montado) {
          setLoading(false);
        }
      }
    };

    carregarInicial();

    return () => {
      montado = false;
    };
  }, [tamanhoPagina]);

  // ─── Função de Busca Paginada ──────────────────────────────────────────────
  const buscarClientesPagina = async (pagina: number = 0): Promise<void> => {
    try {
      setLoading(true);
      const res = await api.get<PageSpring<Usuario> | Usuario[]>(`/usuarios?page=${pagina}&size=${tamanhoPagina}`);
      
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

  // ─── Navegação com Auto-Scroll ───────────────────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarClientesPagina(novaPagina);
      tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        setMensagemSucesso('Cliente atualizado com sucesso! ✨');
      } else {
        await api.post('/usuarios', dadosParaEnvio);
        setMensagemSucesso('Cliente cadastrado com sucesso! ✨');
      }

      handleCancelarEdicao();
      buscarClientesPagina(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 4000);
    } catch (err) {
      const erroAxios = err as AxiosError<ApiErrorResponse>;
      console.error('Erro ao salvar cliente:', erroAxios);
      const msg =
        erroAxios.response?.data?.message ||
        'Falha ao salvar. Verifique se o telefone ou e-mail já existem na base.';
      setErro(msg);
    }
  };

  // Exclusão via DELETE /usuarios/{id}
  const handleExcluir = async (id: number, nome: string): Promise<void> => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de "${nome}"?`)) {
      try {
        await api.delete(`/usuarios/${id}`);
        setMensagemSucesso('Cliente removido com sucesso!');
        buscarClientesPagina(paginaAtual);
        setTimeout(() => setMensagemSucesso(''), 4000);
      } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        setErro('Não foi possível excluir o cliente.');
      }
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
          <h1 className="text-3xl font-serif font-bold text-[#2d3a22]">
            Clientes
          </h1>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 flex items-center gap-4">
            <div className="p-3 bg-[#e8eae0] text-[#3b4a28] rounded-lg text-xl">👥</div>
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
            <div className="p-3 bg-[#e8eae0] text-[#3b4a28] rounded-lg text-xl">💬</div>
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
            <div className="p-3 bg-[#e8eae0] text-[#3b4a28] rounded-lg text-xl">📧</div>
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
          <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg text-xs font-bold shadow-sm">
            {mensagemSucesso}
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Clientes Cadastrados ({totalElementos > 0 ? totalElementos : clientesFiltrados.length})
              </h2>
            </div>

            {loading ? (
              <p className="p-8 text-center text-xs text-gray-500 font-medium">
                Carregando lista de clientes...
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
                          Nenhum cliente encontrado.
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
                            <div className="flex items-center justify-center gap-1.5">
                              {cli.telefone ? (
                                <a
                                  href={linkWhatsApp(cli.telefone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebd59] text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm"
                                  title="Iniciar conversa no WhatsApp"
                                >
                                  💬 Whats
                                </a>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleEditar(cli)}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm cursor-pointer"
                                title="Editar dados da cliente"
                              >
                                ✏️ Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExcluir(cli.id, cli.nome)}
                                className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm cursor-pointer"
                                title="Excluir cliente"
                              >
                                🗑️ Excluir
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
            {totalPaginas > 1 && (
              <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                <span>
                  Página <strong>{paginaAtual + 1}</strong> de <strong>{totalPaginas}</strong> (Total: {totalElementos} itens)
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => mudarPagina(paginaAtual - 1)}
                    disabled={paginaAtual === 0}
                    className="px-3 py-1.5 border rounded font-bold uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    ← Anterior
                  </button>

                  {Array.from({ length: totalPaginas }, (_, index) => {
                    if (index === 0 || index === totalPaginas - 1 || Math.abs(index - paginaAtual) <= 1) {
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
                      (index === totalPaginas - 2 && paginaAtual < totalPaginas - 3)
                    ) {
                      return <span key={index} className="px-1 text-gray-400">...</span>;
                    }
                    return null;
                  })}

                  <button
                    onClick={() => mudarPagina(paginaAtual + 1)}
                    disabled={paginaAtual >= totalPaginas - 1}
                    className="px-3 py-1.5 border rounded font-bold uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelaUsuarios;