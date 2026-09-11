'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, ChangeEvent, KeyboardEvent, useCallback, useRef } from 'react';
import { AxiosError } from 'axios';
import { Pencil, Trash2, Eye, Camera, Settings, Package, Plus, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import BarraBuscaFiltro from '@/components/BarraBuscaFiltro';
import Paginacao from '@/components/Paginacao';

// ─── Interfaces ───────────────────────────────────────────────────────────
interface Cor {
  nome: string;
  hex: string;
}

interface Produto {
  id?: number;
  nome: string;
  categoria: string;
  descricao: string;
  preco: number | string;
  coresSelecionadas: string[];
  tamanhosSelecionados: string[];
  estoqueDetalhado: Record<string, number>;
  fotos: string[];
  status?: string;
  coresC?: string[];
  tamanhosC?: string[];
}

interface PageSpring<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface ModalDetalhes {
  aberto: boolean;
  dados: Produto | null;
}

interface ModalExcluir {
  aberto: boolean;
  id: number | null;
}

interface ApiErrorResponse {
  erro?: string;
  message?: string;
}

// ─── Constantes e Helpers ──────────────────────────────────────────────────
const TAMANHOS_PADRAO: string[] = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];
const CATEGORIAS_PADRAO: string[] = ['Blusas', 'Vestidos', 'Saias', 'Camisas', 'Calças', 'Shorts'];
const CORES_PADRAO: Cor[] = [
  { nome: 'Vermelho', hex: '#e11d48' }, { nome: 'Amarelo', hex: '#facc15' },
  { nome: 'Laranja', hex: '#ea580c' }, { nome: 'Verde', hex: '#16a34a' },
  { nome: 'Branco', hex: '#ffffff' }, { nome: 'Rosa', hex: '#f472b6' },
  { nome: 'Azul', hex: '#2563eb' }, { nome: 'Preto', hex: '#000000' },
  { nome: 'Roxo', hex: '#9333ea' },
];

const lerStorage = <T,>(chave: string, padrao: T): T => {
  try {
    const salvo = localStorage.getItem(chave);
    return salvo ? (JSON.parse(salvo) as T) : padrao;
  } catch {
    return padrao;
  }
};

