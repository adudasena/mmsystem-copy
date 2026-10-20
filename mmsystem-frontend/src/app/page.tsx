'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from 'react';
import { DM_Sans } from 'next/font/google';
import { AxiosError } from 'axios';
import { ShoppingBag, MessageSquare, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import api from '@/services/api';
import SystemModal, { ModalType } from '@/components/SystemModal';
import { abrirWhatsAppLoja } from '@/utils/whatsapp';
import { formatarNomePessoa, formatarTelefoneInput, validarNomePessoa, validarWhatsApp } from '@/utils/contato';

const fonteVitrine = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

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

interface CheckoutVitrine {
  tipoFluxo?: string;
  condicional?: { id?: number };
  pedido?: { id?: number };
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
  execute: (id: string) => void;
};


export default function VitrineProdutos() {
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [categoriasVitrine, setCategoriasVitrine] = useState<string[]>([]);
  const [filtroAberto, setFiltroAberto] = useState<boolean>(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  const [indiceFoto, setIndiceFoto] = useState<Record<number, number>>({});
  const [indiceFotoModal, setIndiceFotoModal] = useState<number>(0);

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
  const [finalizando, setFinalizando] = useState<boolean>(false);
  const [telefoneLoja, setTelefoneLoja] = useState<string>('');
  const [telefoneLojaDaApi, setTelefoneLojaDaApi] = useState<boolean>(false);
  const [erroContatoLoja, setErroContatoLoja] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaCarregando, setCaptchaCarregando] = useState<boolean>(false);
  const [captchaErro, setCaptchaErro] = useState<string>('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string>('');

  // ─── Efeito de Inicialização Compatível com Paginação ───
  useEffect(() => {
    let montado = true;

    const carregarProdutosInicial = async () => {
      try {
        setLoading(true);
        setErro(null);
        const [res, resCat, resLoja] = await Promise.all([
          api.get<PageSpring<ProdutoVitrine> | ProdutoVitrine[]>('/vitrine/produtos?size=50'),
          api.get<string[]>('/vitrine/categorias'),
          api.get<{ telefone?: string }>('/vitrine/loja').catch(() => null),
        ]);

        if (montado) {
          if (res.data && Array.isArray((res.data as PageSpring<ProdutoVitrine>).content)) {
            setProdutos((res.data as PageSpring<ProdutoVitrine>).content);
          } else if (Array.isArray(res.data)) {
            setProdutos(res.data);
          } else {
            setProdutos([]);
          }
          setCategoriasVitrine(Array.isArray(resCat.data) ? resCat.data.filter(Boolean) : []);
          const telApi = resLoja?.data?.telefone || '';
          const tel = telApi || process.env.NEXT_PUBLIC_WHATSAPP_LOJA || '';
          setTelefoneLoja(tel);
          setTelefoneLojaDaApi(Boolean(telApi.replace(/\D/g, '')));
          if (!telApi) {
            setErroContatoLoja(resLoja
              ? 'WhatsApp da loja ainda não está cadastrado.'
              : 'Não foi possível obter o WhatsApp da loja.');
          } else {
            setErroContatoLoja('');
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

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && !document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      montado = false;
    };
  }, []);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey || !mostrarCarrinho) {
      return;
    }
    const w = window as Window & { turnstile?: TurnstileApi };
    let cancelado = false;
    const timeoutId = window.setTimeout(() => {
      if (!cancelado && !turnstileWidgetId.current) {
        setCaptchaCarregando(false);
        setCaptchaErro('A verificação demorou para abrir. Tente de novo.');
      }
    }, 8000);

    const opcoesTurnstile = {
      sitekey: siteKey,
      execution: 'execute',
      appearance: 'always',
      retry: 'auto',
      'refresh-expired': 'auto',
      callback: (token: string) => {
        setCaptchaToken(token);
        setCaptchaCarregando(false);
        setCaptchaErro('');
      },
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => {
        setCaptchaToken('');
        setCaptchaCarregando(false);
        setCaptchaErro('Não foi possível validar agora. Verifique a conexão e toque em tentar de novo.');
      },
    };

    const render = () => {
      if (cancelado || !turnstileRef.current || !w.turnstile) return;
      setCaptchaCarregando(false);
      setCaptchaErro('');
      try {
        if (turnstileWidgetId.current) {
          w.turnstile.remove(turnstileWidgetId.current);
        }
      } catch {
        /* ignore */
      }
      turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, opcoesTurnstile);
    };

    if (w.turnstile) {
      render();
    } else {
      const existente = document.querySelector('script[src*="turnstile"]');
      if (existente) {
        existente.addEventListener('load', render);
      }
    }
    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
      if (turnstileWidgetId.current && w.turnstile) {
        try {
          w.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
      }
      turnstileWidgetId.current = '';
    };
  }, [mostrarCarrinho]);

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
  const obterImagens = (prod: ProdutoVitrine): string[] => {
    const lista: string[] = [];
    if (prod.fotos) {
      try {
        const arr = typeof prod.fotos === 'string' ? JSON.parse(prod.fotos) : prod.fotos;
        if (Array.isArray(arr)) {
          arr.forEach((f) => { if (f) lista.push(String(f)); });
        }
      } catch {
        /* ignora JSON inválido */
      }
    }
    if (lista.length === 0 && prod.imagemUrl) lista.push(prod.imagemUrl);
    return lista;
  };

  const obterImagemUrl = (prod: ProdutoVitrine): string => obterImagens(prod)[0] || '';

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
    setIndiceFotoModal(0);
  };

  const quantidadeNaSacola = (produtoId: number, corEscolha: string, tamanhoEscolha: string): number =>
    carrinho
      .filter((item) => item.produtoId === produtoId && item.corEscolhida === corEscolha && item.tamanhoEscolhido === tamanhoEscolha)
      .reduce((soma, item) => soma + item.quantidade, 0);

  const adicionarAoCarrinho = (): void => {
    if (!produtoSelecionado) return;

    const estoqueMap = extrairEstoqueDetalhado(produtoSelecionado.estoqueDetalhado);
    const estoqueDisponivel = obterEstoqueVariacao(estoqueMap, cor, tamanho, produtoSelecionado.quantidadeEstoque);
    const saldoRestante = estoqueDisponivel - quantidadeNaSacola(produtoSelecionado.id, cor, tamanho);
    const qtd = Number(quantidade);

    if (saldoRestante <= 0 || qtd > saldoRestante) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Estoque na sacola',
        message: saldoRestante <= 0
          ? 'Essa variação já está no limite da sacola.'
          : `Só restam ${saldoRestante} unidade(s) desta variação.`,
        confirmText: 'Ok',
      });
      return;
    }

    const precoNum = Number(produtoSelecionado.preco || 0);
    const novoItem: ItemCarrinho = {
      produtoId: produtoSelecionado.id,
      nome: produtoSelecionado.nome,
      preco: precoNum,
      imagemUrl: obterImagemUrl(produtoSelecionado),
      quantidade: qtd,
      corEscolhida: cor,
      tamanhoEscolhido: tamanho,
    };

    setCarrinho((prev) => {
      const idx = prev.findIndex(
        (item) => item.produtoId === novoItem.produtoId
          && item.corEscolhida === novoItem.corEscolhida
          && item.tamanhoEscolhido === novoItem.tamanhoEscolhido
      );
      if (idx >= 0) {
        return prev.map((item, i) => i === idx ? { ...item, quantidade: item.quantidade + qtd } : item);
      }
      return [...prev, novoItem];
    });
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
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const montarMensagemLoja = (idPedido?: number, idCondicional?: number): string => {
    const linhasItens = carrinho
      .map((item) => `- ${item.nome} (${item.corEscolhida}/${item.tamanhoEscolhido}) x${item.quantidade}`)
      .join('\n');
    const telCliente = telefoneCliente.replace(/\D/g, '');
    if (compraDireta && idPedido) {
      return `Olá, Maria Morena! Sou ${nomeCliente.trim()}.\nWhatsApp: ${telCliente}\nCompra direta — Pedido #${idPedido} já está no sistema.\n${linhasItens}`;
    }
    if (idCondicional) {
      return `Olá, Maria Morena! Sou ${nomeCliente.trim()}.\nWhatsApp: ${telCliente}\nSacola condicional #${idCondicional} já está no sistema.\n${linhasItens}`;
    }
    return `Olá, Maria Morena! Sou ${nomeCliente.trim()}.\nWhatsApp: ${telCliente}\nAcabei de finalizar na vitrine.\n${linhasItens}`;
  };

  const executarCaptcha = (): void => {
    const w = window as Window & { turnstile?: TurnstileApi };
    if (!turnstileWidgetId.current || !w.turnstile) {
      setCaptchaErro('A verificação ainda não carregou. Tente de novo em instantes.');
      return;
    }
    setCaptchaErro('');
    setCaptchaCarregando(true);
    setCaptchaToken('');
    try {
      w.turnstile.execute(turnstileWidgetId.current);
    } catch {
      setCaptchaCarregando(false);
      setCaptchaErro('Não foi possível iniciar a verificação. Tente de novo.');
    }
  };

  const reiniciarCaptcha = (): void => {
    setCaptchaToken('');
    setCaptchaErro('');
    setCaptchaCarregando(false);
    const w = window as Window & { turnstile?: TurnstileApi };
    if (turnstileWidgetId.current && w.turnstile) {
      try {
        w.turnstile.reset(turnstileWidgetId.current);
        return;
      } catch {
        /* re-render abaixo */
      }
    }
    if (turnstileRef.current && w.turnstile) {
      try {
        turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          execution: 'execute',
          appearance: 'always',
          retry: 'auto',
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaCarregando(false);
            setCaptchaErro('');
          },
          'error-callback': () => {
            setCaptchaToken('');
            setCaptchaCarregando(false);
            setCaptchaErro('Não foi possível validar agora. Toque em tentar de novo.');
          },
        });
      } catch {
        setCaptchaCarregando(false);
        setCaptchaErro('Não foi possível recarregar a verificação.');
      }
    } else {
      setCaptchaCarregando(false);
      setCaptchaErro('Não foi possível recarregar a verificação.');
    }
  };

  const finalizarPedido = async (): Promise<void> => {
    if (finalizando || carrinho.length === 0) return;

    const erroTel = validarWhatsApp(telefoneCliente);
    if (erroTel) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'WhatsApp inválido',
        message: erroTel,
        confirmText: 'Ok',
      });
      return;
    }

    const erroNome = validarNomePessoa(nomeCliente);
    if (erroNome) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Nome inválido',
        message: erroNome,
        confirmText: 'Ok',
      });
      return;
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (siteKey && (captchaErro || !captchaToken)) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Confirmação',
        message: captchaErro || 'Aguarde a verificação “não sou um robô” antes de finalizar.',
        confirmText: 'Ok',
      });
      return;
    }

    const payload = {
      nomeCliente: nomeCliente.trim(),
      telefoneCliente: telefoneCliente.trim(),
      tipoFluxo: compraDireta ? 'VENDA_DIRETA' : 'CONDICIONAL',
      atualizarNome: false,
      captchaToken: captchaToken || undefined,
      itens: carrinho.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        corEscolhida: item.corEscolhida,
        tamanhoEscolhido: item.tamanhoEscolhido,
      })),
    };

    setFinalizando(true);
    try {
      const res = await api.post<CheckoutVitrine>('/vitrine/pedido', payload);
      const idPedido = res.data?.pedido?.id;
      const idCondicional = res.data?.condicional?.id;
      const idTxt = compraDireta
        ? (idPedido ? ` Pedido #${idPedido} já aparece em Pedidos.` : '')
        : (idCondicional ? ` Sacola #${idCondicional} já aparece em Condicionais.` : '');

      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setMostrarCarrinho(false);
      setCaptchaToken('');
      setFinalizando(false);

      if (!telefoneLojaDaApi) {
        const fallbackTel = telefoneLoja || process.env.NEXT_PUBLIC_WHATSAPP_LOJA || '';
        const podeAbrirWhats = Boolean(fallbackTel.replace(/\D/g, ''));
        setModalSistema({
          isOpen: true,
          type: 'warning',
          title: compraDireta ? 'Pedido salvo' : 'Sacola salva',
          confirmText: podeAbrirWhats ? 'Abrir WhatsApp' : 'Ok',
          message: `Registro feito no sistema.${idTxt} Não achamos o WhatsApp da loja na API.`,
          onConfirm: podeAbrirWhats
            ? () => abrirWhatsAppLoja(montarMensagemLoja(idPedido, idCondicional), fallbackTel)
            : undefined,
        });
        return;
      }

      setModalSistema({
        isOpen: true,
        type: 'success',
        title: compraDireta ? 'Pedido registrado!' : 'Sacola solicitada!',
        confirmText: 'Ok',
        message: `Pronto. A loja já vê o pedido no painel.${idTxt}`,
      });
    } catch (err) {
      const erroAxios = err as AxiosError<ApiErrorResponse>;
      console.error('Erro ao registrar pedido:', erroAxios);
      const mensagemErro = erroAxios.response?.data?.mensagem
        || erroAxios.response?.data?.message
        || erroAxios.response?.data?.erro
        || 'Falha na conexão com o servidor.';
      const estoque = /estoque|saldo/i.test(mensagemErro)
        ? 'Uma das peças não tem mais saldo. Ajuste a sacola e tente de novo.'
        : mensagemErro;

      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Atenção ao Finalizar Sacola',
        message: estoque,
        confirmText: 'Ok',
      });
      setCaptchaToken('');
      const w = window as Window & { turnstile?: { reset: (id: string) => void } };
      if (turnstileWidgetId.current && w.turnstile) {
        try {
          w.turnstile.reset(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
      }
      setFinalizando(false);
    }
  };

  // Filtragem local segura com Array.isArray
  const produtosFiltrados = (Array.isArray(produtos) ? produtos : []).filter((p) => {
    const atendeCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
    return atendeCategoria;
  });

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  const rotuloCategoria = categoriaFiltro || 'Todas as categorias';

  return (
    <div
      suppressHydrationWarning
      className={`vitrine-root min-h-screen bg-[#dcded0] text-gray-800 pb-28 overflow-x-hidden ${fonteVitrine.className}`}
    >
      {/* HEADER / BARRA SUPERIOR */}
      <header className="bg-[#2c3e1c] text-white py-3 px-3 sm:px-5 sticky top-0 z-40 shadow-md grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center min-h-[56px]">
        <div aria-hidden />

        <div className="min-w-0 flex items-center justify-center h-8 md:h-9 px-1">
          <img
            src="/escritocompleto1linha.svg"
            alt="Maria Morena"
            className="h-7 sm:h-8 md:h-9 w-auto max-w-full object-contain object-center"
          />
        </div>

        <button
          type="button"
          onClick={() => setMostrarCarrinho(true)}
          className="relative justify-self-end shrink-0 bg-white/10 hover:bg-white/15 text-white p-2 rounded-full font-bold transition flex items-center justify-center cursor-pointer min-h-11 min-w-11"
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
      <section className="p-4 md:p-6 max-w-7xl mx-auto min-w-0 w-full">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#2d3a22]">Vitrine Digital</h1>
          <p className="text-sm text-gray-600 mt-1 leading-snug max-w-xl">
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
              {categoriasVitrine.map((cat) => (
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
            <p className="text-sm font-semibold text-gray-500 animate-pulse">Buscando as peças da loja</p>
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
              const fotos = obterImagens(prod);
              const iFoto = Math.min(indiceFoto[prod.id] || 0, Math.max(fotos.length - 1, 0));
              const src = fotos[iFoto] || '';
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
                        className="w-full h-full object-cover"
                        loading={iFoto === 0 && produtosFiltrados[0]?.id === prod.id ? 'eager' : 'lazy'}
                        fetchPriority={iFoto === 0 && produtosFiltrados[0]?.id === prod.id ? 'high' : 'low'}
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-medium">
                        Sem foto
                      </div>
                    )}
                    {fotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 cursor-pointer"
                          aria-label="Foto anterior"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndiceFoto((m) => ({ ...m, [prod.id]: (iFoto - 1 + fotos.length) % fotos.length }));
                          }}
                        >
                          <ChevronLeft className="w-4 h-4 text-[#2c3e1c]" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 cursor-pointer"
                          aria-label="Próxima foto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndiceFoto((m) => ({ ...m, [prod.id]: (iFoto + 1) % fotos.length }));
                          }}
                        >
                          <ChevronRight className="w-4 h-4 text-[#2c3e1c]" />
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                          {fotos.map((_, i) => (
                            <span key={i} className={`h-1.5 rounded-full ${i === iFoto ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`} />
                          ))}
                        </div>
                      </>
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
        const saldoRestante = estoqueDisponivel - quantidadeNaSacola(produtoSelecionado.id, cor, tamanho);

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
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                <button
                  type="button"
                  onClick={() => setProdutoSelecionado(null)}
                  className="absolute top-2 right-2 z-20 w-9 h-9 rounded-full bg-white/95 text-[#2c3e1c] shadow-md hover:bg-white font-bold cursor-pointer text-lg leading-none flex items-center justify-center"
                  aria-label="Fechar"
                >
                  ×
                </button>
                {(() => {
                  const fotosModal = obterImagens(produtoSelecionado);
                  const iM = Math.min(indiceFotoModal, Math.max(fotosModal.length - 1, 0));
                  const srcM = fotosModal[iM];
                  if (!srcM) {
                    return <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Sem foto</div>;
                  }
                  return (
                    <>
                      <img src={srcM} alt={produtoSelecionado.nome} className="w-full h-full object-cover" />
                      {fotosModal.length > 1 && (
                        <>
                          <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 cursor-pointer" onClick={() => setIndiceFotoModal((iM - 1 + fotosModal.length) % fotosModal.length)}>
                            <ChevronLeft className="w-5 h-5 text-[#2c3e1c]" />
                          </button>
                          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 rounded-full p-1 cursor-pointer" onClick={() => setIndiceFotoModal((iM + 1) % fotosModal.length)}>
                            <ChevronRight className="w-5 h-5 text-[#2c3e1c]" />
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <h3 className="font-bold text-base text-gray-900">{produtoSelecionado.nome}</h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-base font-extrabold text-[#2c3e1c]">
                    R$ {Number(produtoSelecionado.preco || 0).toFixed(2).replace('.', ',')}
                  </p>
                  {saldoRestante > 0 ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      ✓ {saldoRestante} un. disponíveis
                    </span>
                  ) : (
                    <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      ✕ {estoqueDisponivel <= 0 ? 'Indisponível' : 'Já está no limite da sacola'}
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
                          setQuantidade(1);
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
                          onClick={() => {
                            setCor(c);
                            setQuantidade(1);
                          }}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      disabled={saldoRestante <= 0 || quantidade <= 1}
                      onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-[#2c3e1c] font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center text-sm font-bold tabular-nums">{quantidade}</span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      disabled={saldoRestante <= 0 || quantidade >= saldoRestante}
                      onClick={() => setQuantidade((q) => Math.min(saldoRestante, q + 1))}
                      className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-[#2c3e1c] font-bold flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={adicionarAoCarrinho}
                disabled={saldoRestante <= 0}
                className="w-full bg-[#2c3e1c] hover:bg-[#3d5427] disabled:bg-gray-300 text-white py-2.5 rounded-xl font-bold uppercase text-xs transition shadow cursor-pointer disabled:cursor-not-allowed"
              >
                {saldoRestante <= 0
                  ? (estoqueDisponivel <= 0 ? 'Indisponível' : 'Já está no limite da sacola')
                  : 'Adicionar à Sacola de Interesse'}
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
                  {erroContatoLoja && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{erroContatoLoja}</p>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu WhatsApp *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={15}
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(formatarTelefoneInput(e.target.value))}
                      placeholder="Ex: (43) 99999-9999"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Seu Nome *</label>
                    <input
                      type="text"
                      autoComplete="name"
                      maxLength={40}
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(formatarNomePessoa(e.target.value))}
                      placeholder="Ex: Maria da Silva"
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs outline-none focus:border-[#2c3e1c]"
                    />
                    {nomeCliente.trim().length >= 2 && telefoneCliente.replace(/\D/g, '').length >= 10 && (
                      <p className="text-[10px] text-gray-500 mt-1">Pedido será enviado neste WhatsApp.</p>
                    )}
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
                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                  <div className="mb-3">
                    {captchaCarregando && !captchaErro && (
                      <p className="text-[10px] text-gray-500 text-center mb-2">Validando…</p>
                    )}
                    {captchaErro && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2 text-center">
                        <p className="text-[11px] text-amber-900">{captchaErro}</p>
                        <button
                          type="button"
                          onClick={reiniciarCaptcha}
                          className="mt-1 text-[10px] font-bold uppercase text-[#2c3e1c] underline cursor-pointer"
                        >
                          Tentar de novo
                        </button>
                      </div>
                    )}
                    <div ref={turnstileRef} className={`flex justify-center ${captchaErro ? 'hidden' : ''}`} />
                    {!captchaToken ? (
                      <button
                        type="button"
                        onClick={executarCaptcha}
                        disabled={captchaCarregando}
                        className="mt-2 w-full border border-[#2c3e1c] text-[#2c3e1c] py-2 rounded-lg text-[10px] font-bold uppercase cursor-pointer disabled:opacity-50"
                      >
                        Confirmar que não sou um robô
                      </button>
                    ) : (
                      <p className="mt-2 text-[10px] text-emerald-800 text-center font-semibold">Verificação ok. Pode finalizar.</p>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={finalizarPedido}
                  disabled={finalizando}
                  className="w-full bg-[#2c3e1c] hover:bg-[#3d5427] disabled:bg-gray-400 text-white py-3 rounded-xl text-xs font-bold uppercase transition shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="w-4 h-4" />
                  {finalizando
                    ? 'Enviando pedido…'
                    : (compraDireta ? 'CONFIRMAR COMPRA DIRETA' : 'SOLICITAR SACOLA CONDICIONAL')}
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
        confirmText={modalSistema.confirmText}
        onConfirm={modalSistema.onConfirm}
        onClose={() => setModalSistema((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}