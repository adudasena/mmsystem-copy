'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, MessageSquare, ChevronDown } from 'lucide-react';
import api from '@/services/api';
import SystemModal, { ModalType } from '@/components/SystemModal';

// ─── Interfaces / Tipagens ──────────────────────────────────────────────────
export interface ProdutoVitrine {
  id: number;
  nome: string;
  descricao?: string;
  preco: number | string;
  categoria: string;
  imagemUrl?: string;
  fotos?: string[] | string;
  quantidadeEstoque?: number;
  coresC?: string[];
  tamanhosC?: string[];
  coresSelecionadas?: string[] | string;
  tamanhosSelecionados?: string[] | string;
  estoqueDetalhado?: Record<string, number> | string;
}

export interface ItemCarrinho {
  produtoId: number;
  nome: string;
  preco: number;
  tamanhoEscolhido: string;
  corEscolhida: string;
  quantidade: number;
  imagemUrl?: string;
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
  mensagem?: string;
  erro?: string;
}

const CATEGORIAS_VITRINE = ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Conjuntos'] as const;

export default function VitrineProdutos() {
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [filtroAberto, setFiltroAberto] = useState<boolean>(false);
  const filtroRef = useRef<HTMLDivElement>(null);

  // Estados do Modal / Sacola
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoVitrine | null>(null);
  const [tamanho, setTamanho] = useState<string>('M');
  const [cor, setCor] = useState<string>('Padrão');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [mostrarCarrinho, setMostrarCarrinho] = useState<boolean>(false);

  // Dados da cliente para a sacola
  const [nomeCliente, setNomeCliente] = useState<string>('');
  const [telefoneCliente, setTelefoneCliente] = useState<string>('');
  const [compraDireta, setCompraDireta] = useState<boolean>(false);
  const [identidade, setIdentidade] = useState<'nova' | 'pendente' | 'confirmada'>('nova');
  const [nomeCadastrado, setNomeCadastrado] = useState<string>('');
  const [editarNome, setEditarNome] = useState<boolean>(false);
  const [consultandoCliente, setConsultandoCliente] = useState<boolean>(false);

  // ─── Efeito de Inicialização Compatível com Paginação ───
  useEffect(() => {
    let montado = true;

    const carregarProdutosInicial = async () => {
      try {
        setLoading(true);
        setErro(null);
        const res = await api.get<PageSpring<ProdutoVitrine> | ProdutoVitrine[]>('/vitrine/produtos?size=50');

        if (montado) {
          if (res.data && Array.isArray((res.data as PageSpring<ProdutoVitrine>).content)) {
            setProdutos((res.data as PageSpring<ProdutoVitrine>).content);
          } else if (Array.isArray(res.data)) {
            setProdutos(res.data);
          } else {
            setProdutos([]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar catálogo da vitrine via Axios:', err);
        if (montado) {
          setErro('Não foi possível carregar o catálogo de produtos.');
          setProdutos([]);
        }
      } finally {
        if (montado) {
          setLoading(false);
        }
      }
    };

    carregarProdutosInicial();

    return () => {
      montado = false;
    };
  }, []);

  useEffect(() => {
    const fecharFora = (evento: MouseEvent) => {
      if (filtroRef.current && !filtroRef.current.contains(evento.target as Node)) {
        setFiltroAberto(false);
      }
    };
    document.addEventListener('mousedown', fecharFora);
    return () => document.removeEventListener('mousedown', fecharFora);
  }, []);

  // Helper para obter a foto do produto
  const obterImagemUrl = (prod: ProdutoVitrine): string => {
    if (prod.imagemUrl) return prod.imagemUrl;
    if (prod.fotos) {
      try {
        const arr = typeof prod.fotos === 'string' ? JSON.parse(prod.fotos) : prod.fotos;
        if (Array.isArray(arr) && arr.length > 0) return arr[0];
      } catch {
        return '';
      }
    }
    return '';
  };

  // ─── Helpers para Variações e Estoque Dinâmico ──────────────────────────────
  const extrairLista = (val: string[] | string | undefined, padrao: string[]): string[] => {
    if (!val) return padrao;
    if (Array.isArray(val)) return val.length > 0 ? val : padrao;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        const arr = val.split(',').map((s) => s.trim()).filter(Boolean);
        if (arr.length > 0) return arr;
      }
    }
    return padrao;
  };

  const extrairEstoqueDetalhado = (val: Record<string, number> | string | undefined): Record<string, number> => {
    if (!val) return {};
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed;
      } catch {
        return {};
      }
    }
    return {};
  };

  const obterEstoqueVariacao = (
    estoqueMap: Record<string, number>,
    corEscolha: string,
    tamanhoEscolha: string,
    fallbackEstoque?: number
  ): number => {
    if (!estoqueMap || Object.keys(estoqueMap).length === 0) {
      return fallbackEstoque !== undefined ? fallbackEstoque : 99;
    }
    const chaveDireta = `${corEscolha}-${tamanhoEscolha}`;
    if (chaveDireta in estoqueMap) return estoqueMap[chaveDireta] || 0;

    const chaveInvertida = `${tamanhoEscolha}-${corEscolha}`;
    if (chaveInvertida in estoqueMap) return estoqueMap[chaveInvertida] || 0;

    if (tamanhoEscolha in estoqueMap) return estoqueMap[tamanhoEscolha] || 0;
    if (corEscolha in estoqueMap) return estoqueMap[corEscolha] || 0;

    return 0;
  };

  const abrirModalProduto = (prod: ProdutoVitrine): void => {
    const tamanhosDisponiveis = extrairLista(prod.tamanhosSelecionados || prod.tamanhosC, ['Único']);
    const coresDisponiveis = extrairLista(prod.coresSelecionadas || prod.coresC, ['Padrão']);
    const estoqueMap = extrairEstoqueDetalhado(prod.estoqueDetalhado);

    let tamInicial = tamanhosDisponiveis[0] || 'Único';
    let corInicial = coresDisponiveis[0] || 'Padrão';
    let achouDisponivel = false;

    for (const t of tamanhosDisponiveis) {
      for (const c of coresDisponiveis) {
        const st = obterEstoqueVariacao(estoqueMap, c, t, prod.quantidadeEstoque);
        if (st > 0) {
          tamInicial = t;
          corInicial = c;
          achouDisponivel = true;
          break;
        }
      }
      if (achouDisponivel) break;
    }

    setProdutoSelecionado(prod);
    setTamanho(tamInicial);
    setCor(corInicial);
    setQuantidade(1);
  };

  // Adicionar à Sacola
  const adicionarAoCarrinho = (): void => {
    if (!produtoSelecionado) return;

    const precoNum = Number(produtoSelecionado.preco || 0);

    const novoItem: ItemCarrinho = {
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      preco: precoNum,
      imagemUrl: obterImagemUrl(produtoSelecionado),
      quantidade: Number(quantidade),
      corEscolhida: cor,
      tamanhoEscolhido: tamanho,
    };

    setCarrinho((prev) => [...prev, novoItem]);
    setProdutoSelecionado(null);
    setQuantidade(1);
    setMostrarCarrinho(true);
  };

  // Remover item do carrinho
  const removerDoCarrinho = (index: number): void => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };

  // Modal do sistema (substituto de alert)
  const [modalSistema, setModalSistema] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: ModalType;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  // Finalizar e Enviar via WhatsApp e Backend Spring Boot
  const finalizarPedido = async (): Promise<void> => {
    if (carrinho.length === 0) return;

    if (!telefoneCliente.trim()) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Dados Obrigatórios',
        message: 'Informe seu WhatsApp para identificarmos seu cadastro.',
      });
      return;
    }

    if (identidade === 'pendente') {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Confirme seu cadastro',
        message: 'Este WhatsApp já está cadastrado. Confirme se é você antes de continuar.',
      });
      return;
    }

    if (!nomeCliente.trim()) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Dados Obrigatórios',
        message: 'Por favor, informe seu nome.',
      });
      return;
    }

    const payload = {
      nomeCliente: nomeCliente.trim(),
      telefoneCliente: telefoneCliente.trim(),
      tipoFluxo: compraDireta ? 'VENDA_DIRETA' : 'CONDICIONAL',
      atualizarNome: identidade === 'confirmada' && editarNome,
      itens: carrinho.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        corEscolhida: item.corEscolhida,
        tamanhoEscolhido: item.tamanhoEscolhido,
      })),
    };

    try {
      await api.post('/vitrine/pedido', payload);

      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setIdentidade('nova');
      setNomeCadastrado('');
      setEditarNome(false);
      setMostrarCarrinho(false);

      setModalSistema({
        isOpen: true,
        type: 'success',
        title: compraDireta ? 'Pedido registrado!' : 'Sacola solicitada!',
        message: compraDireta
          ? 'Sua compra direta foi registrada. A loja confirma o pagamento em seguida.'
          : 'Sua sacola condicional foi registrada. A loja entra em contato pelo WhatsApp informado.',
      });
    } catch (err) {
      const erroAxios = err as AxiosError<ApiErrorResponse>;
      console.error('Erro ao registrar pedido:', erroAxios);
      const mensagemErro = erroAxios.response?.data?.mensagem
        || erroAxios.response?.data?.message
        || erroAxios.response?.data?.erro
        || 'Falha na conexão com o servidor.';
      
      setModalSistema({
        isOpen: true,
        type: 'danger',
        title: 'Atenção ao Finalizar Sacola',
        message: `Erro ao finalizar sacola: ${mensagemErro}`,
      });
    }
  };

  // Filtragem local segura com Array.isArray
  const produtosFiltrados = (Array.isArray(produtos) ? produtos : []).filter((p) => {
    const atendeCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
    return atendeCategoria;
  });

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  const consultarCadastroPorTelefone = async (): Promise<void> => {
    const tel = telefoneCliente.replace(/\D/g, '');
    if (tel.length < 10) {
      setIdentidade('nova');
      setNomeCadastrado('');
      setEditarNome(false);
      return;
    }
    try {
      setConsultandoCliente(true);
      const res = await api.get<{ existe: boolean; nome?: string }>(`/vitrine/cliente?telefone=${encodeURIComponent(tel)}`);
      if (res.data?.existe && res.data.nome) {
        setIdentidade('pendente');
        setNomeCadastrado(res.data.nome);
        setNomeCliente(res.data.nome);
        setEditarNome(false);
      } else {
        setIdentidade('nova');
        setNomeCadastrado('');
        setEditarNome(false);
      }
    } catch {
      setIdentidade('nova');
    } finally {
      setConsultandoCliente(false);
    }
  };

  const rotuloCategoria = categoriaFiltro || 'Todas as categorias';

  return (
    <div className="min-h-screen bg-[#dcded0] text-gray-800 font-sans pb-28 overflow-x-hidden">
      {/* HEADER / BARRA SUPERIOR */}
      <header className="bg-[#2c3e1c] text-white py-3 px-3 sm:px-6 md:px-8 sticky top-0 z-40 shadow-md flex items-center justify-between gap-2 min-h-[56px] overflow-hidden">
        <div className="w-10 shrink-0 hidden md:block" aria-hidden />

        <div className="flex-1 min-w-0 flex items-center justify-center overflow-hidden h-8 md:h-9">
          <img
            src="/escritocompleto1linha.svg"
            alt="Maria Morena"
            className="h-8 md:h-9 w-auto max-w-full object-contain object-center"
          />
        </div>

        <button
          type="button"
          onClick={() => setMostrarCarrinho(true)}
          className="relative shrink-0 bg-white/10 hover:bg-white/15 text-white p-2.5 rounded-full font-bold transition flex items-center justify-center cursor-pointer min-h-11 min-w-11"
          aria-label="Abrir sacola"
        >
          <ShoppingBag className="w-5 h-5" />
          {carrinho.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-white text-[#2c3e1c] text-[10px] font-extrabold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {carrinho.length}
            </span>
          )}
        </button>
      </header>

      {/* TITULO DA VITRINE + FILTROS */}
      <section className="p-4 md:p-6 max-w-7xl mx-auto min-w-0">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#2d3a22]">Vitrine Digital</h1>
          <p className="text-sm text-gray-600 mt-1 leading-snug">
            Escolha as peças para experimentar em casa ou comprar agora.
          </p>
        </div>

        <div className="relative mb-6 z-20" ref={filtroRef}>
          <button
            type="button"
            onClick={() => setFiltroAberto((aberto) => !aberto)}
            className="w-full sm:w-64 bg-white border border-[#c5cbb8] rounded-xl px-4 py-3 text-sm font-medium text-gray-800 shadow-sm flex items-center justify-between gap-2 min-h-11"
            aria-expanded={filtroAberto}
            aria-haspopup="listbox"
          >
            <span className="truncate">{rotuloCategoria}</span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${filtroAberto ? 'rotate-180' : ''}`} />
          </button>
          {filtroAberto && (
            <ul
              role="listbox"
              className="absolute left-0 right-0 sm:right-auto sm:w-64 mt-1.5 bg-white border border-[#c5cbb8] rounded-xl shadow-lg overflow-hidden z-30 max-h-64 overflow-y-auto"
            >
              <li>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef2e4] ${!categoriaFiltro ? 'font-semibold text-[#2c3e1c] bg-[#eef2e4]' : 'text-gray-700'}`}
                  onClick={() => {
                    setCategoriaFiltro('');
                    setFiltroAberto(false);
                  }}
                >
                  Todas as categorias
                </button>
              </li>
              {CATEGORIAS_VITRINE.map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#eef2e4] ${categoriaFiltro === cat ? 'font-semibold text-[#2c3e1c] bg-[#eef2e4]' : 'text-gray-700'}`}
                    onClick={() => {
                      setCategoriaFiltro(cat);
                      setFiltroAberto(false);
                    }}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* FEEDBACKS */}
        {loading && (
          <div className="text-center py-20">
            <p className="text-sm font-semibold text-gray-500 animate-pulse">Carregando peças da vitrine...</p>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-xl text-center text-xs font-bold my-4">
            {erro}
          </div>
        )}

        {/* GRID DE PRODUTOS */}
        {!loading && !erro && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {produtosFiltrados.map((prod) => {
              const src = obterImagemUrl(prod);
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col border border-[#e4e6dc] min-w-0"
                >
                  <div className="relative aspect-[3/4] w-full bg-[#eceee4] overflow-hidden">
                    {src ? (
                      <img
                        src={src}
                        alt={prod.nome}
                        className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                        Sem foto
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-[#2c3e1c]/85 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {prod.categoria || 'Geral'}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug">{prod.nome}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[2rem]">
                      {prod.descricao || 'Peça da coleção Maria Morena.'}
                    </p>

                    <div className="mt-auto pt-3 flex flex-col gap-2">
                      <p className="text-base font-semibold text-[#2c3e1c] tabular-nums">
                        R$ {Number(prod.preco || 0).toFixed(2).replace('.', ',')}
                      </p>
                      <button
                        type="button"
                        onClick={() => abrirModalProduto(prod)}
                        className="w-full bg-[#2c3e1c] hover:bg-[#3d5427] text-white text-xs font-semibold py-2.5 rounded-lg transition cursor-pointer min-h-10"
                      >
                        Escolher
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL DE DETALHES / SELEÇÃO DE GRADE E ESTOQUE DINÂMICO */}
      {produtoSelecionado && (() => {
        const tamanhosDisponiveis = extrairLista(produtoSelecionado.tamanhosSelecionados || produtoSelecionado.tamanhosC, ['Único']);
        const coresDisponiveis = extrairLista(produtoSelecionado.coresSelecionadas || produtoSelecionado.coresC, ['Padrão']);
        const estoqueMap = extrairEstoqueDetalhado(produtoSelecionado.estoqueDetalhado);
        const estoqueDisponivel = obterEstoqueVariacao(estoqueMap, cor, tamanho, produtoSelecionado.quantidadeEstoque);

        // Filtra para exibir apenas tamanhos e cores que possuem saldo em estoque (> 0)
        const tamanhosEmEstoque = tamanhosDisponiveis.filter((tam) =>
          coresDisponiveis.some((c) => obterEstoqueVariacao(estoqueMap, c, tam, produtoSelecionado.quantidadeEstoque) > 0)
        );

        const coresEmEstoque = coresDisponiveis.filter(
          (c) => obterEstoqueVariacao(estoqueMap, c, tamanho, produtoSelecionado.quantidadeEstoque) > 0
        );

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setProdutoSelecionado(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-black font-bold cursor-pointer text-lg"
              >
                ✕
              </button>

              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                {obterImagemUrl(produtoSelecionado) ? (
                  <img
                    src={obterImagemUrl(produtoSelecionado)}
                    alt={produtoSelecionado.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">👗</div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-900">{produtoSelecionado.nome}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-base font-extrabold text-[#2c3e1c]">
                    R$ {Number(produtoSelecionado.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                  {estoqueDisponivel > 0 ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      ✓ {estoqueDisponivel} un. em estoque
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      ✕ Indisponível
                    </span>
                  )}
                </div>
                {produtoSelecionado.descricao && (
                  <p className="text-xs text-gray-600 italic mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed whitespace-pre-wrap">
                    {produtoSelecionado.descricao}
                  </p>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tamanho:</label>
                  <div className="flex flex-wrap gap-2">
                    {(tamanhosEmEstoque.length > 0 ? tamanhosEmEstoque : tamanhosDisponiveis).map((tam) => (
                      <button
                        key={tam}
                        type="button"
                        onClick={() => {
                          setTamanho(tam);
                          if (obterEstoqueVariacao(estoqueMap, cor, tam, produtoSelecionado.quantidadeEstoque) === 0) {
                            const cAlt = coresDisponiveis.find((c) => obterEstoqueVariacao(estoqueMap, c, tam, produtoSelecionado.quantidadeEstoque) > 0);
                            if (cAlt) setCor(cAlt);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${tamanho === tam
                            ? 'bg-[#2c3e1c] text-white border-[#2c3e1c]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        {tam}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cor:</label>
                  <div className="flex flex-wrap gap-2">
                    {(coresEmEstoque.length > 0 ? coresEmEstoque : coresDisponiveis).map((c) => {
                      const st = obterEstoqueVariacao(estoqueMap, c, tamanho, produtoSelecionado.quantidadeEstoque);
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={st === 0}
                          onClick={() => setCor(c)}
                          className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition-all cursor-pointer ${cor === c
                              ? 'bg-[#2c3e1c] text-white border-[#2c3e1c]'
                              : st === 0
                                ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60 cursor-not-allowed'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {c} {st === 0 ? '(Esgotado)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Quantidade:</label>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, estoqueDisponivel)}
                    value={quantidade}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      const limitada = Math.min(Math.max(1, val), Math.max(1, estoqueDisponivel));
                      setQuantidade(limitada);
                    }}
                    disabled={estoqueDisponivel === 0}
                    className="w-24 border border-gray-200 rounded-lg p-2 text-xs text-center font-bold outline-none focus:border-[#2c3e1c] disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={adicionarAoCarrinho}
                disabled={estoqueDisponivel === 0}
                className="w-full bg-[#2c3e1c] hover:bg-[#3d5427] disabled:bg-gray-300 text-white py-2.5 rounded-xl font-bold uppercase text-xs transition shadow cursor-pointer disabled:cursor-not-allowed"
              >
                {estoqueDisponivel > 0 ? 'Adicionar à Sacola de Interesse' : 'Indisponível no Momento'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* DRAWER DA SACOLA */}
      {mostrarCarrinho && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-stretch sm:justify-end">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Fechar sacola"
            onClick={() => setMostrarCarrinho(false)}
          />
          <div className="relative z-10 bg-white w-full sm:max-w-sm sm:h-full max-h-[72vh] sm:max-h-none rounded-t-2xl sm:rounded-none p-5 sm:p-6 flex flex-col shadow-2xl overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h2 className="text-base font-semibold text-[#2c3e1c]">Sacola</h2>
                <button
                  type="button"
                  onClick={() => setMostrarCarrinho(false)}
                  className="text-gray-400 hover:text-black font-bold cursor-pointer text-base min-w-8 min-h-8"
                >
                  ✕
                </button>
              </div>

              {carrinho.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">Nenhum item adicionado ainda.</p>
              ) : (
                <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                  {carrinho.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-[#f7f7f5] p-3 rounded-xl border border-gray-100"
                    >
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-xs text-gray-800">{item.nome}</h4>
                        <p className="text-[11px] text-gray-500">
                          Tam: {item.tamanhoEscolhido} | Cor: {item.corEscolhida} ({item.quantidade}x)
                        </p>
                        <p className="text-xs font-extrabold text-[#2c3e1c] mt-0.5">
                          R$ {(item.preco * item.quantidade).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(index)}
                        className="text-red-500 hover:text-red-700 font-bold text-sm cursor-pointer p-1"
                        title="Remover peça"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {carrinho.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase">Seus Dados para Contato:</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu WhatsApp *</label>
                    <input
                      type="text"
                      value={telefoneCliente}
                      onChange={(e) => {
                        setTelefoneCliente(e.target.value);
                        setIdentidade('nova');
                        setNomeCadastrado('');
                        setEditarNome(false);
                      }}
                      onBlur={() => { void consultarCadastroPorTelefone(); }}
                      placeholder="Ex: (43) 99999-9999"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c]"
                    />
                    {consultandoCliente && (
                      <p className="text-[10px] text-gray-500 mt-1">Consultando cadastro…</p>
                    )}
                  </div>

                  {identidade === 'pendente' && (
                    <div className="bg-[#eef2e4] border border-[#2c3e1c]/20 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-800">
                        Este WhatsApp já está cadastrado. Cliente: <strong>{nomeCadastrado}</strong>. É você?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIdentidade('confirmada')}
                          className="px-3 py-1.5 bg-[#2c3e1c] text-white text-[10px] font-bold uppercase rounded-md cursor-pointer"
                        >
                          Sim, sou eu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTelefoneCliente('');
                            setNomeCliente('');
                            setNomeCadastrado('');
                            setIdentidade('nova');
                            setEditarNome(false);
                          }}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-[10px] font-bold uppercase rounded-md cursor-pointer"
                        >
                          Não é meu número
                        </button>
                      </div>
                    </div>
                  )}

                  {identidade === 'confirmada' && (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      <p className="text-xs text-gray-700">
                        Cadastro confirmado: <strong>{nomeCadastrado}</strong>
                      </p>
                      {!editarNome ? (
                        <button
                          type="button"
                          onClick={() => setEditarNome(true)}
                          className="text-[10px] font-bold text-[#2c3e1c] underline cursor-pointer"
                        >
                          Nome desatualizado?
                        </button>
                      ) : (
                        <p className="text-[10px] text-gray-500">
                          O pedido fica neste WhatsApp. Só o nome do cadastro será atualizado.
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu Nome *</label>
                    <input
                      type="text"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      disabled={identidade === 'pendente' || (identidade === 'confirmada' && !editarNome)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c] disabled:bg-gray-100 disabled:text-gray-600"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-[11px] text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={compraDireta}
                      onChange={(e) => setCompraDireta(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Quero comprar agora, sem prova em casa (venda à vista).</span>
                  </label>
                </div>
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center text-sm font-bold mb-3">
                  <span>Subtotal Estimado:</span>
                  <span className="text-[#2c3e1c]">R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                </div>
                <button
                  type="button"
                  onClick={finalizarPedido}
                  className="w-full bg-[#2c3e1c] hover:bg-[#3d5427] text-white py-3 rounded-xl text-xs font-bold uppercase transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {compraDireta ? 'CONFIRMAR COMPRA DIRETA' : 'SOLICITAR SACOLA CONDICIONAL'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB sacola — visível no celular, não cobre o último card */}
      <button
        type="button"
        onClick={() => setMostrarCarrinho(true)}
        className="sm:hidden fixed bottom-5 right-4 z-30 bg-[#2c3e1c] text-white rounded-full shadow-lg p-3.5 min-h-12 min-w-12 flex items-center justify-center"
        aria-label="Abrir sacola"
      >
        <ShoppingBag className="w-5 h-5" />
        {carrinho.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-[#2c3e1c] text-[10px] font-extrabold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
            {carrinho.length}
          </span>
        )}
      </button>

      {/* Modal Customizado do Sistema */}
      <SystemModal
        isOpen={modalSistema.isOpen}
        title={modalSistema.title}
        message={modalSistema.message}
        type={modalSistema.type}
        onConfirm={modalSistema.onConfirm}
        onClose={() => setModalSistema((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}