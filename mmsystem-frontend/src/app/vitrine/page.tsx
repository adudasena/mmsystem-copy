'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, ChangeEvent } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, MessageSquare, Camera, Search, Trash2 } from 'lucide-react';
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
  erro?: string;
}

export default function VitrineProdutos() {
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [tamanhoFiltro, setTamanhoFiltro] = useState<string>('');

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

  // ─── Efeito de Inicialização Compatível com Paginação ───
  useEffect(() => {
    let montado = true;

    const carregarProdutosInicial = async () => {
      try {
        setLoading(true);
        setErro(null);
        const res = await api.get<PageSpring<ProdutoVitrine> | ProdutoVitrine[]>('/produtos?size=50');

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

    if (!nomeCliente.trim() || !telefoneCliente.trim()) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Dados Obrigatórios',
        message: 'Por favor, informe seu Nome e WhatsApp para agendar sua sacola condicional.',
      });
      return;
    }

    const payload = {
      nomeCliente: nomeCliente.trim(),
      telefoneCliente: telefoneCliente.trim(),
      itens: carrinho.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        corEscolhida: item.corEscolhida,
        tamanhoEscolhido: item.tamanhoEscolhido,
      })),
    };

    try {
      try {
        await api.post('/vitrine/pedido', payload);
      } catch {
        // Tenta o endpoint alternativo caso ocorra divergência de rota
        await api.post('/pedidos/vitrine', payload);
      }

      const resumo = carrinho
        .map((i) => `• ${i.quantidade}x ${i.nome} (${i.tamanhoEscolhido} / ${i.corEscolhida}) — R$ ${(i.preco * i.quantidade).toFixed(2).replace('.', ',')}`)
        .join('\n');

      const msgWhatsapp = encodeURIComponent(
        `Olá Maria Morena! Meu nome é *${nomeCliente.trim()}*.\n\n` +
        `Gostaria de solicitar as seguintes peças para provar em condicional:\n\n${resumo}\n\n` +
        `*Total Estimado:* R$ ${totalCarrinho.toFixed(2).replace('.', ',')}\n\n` +
        `Por favor, me confirme a disponibilidade para retirada/entrega!`
      );

      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setMostrarCarrinho(false);

      setModalSistema({
        isOpen: true,
        type: 'success',
        title: 'Sacola Solicitada com Sucesso!',
        message: 'Sua solicitação de sacola condicional foi registrada! Redirecionando para o WhatsApp da loja...',
        onConfirm: () => {
          window.open(`https://wa.me/5543996623157?text=${msgWhatsapp}`, '_blank');
        }
      });

      // Redireciona diretamente para o WhatsApp
      window.open(`https://wa.me/5543996623157?text=${msgWhatsapp}`, '_blank');
    } catch (err) {
      const erroAxios = err as AxiosError<ApiErrorResponse>;
      console.error('Erro ao registrar pedido:', erroAxios);
      const mensagemErro = erroAxios.response?.data?.message || erroAxios.response?.data?.erro || 'Falha na conexão com o servidor.';
      
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

  return (
    <div className="min-h-screen bg-[#dcded0] text-gray-800 font-sans pb-12">
      {/* HEADER / BARRA SUPERIOR */}
      <header className="bg-[#2c3e1c] text-white py-3 px-4 md:px-8 sticky top-0 z-40 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src="/escritocompleto1linha.svg"
            alt="Maria Morena Logo"
            className="h-9 w-auto invert brightness-200"
          />
        </div>

        <button
          type="button"
          onClick={() => setMostrarCarrinho(true)}
          className="relative bg-[#3d5427] hover:bg-[#48632e] text-white text-sm px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 shadow cursor-pointer"
        >
          <span>🛒 Sacola Condicional</span>
          {carrinho.length > 0 && (
            <span className="bg-[#dcded0] text-[#2c3e1c] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {carrinho.length}
            </span>
          )}
        </button>
      </header>

      {/* TITULO DA VITRINE + FILTROS */}
      <section className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-[#2c3e1c]">Vitrine Digital</h1>
          <p className="text-xs text-gray-600">Escolha suas peças para experimentar em casa no condicional ou comprar diretamente.</p>
        </div>

        {/* CONTROLES DE FILTRO */}
        <div className="flex gap-3 mb-6">
          <select
            value={categoriaFiltro}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoriaFiltro(e.target.value)}
            className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none"
          >
            <option value="">Todas as Categorias ▼</option>
            <option value="Vestidos">Vestidos</option>
            <option value="Blusas">Blusas</option>
            <option value="Calças">Calças</option>
            <option value="Saias">Saias</option>
            <option value="Conjuntos">Conjuntos</option>
          </select>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {produtosFiltrados.map((prod) => {
              const src = obterImagemUrl(prod);
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between border border-gray-100"
                >
                  <div className="relative aspect-3/4 bg-gray-100 overflow-hidden">
                    {src ? (
                      <img
                        src={src}
                        alt={prod.nome}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                        👗
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-[#2c3e1c]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs uppercase">
                      {prod.categoria || 'Geral'}
                    </span>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-xs md:text-sm text-gray-800 line-clamp-1">{prod.nome}</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                        {prod.descricao || 'Peça exclusiva da coleção.'}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 block uppercase font-semibold">Valor</span>
                        <span className="text-sm md:text-base font-extrabold text-[#2c3e1c]">
                          R$ {Number(prod.preco || 0).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirModalProduto(prod)}
                        className="bg-[#2c3e1c] hover:bg-[#3d5427] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
                      >
                        + Escolher
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
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h2 className="text-base font-bold text-[#2c3e1c]">Sacola Condicional 🛍️</h2>
                <button
                  type="button"
                  onClick={() => setMostrarCarrinho(false)}
                  className="text-gray-400 hover:text-black font-bold cursor-pointer text-base"
                >
                  ✕
                </button>
              </div>

              {carrinho.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-10">Nenhum item adicionado ainda.</p>
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
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu Nome *</label>
                    <input
                      type="text"
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(e.target.value)}
                      placeholder="Ex: Maria da Silva"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu WhatsApp *</label>
                    <input
                      type="text"
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(e.target.value)}
                      placeholder="Ex: (43) 99999-9999"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c]"
                    />
                  </div>
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
                  SOLICITAR SACOLA VIA WHATSAPP
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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