const TelaProdutos: React.FC = () => {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [listaProdutos, setListaProdutos] = useState<Produto[]>([]);

  // ─── Estados da Barra de Busca e Filtro ──────────────────────────────────
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');

  // ─── Referência para Auto-Scroll da Tabela ───────────────────────────────
  const tabelaRef = useRef<HTMLDivElement>(null);

  // ─── Estados de Paginação ────────────────────────────────────────────────
  const [paginaAtual, setPaginaAtual] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(0);
  const [totalElementos, setTotalElementos] = useState<number>(0);
  const tamanhoPagina = 5;

  const [mensagemSucesso, setMensagemSucesso] = useState<string>('');
  const [errosValidacao, setErrosValidacao] = useState<string[]>([]);

  const [novoTamanhoTexto, setNovoTamanhoTexto] = useState<string>('');
  const [novaCorNome, setNovaCorNome] = useState<string>('');
  const [novaCorHex, setNovaCorHex] = useState<string>('#000000');
  const [novaCategoriaTexto, setNovaCategoriaTexto] = useState<string>('');

  const [modalEstoqueAberto, setModalEstoqueAberto] = useState<boolean>(false);
  const [modalDetalhes, setModalDetalhes] = useState<ModalDetalhes>({ aberto: false, dados: null });
  const [modalExcluir, setModalExcluir] = useState<ModalExcluir>({ aberto: false, id: null });

  const [produto, setProduto] = useState<Produto>({
    nome: '', categoria: '', descricao: '', preco: '',
    tamanhosSelecionados: [], coresSelecionadas: [], estoqueDetalhado: {},
    fotos: []
  });

  // ─── Opções customizáveis ──────────────────────────────────────────────────
  const [tamanhos, setTamanhos] = useState<string[]>(() => lerStorage<string[]>('mm_tamanhos', TAMANHOS_PADRAO));
  const [categorias, setCategorias] = useState<string[]>(() => lerStorage<string[]>('mm_categorias', CATEGORIAS_PADRAO));
  const [listaCores, setListaCores] = useState<Cor[]>(() => lerStorage<Cor[]>('mm_cores', CORES_PADRAO));

  // ─── Lixeira / Removidos ──────────────────────────────────────────────────
  const [produtosExcluidos, setProdutosExcluidos] = useState<Produto[]>([]);
  const [visualizandoExcluidos, setVisualizandoExcluidos] = useState<boolean>(false);

  // ─── Busca Paginada de Produtos ───────────────────────────────────────────
  const buscarProdutos = useCallback(async (pagina: number = 0): Promise<void> => {
    try {
      const resposta = await api.get<PageSpring<Produto>>(`/produtos?page=${pagina}&size=${tamanhoPagina}`);
      if (resposta.data && Array.isArray(resposta.data.content)) {
        setListaProdutos(resposta.data.content);
        setTotalPaginas(resposta.data.totalPages);
        setTotalElementos(resposta.data.totalElements);
        setPaginaAtual(resposta.data.number);
      } else if (Array.isArray(resposta.data)) {
        setListaProdutos(resposta.data);
      }
    } catch (erro) {
      console.error('Erro ao buscar produtos paginados:', erro);
      setListaProdutos([]);
    }
  }, [tamanhoPagina]);

  // ─── Efeito de Inicialização Segura ───────────────────────────────────────
  useEffect(() => {
    let montado = true;

    const carregarInicial = async () => {
      try {
        const resposta = await api.get<PageSpring<Produto>>(`/produtos?page=0&size=${tamanhoPagina}`);
        if (montado && resposta.data && Array.isArray(resposta.data.content)) {
          setListaProdutos(resposta.data.content);
          setTotalPaginas(resposta.data.totalPages);
          setTotalElementos(resposta.data.totalElements);
          setPaginaAtual(resposta.data.number);
        }
      } catch (erro) {
        console.error('Erro ao carregar inicial de produtos:', erro);
      }
    };

    carregarInicial();

    return () => {
      montado = false;
    };
  }, [tamanhoPagina]);

  // ─── Navegação da Paginação com Auto-Scroll ──────────────────────────────
  const mudarPagina = (novaPagina: number) => {
    if (novaPagina >= 0 && novaPagina < totalPaginas) {
      buscarProdutos(novaPagina);
      tabelaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ─── Adicionar opções customizadas ────────────────────────────────────────
  const adicionarCategoriaCustomizada = (): void => {
    const cat = novaCategoriaTexto.trim();
    if (!cat) return;
    const catFormatada = cat.charAt(0).toUpperCase() + cat.slice(1);
    if (categorias.some(c => c.toLowerCase() === catFormatada.toLowerCase())) {
      setErrosValidacao(['Esta categoria já está cadastrada.']);
      return;
    }
    const novas = [...categorias, catFormatada];
    setCategorias(novas);
    localStorage.setItem('mm_categorias', JSON.stringify(novas));
    setProduto({ ...produto, categoria: catFormatada });
    setNovaCategoriaTexto('');
    setErrosValidacao([]);
  };

  const adicionarTamanhoCustomizado = (): void => {
    const tam = novoTamanhoTexto.trim().toUpperCase();
    if (!tam) return;
    if (tamanhos.includes(tam)) {
      setErrosValidacao(['Este tamanho já está cadastrado.']);
      return;
    }
    const novos = [...tamanhos, tam];
    setTamanhos(novos);
    localStorage.setItem('mm_tamanhos', JSON.stringify(novos));
    setNovoTamanhoTexto('');
    setErrosValidacao([]);
  };

  const adicionarCorCustomizada = (): void => {
    const nome = novaCorNome.trim();
    if (!nome) return;
    if (listaCores.some(c => c.nome.toLowerCase() === nome.toLowerCase())) {
      setErrosValidacao(['Esta cor já está cadastrada.']);
      return;
    }
    const novas = [...listaCores, { nome, hex: novaCorHex }];
    setListaCores(novas);
    localStorage.setItem('mm_cores', JSON.stringify(novas));
    setNovaCorNome('');
    setNovaCorHex('#000000');
    setErrosValidacao([]);
  };

  // ─── Fotos ────────────────────────────────────────────────────────────────
  const handleFotos = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;
    const arquivos = Array.from(e.target.files);
    setErrosValidacao([]);
    arquivos.forEach(arquivo => {
      const reader = new FileReader();
      reader.readAsDataURL(arquivo);
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const fotoResult = reader.result;
          setProduto(prev => {
            if (prev.fotos.includes(fotoResult)) return prev;
            return { ...prev, fotos: [...prev.fotos, fotoResult].slice(0, 4) };
          });
        }
      };
    });
  };

  const removerFoto = (index: number): void => {
    setProduto(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== index) }));
  };

  // ─── Edição ───────────────────────────────────────────────────────────────
  const prepararEdicao = (p: Produto): void => {
    if (p.id) setEditandoId(p.id);
    setErrosValidacao([]);
    setMensagemSucesso('');

    const parseSeguro = <T,>(dado: unknown, tipoDefeito: T): T => {
      if (!dado) return tipoDefeito;
      if (typeof dado === 'object') return dado as T;
      try { return JSON.parse(dado as string) as T; } catch { return tipoDefeito; }
    };

    setProduto({
      nome: p.nome || '',
      categoria: p.categoria || '',
      descricao: p.descricao || '',
      preco: p.preco || '',
      tamanhosSelecionados: parseSeguro<string[]>(p.tamanhosSelecionados, []),
      coresSelecionadas: parseSeguro<string[]>(p.coresSelecionadas, []),
      estoqueDetalhado: parseSeguro<Record<string, number>>(p.estoqueDetalhado, {}),
      fotos: parseSeguro<string[]>(p.fotos, [])
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Estoque ──────────────────────────────────────────────────────────────
  const abrirGestaoEstoque = (): void => {
    if (produto.coresSelecionadas.length === 0 || produto.tamanhosSelecionados.length === 0) {
      setErrosValidacao(['Defina as cores e tamanhos do produto antes de abrir a gestão de estoque.']);
      return;
    }
    setErrosValidacao([]);
    setModalEstoqueAberto(true);
  };

  const atualizarQtdEstoque = (chave: string, valor: string): void => {
    const qtd = Math.max(0, parseInt(valor, 10) || 0);
    setProduto(prev => ({ ...prev, estoqueDetalhado: { ...prev.estoqueDetalhado, [chave]: qtd } }));
  };

  // ─── Validação ────────────────────────────────────────────────────────────
  const validarFormulario = (): string[] => {
    const erros: string[] = [];
    if (!produto.nome.trim()) erros.push('O nome do produto é obrigatório.');
    if (produto.nome.length > 80) erros.push('O nome não pode ter mais de 80 caracteres.');
    if (!produto.categoria) erros.push('Selecione ou cadastre uma categoria.');
    if (produto.descricao.length > 500) erros.push('A descrição não pode passar de 500 caracteres.');

    const precoNum = Number(produto.preco);
    if (!produto.preco || isNaN(precoNum) || precoNum <= 0)
      erros.push('O preço deve ser um valor válido e maior que R$ 0,00.');
    if (precoNum > 99999.99)
      erros.push('O preço máximo é R$ 99.999,99.');

    if (produto.coresSelecionadas.length === 0) erros.push('Selecione pelo menos uma cor.');
    if (produto.tamanhosSelecionados.length === 0) erros.push('Selecione pelo menos um tamanho.');
    if (produto.fotos.length === 0) erros.push('Insira ao menos 1 foto.');

    const totalEstoque = Object.values(produto.estoqueDetalhado).reduce((a, b) => a + b, 0);
    if (totalEstoque === 0) erros.push('O estoque total não pode ser zero. Configure a grade de estoque.');

    return erros;
  };

  // ─── Salvar ───────────────────────────────────────────────────────────────
  const salvarProduto = async (): Promise<void> => {
    const erros = validarFormulario();
    if (erros.length > 0) {
      setErrosValidacao(erros);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setErrosValidacao([]);

      const payload = {
        nome: produto.nome,
        categoria: produto.categoria,
        descricao: produto.descricao,
        preco: Number(produto.preco),
        coresSelecionadas: produto.coresSelecionadas,
        tamanhosSelecionados: produto.tamanhosSelecionados,
        estoqueDetalhado: produto.estoqueDetalhado,
        fotos: produto.fotos,
        status: produto.status || 'DISPONIVEL',
      };

      if (editandoId) {
        await api.put(`/produtos/${editandoId}`, payload);
        setMensagemSucesso('Produto atualizado com sucesso!');
      } else {
        await api.post('/produtos', payload);
        setMensagemSucesso('Produto cadastrado com sucesso!');
      }

      resetarForm();
      buscarProdutos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      const erro = err as AxiosError<ApiErrorResponse>;
      console.error(erro);
      const backendMsg = erro.response?.data?.erro
        || erro.response?.data?.message
        || 'Erro inesperado ao salvar. Verifique o console.';
      setErrosValidacao([backendMsg]);
    }
  };

  // ─── Excluir ──────────────────────────────────────────────────────────────
  const confirmarExclusao = async (): Promise<void> => {
    if (!modalExcluir.id) return;
    try {
      await api.delete(`/produtos/${modalExcluir.id}`);
      setMensagemSucesso('Produto removido com sucesso.');
      setModalExcluir({ aberto: false, id: null });
      buscarProdutos(paginaAtual);
      setTimeout(() => setMensagemSucesso(''), 5000);
    } catch (err) {
      const erro = err as AxiosError<ApiErrorResponse>;
      const msg = erro.response?.data?.message 
        || 'Não foi possível excluir o produto. Verifique se ele possui vínculos ativos.';
      
      setErrosValidacao([msg]);
      setModalExcluir({ aberto: false, id: null });
      setTimeout(() => setErrosValidacao([]), 6000);
    }
  };

  const resetarForm = (): void => {
    setEditandoId(null);
    setErrosValidacao([]);
    setProduto({ nome: '', categoria: '', descricao: '', preco: '', tamanhosSelecionados: [], coresSelecionadas: [], estoqueDetalhado: {}, fotos: [] });
  };

  // ─── Detalhes ─────────────────────────────────────────────────────────────
  const verDetalhes = (p: Produto): void => {
    const parseJSON = <T,>(dado: unknown): T => {
      if (typeof dado === 'object') return dado as T;
      try { return JSON.parse(dado as string) as T; } catch { return {} as T; }
    };
    setModalDetalhes({
      aberto: true,
      dados: {
        ...p,
        estoqueDetalhado: parseJSON<Record<string, number>>(p.estoqueDetalhado),
        coresC: parseJSON<string[]>(p.coresSelecionadas),
        tamanhosC: parseJSON<string[]>(p.tamanhosSelecionados)
      }
    });
  };

  const handlePrecoInput = (e: ChangeEvent<HTMLInputElement>): void => {
    const valor = e.target.value;
    if (valor.length <= 8) setProduto({ ...produto, preco: valor });
  };

  // ─── Toggle visualização de excluídos ─────────────────────────────────────
  const buscarExcluidos = async (): Promise<void> => {
    try {
      const res = await api.get<Produto[]>('/produtos/excluidos');
      setProdutosExcluidos(res.data);
    } catch (erro) {
      console.error("Erro ao carregar produtos excluídos", erro);
    }
  };

  // ─── Filtro Local dos Produtos ────────────────────────────────────────────
  const produtosFiltrados = (visualizandoExcluidos ? produtosExcluidos : listaProdutos).filter((p) => {
    const atendeCategoria = categoriaFiltro === 'TODAS' || p.categoria === categoriaFiltro;
    const termo = termoBusca.toLowerCase();
    const atendeBusca =
      (p.nome || '').toLowerCase().includes(termo) ||
      (p.categoria || '').toLowerCase().includes(termo);
    return atendeCategoria && atendeBusca;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 bg-[#dcded0] min-h-screen font-sans text-gray-800">
      <header className="mb-6">
        <h1 className="text-3xl font-serif font-bold text-[#2d3a22] tracking-wide">
          {editandoId ? 'Editando Produto' : 'Produtos'}
        </h1>
      </header>

      {errosValidacao.length > 0 && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-600 p-4 text-red-900 rounded-sm shadow-sm max-w-5xl">
          <p className="font-bold text-xs uppercase tracking-wide mb-1">Inconsistências encontradas:</p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {errosValidacao.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {mensagemSucesso && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-600 p-3 text-green-900 font-semibold text-xs rounded-sm shadow-sm max-w-5xl">
          ✓ {mensagemSucesso}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 max-w-5xl">
        <div className="lg:col-span-2 space-y-6">

          {/* INFORMAÇÕES BÁSICAS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-[11px] font-bold uppercase mb-2 text-gray-500">Nome do produto (Max 80 caracteres)</label>
            <input
              maxLength={80}
              value={produto.nome}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setProduto({ ...produto, nome: e.target.value })}
              className="w-full border p-2.5 bg-gray-50 outline-none focus:border-gray-400 rounded-lg text-xs"
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase mb-2 text-gray-500">Categoria</label>
                <select
                  value={produto.categoria}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setProduto({ ...produto, categoria: e.target.value })}
                  className="w-full border p-2.5 bg-gray-50 outline-none focus:border-gray-400 rounded-lg text-xs"
                >
                  <option value="">Selecione...</option>
                  {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase mb-2 text-gray-500">Nova Categoria</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Adicionar..."
                    value={novaCategoriaTexto}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNovaCategoriaTexto(e.target.value)}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && adicionarCategoriaCustomizada()}
                    className="w-full text-xs border p-2.5 outline-none bg-gray-50 focus:border-gray-400 rounded-lg"
                  />
                  <button type="button" onClick={adicionarCategoriaCustomizada} className="bg-gray-800 text-white text-xs px-3 font-bold hover:bg-black rounded-lg cursor-pointer">+</button>
                </div>
              </div>
            </div>

            <label className="block text-[11px] font-bold uppercase mt-4 mb-2 text-gray-500">
              Descrição curta ({produto.descricao.length}/500)
            </label>
            <textarea
              maxLength={500}
              value={produto.descricao}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setProduto({ ...produto, descricao: e.target.value })}
              className="w-full border p-2.5 h-28 bg-gray-50 outline-none resize-none focus:border-gray-400 rounded-lg text-xs"
            />
          </div>

          {/* FOTOS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-[11px] font-bold uppercase text-gray-500">Imagens do produto (Mínimo 1, Máximo 4)</label>
              <span className="text-[10px] font-mono text-gray-400">{produto.fotos.length}/4 Carregadas</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {produto.fotos.length < 4 && (
                <label className="min-w-25 h-25 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 rounded-xl transition">
                  <Camera className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-[8px] font-bold uppercase text-gray-500">ADICIONAR</span>
                  <input type="file" accept="image/*" multiple onChange={handleFotos} className="hidden" />
                </label>
              )}
              {produto.fotos.map((foto, i) => (
                <div key={i} className="min-w-25 h-25 border bg-gray-50 rounded-xl flex items-center justify-center relative overflow-hidden group">
                  <img src={foto} className="w-full h-full object-cover" alt="preview" />
                  <button
                    type="button"
                    onClick={() => removerFoto(i)}
                    className="absolute inset-0 bg-black/70 text-white font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] uppercase cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* PREÇO E ESTOQUE */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase mb-2 text-gray-500">Preço (R$)</label>
              <input
                type="number" min="0.01" max="99999.99" step="0.01"
                value={produto.preco}
                onChange={handlePrecoInput}
                placeholder="0.00"
                className="w-full border p-2.5 bg-gray-50 outline-none focus:border-gray-400 font-medium rounded-lg text-xs"
              />
            </div>
            <div onClick={abrirGestaoEstoque} className="cursor-pointer group">
              <label className="block text-[11px] font-bold uppercase mb-2 text-gray-500 group-hover:text-black flex items-center gap-1">
                Grade Estoque <Settings className="w-3.5 h-3.5 text-gray-500" />
              </label>
              <div className="w-full border p-2.5 bg-gray-100 font-bold text-center text-[#4a5d33] rounded-lg group-hover:bg-[#4a5d33] group-hover:text-white transition">
                {Object.values(produto.estoqueDetalhado).reduce((a, b) => a + b, 0)} un
              </div>
            </div>
          </div>

          {/* TAMANHOS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-[11px] font-bold uppercase mb-3 text-center text-gray-500">Tamanhos Disponíveis</label>
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {tamanhos.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => {
                    const novos = produto.tamanhosSelecionados.includes(t)
                      ? produto.tamanhosSelecionados.filter(x => x !== t)
                      : [...produto.tamanhosSelecionados, t];
                    setProduto({ ...produto, tamanhosSelecionados: novos });
                  }}
                  className={`w-9 h-9 text-[10px] font-bold border rounded-lg transition-all cursor-pointer ${produto.tamanhosSelecionados.includes(t) ? 'bg-black text-white border-black' : 'bg-white text-gray-400 hover:border-gray-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-1 border-t pt-3">
              <input
                type="text"
                placeholder="Novo tamanho (ex: G3)"
                value={novoTamanhoTexto}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNovoTamanhoTexto(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && adicionarTamanhoCustomizado()}
                className="flex-1 text-xs border p-2 outline-none uppercase font-mono rounded-lg"
              />
              <button type="button" onClick={adicionarTamanhoCustomizado} className="bg-gray-800 text-white text-xs px-3 font-bold hover:bg-black rounded-lg cursor-pointer">+</button>
            </div>
          </div>

          {/* CORES */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <label className="block text-[11px] font-bold uppercase mb-3 text-gray-500">Cores Disponíveis</label>
            <div className="grid grid-cols-2 gap-y-2.5 max-h-40 overflow-y-auto mb-4 pr-1">
              {listaCores.map(c => (
                <label key={c.nome} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-[#4a5d33]"
                    checked={produto.coresSelecionadas.includes(c.nome)}
                    onChange={() => {
                      const novos = produto.coresSelecionadas.includes(c.nome)
                        ? produto.coresSelecionadas.filter(x => x !== c.nome)
                        : [...produto.coresSelecionadas, c.nome];
                      setProduto({ ...produto, coresSelecionadas: novos });
                    }}
                  />
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ backgroundColor: c.hex }} />
                  <span className="text-[10px] text-gray-600 font-semibold">{c.nome}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-1 border-t pt-3">
              <input
                type="text"
                placeholder="Nome da cor"
                value={novaCorNome}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNovaCorNome(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && adicionarCorCustomizada()}
                className="flex-1 text-xs border p-2 outline-none rounded-lg"
              />
              <input
                type="color"
                value={novaCorHex}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNovaCorHex(e.target.value)}
                className="w-8 h-8 cursor-pointer border p-0.5 rounded-lg"
              />
              <button type="button" onClick={adicionarCorCustomizada} className="bg-gray-800 text-white text-xs px-3 font-bold hover:bg-black rounded-lg cursor-pointer">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTÕES DE AÇÃO */}
      <div className="flex justify-end gap-4 mb-8 max-w-5xl">
        <button onClick={resetarForm} className="px-10 py-2 bg-black text-white text-[11px] font-bold uppercase rounded-sm hover:opacity-80">Cancelar</button>
        <button onClick={salvarProduto} className="px-12 py-2 bg-[#4a5d33] text-white text-[11px] font-bold uppercase rounded-sm shadow-md hover:brightness-110">
          {editandoId ? 'Atualizar Produto' : 'Salvar Produto'}
        </button>
      </div>

      {/* BARRA DE BUSCA E FILTROS PADRONIZADA */}
      <div className="mb-6 max-w-5xl">
        <BarraBuscaFiltro
          termoBusca={termoBusca}
          onBuscaChange={setTermoBusca}
          placeholder="Buscar por nome do produto ou categoria..."
          filtroValor={categoriaFiltro}
          onFiltroChange={setCategoriaFiltro}
          opcoesFiltro={[
            { label: 'Todas as Categorias', value: 'TODAS' },
            ...categorias.map(cat => ({ label: cat, value: cat }))
          ]}
        />
      </div>

      {/* TABELA PRINCIPAL LIMPA */}
      <section ref={tabelaRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden border-t-4 border-[#4a5d33] max-w-5xl">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-gray-500" />
              {visualizandoExcluidos ? "Histórico de Produtos Removidos" : "Produtos Cadastrados"}
            </h3>
            {!visualizandoExcluidos && totalElementos > 0 && (
              <span className="text-[10px] text-gray-500 font-semibold">
                Total: {totalElementos} itens (Pág. {paginaAtual + 1} de {totalPaginas})
              </span>
            )}
          </div>
          
          <button
            onClick={() => {
              if (!visualizandoExcluidos) buscarExcluidos();
              setVisualizandoExcluidos(!visualizandoExcluidos);
            }}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition tracking-wider border cursor-pointer ${
              visualizandoExcluidos 
                ? 'bg-gray-600 hover:bg-gray-700 text-white border-gray-600' 
                : 'bg-[#4a5d33] hover:bg-[#3b4b28] text-white border-[#4a5d33]'
            }`}
          >
            {visualizandoExcluidos ? "Voltar aos Ativos" : "Ver Removidos"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#cbd0c0] text-[10px] font-bold uppercase text-gray-700 border-b border-gray-300">
              <tr>
                <th className="p-3">Foto</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Estoque Total</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs">
              {(() => {
                if (!Array.isArray(produtosFiltrados) || produtosFiltrados.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                        {visualizandoExcluidos ? "Nenhum produto na lixeira." : "Nenhum produto encontrado."}
                      </td>
                    </tr>
                  );
                }

                return produtosFiltrados.map(p => {
                  let totalCalculado = 0;
                  try {
                    const est = typeof p.estoqueDetalhado === 'string' 
                      ? (JSON.parse(p.estoqueDetalhado) as Record<string, number>) 
                      : p.estoqueDetalhado;
                    totalCalculado = Object.values(est || {}).reduce((acc, curr) => acc + Number(curr || 0), 0);
                  } catch {
                    totalCalculado = 0;
                  }

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        {(() => {
                          try {
                            const f = typeof p.fotos === 'string' ? JSON.parse(p.fotos) : p.fotos;
                            const srcFoto = Array.isArray(f) ? f[0] : f;
                            return <img src={srcFoto} className="w-10 h-10 object-cover rounded-lg border" alt="prod" />;
                          } catch {
                            return (
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                <Package className="w-5 h-5" />
                              </div>
                            );
                          }
                        })()}
                      </td>
                      <td className="p-3 font-bold text-gray-800">{p.nome}</td>
                      <td className="p-3 text-gray-600 font-medium">
                        R$ {Number(p.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 font-bold text-[#4a5d33]">{totalCalculado} un</td>
                      <td className="p-3 text-center">
                        {visualizandoExcluidos ? (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 font-bold uppercase rounded-md border border-red-200">
                            Inativo / Removido
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => verDetalhes(p)}
                              className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                              title="Ver Detalhes do Produto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => prepararEdicao(p)}
                              className="p-1 hover:scale-110 transition cursor-pointer text-gray-700 hover:text-black"
                              title="Editar Produto"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setModalExcluir({ aberto: true, id: p.id ?? null })}
                              className="p-1 hover:scale-110 transition cursor-pointer text-gray-600 hover:text-red-700"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINAÇÃO NO RODAPÉ */}
        {!visualizandoExcluidos && (
          <Paginacao
            paginaAtual={paginaAtual}
            totalPaginas={totalPaginas}
            totalElementos={totalElementos}
            onMudarPagina={mudarPagina}
          />
        )}
      </section>

      {/* MODAL: GRADE ESTOQUE */}
      {modalEstoqueAberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-sm border-t-4 border-[#4a5d33] w-full max-w-md max-h-[80vh] flex flex-col p-6 shadow-2xl relative">
            <button onClick={() => setModalEstoqueAberto(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
            <h3 className="font-serif text-lg text-gray-900 border-b pb-2 mb-4">Lançador de Estoque por Variação</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {produto.coresSelecionadas.map(cor =>
                produto.tamanhosSelecionados.map(tam => {
                  const chave = `${cor}-${tam}`;
                  return (
                    <div key={chave} className="flex items-center justify-between p-2 bg-gray-50 border rounded-sm">
                      <span className="text-xs font-semibold text-gray-700">{cor} — Tam {tam}</span>
                      <input
                        type="number" min="0"
                        value={produto.estoqueDetalhado[chave] || 0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => atualizarQtdEstoque(chave, e.target.value)}
                        className="w-20 text-center border p-1 text-xs font-bold bg-white outline-none focus:border-gray-400"
                      />
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-6 pt-4 border-t flex justify-end">
              <button onClick={() => setModalEstoqueAberto(false)} className="px-6 py-2 bg-[#4a5d33] text-white text-xs font-bold uppercase tracking-wider rounded-sm shadow hover:brightness-110 cursor-pointer">
                Confirmar Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUSÃO */}
      {modalExcluir.aberto && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border-t-4 border-red-600 w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-serif text-lg text-red-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Excluir Registro
            </h3>
            <p className="text-xs text-gray-600 mb-6">Tem certeza de que deseja remover este produto? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalExcluir({ aberto: false, id: null })} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold uppercase text-[10px] rounded-lg cursor-pointer">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] rounded-lg cursor-pointer">Confirmar Exclusão</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES */}
      {modalDetalhes.aberto && modalDetalhes.dados && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border-t-4 border-gray-700 w-full max-w-lg max-h-[85vh] flex flex-col p-6 shadow-2xl">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h3 className="font-serif text-xl text-gray-900 uppercase">{modalDetalhes.dados.nome}</h3>
                <span className="text-[9px] font-mono uppercase bg-gray-100 text-gray-500 px-1 border rounded">ID: {modalDetalhes.dados.id}</span>
              </div>
              <button onClick={() => setModalDetalhes({ aberto: false, dados: null })} className="text-gray-400 hover:text-black font-bold text-xl cursor-pointer">×</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 border rounded-lg">
                <p><strong>Categoria:</strong> {modalDetalhes.dados.categoria || '—'}</p>
                <p><strong>Preço:</strong> R$ {Number(modalDetalhes.dados.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="col-span-2"><strong>Cores:</strong> {Array.isArray(modalDetalhes.dados.coresC) ? modalDetalhes.dados.coresC.join(', ') : '—'}</p>
                <p className="col-span-2"><strong>Tamanhos:</strong> {Array.isArray(modalDetalhes.dados.tamanhosC) ? modalDetalhes.dados.tamanhosC.join(', ') : '—'}</p>
              </div>
              {modalDetalhes.dados.descricao && (
                <div className="p-2 border-l-2 border-gray-400 italic bg-gray-50/50 rounded-r">&quot;{modalDetalhes.dados.descricao}&quot;</div>
              )}
              <div>
                <p className="font-bold uppercase text-[10px] text-gray-400 tracking-wider mb-2">Grade de Estoque:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(modalDetalhes.dados.estoqueDetalhado || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b pb-1 font-mono text-[11px]">
                      <span className="text-gray-500">• {key}:</span>
                      <span className="font-bold text-gray-900">{value} un</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t">
              <button onClick={() => setModalDetalhes({ aberto: false, dados: null })} className="w-full py-2 bg-gray-800 hover:bg-black text-white font-bold uppercase text-xs tracking-wider rounded-lg cursor-pointer">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelaProdutos;