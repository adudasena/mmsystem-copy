'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from 'react';
import { AxiosError } from 'axios';
import { ShoppingBag, MessageSquare, ChevronLeft, ChevronRight, Minus, Plus, X, Trash2, Check } from 'lucide-react';
import api from '@/services/api';
import SystemModal, { ModalType } from '@/components/SystemModal';
import { abrirWhatsAppLoja } from '@/utils/whatsapp';
import { formatarNomePessoa, formatarTelefoneInput, validarNomePessoa, validarWhatsApp } from '@/utils/contato';

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


/** Traduz o código do Turnstile e registra no console para diagnóstico. */
function mensagemErroTurnstile(codigo?: string): string {
  console.error('Turnstile error-callback, código:', codigo, 'host:', window.location.hostname);
  const c = String(codigo || '');
  if (c.startsWith('110200')) return `Este endereço do site não está autorizado no Turnstile (código ${c}). Avise a loja.`;
  if (c.startsWith('110100') || c.startsWith('110110') || c.startsWith('400020')) return `Chave do Turnstile inválida (código ${c}). Avise a loja.`;
  if (c.startsWith('600')) return `A verificação não passou (código ${c}). Se aparecer a caixa abaixo, clique nela; senão toque em tentar de novo.`;
  return `Não foi possível validar agora${c ? ` (código ${c})` : ''}. Verifique a conexão e toque em tentar de novo.`;
}

export default function VitrineProdutos() {
  const [produtos, setProdutos] = useState<ProdutoVitrine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [categoriasVitrine, setCategoriasVitrine] = useState<string[]>([]);
  const [indiceFoto, setIndiceFoto] = useState<Record<number, number>>({});
  const [indiceFotoModal, setIndiceFotoModal] = useState<number>(0);

  // Estados do Modal / Sacola
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoVitrine | null>(null);
  const [tamanho, setTamanho] = useState<string>('M');
  const [cor, setCor] = useState<string>('Padrão');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const carrinhoRef = useRef<ItemCarrinho[]>([]);
  const sacolaTemItens = carrinho.length > 0;
  useEffect(() => {
    carrinhoRef.current = carrinho;
  }, [carrinho]);
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
    // O container do widget só existe com itens na sacola
    if (!siteKey || !mostrarCarrinho || !sacolaTemItens) {
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
      appearance: 'always',
      retry: 'auto',
      'refresh-expired': 'auto',
      callback: (token: string) => {
        setCaptchaToken(token);
        setCaptchaCarregando(false);
        setCaptchaErro('');
      },
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': (codigo?: string) => {
        setCaptchaToken('');
        setCaptchaCarregando(false);
        setCaptchaErro(mensagemErroTurnstile(codigo));
        return true;
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
  }, [mostrarCarrinho, sacolaTemItens]);

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

  // Estoque atual (da lista carregada da API) para a variação de um item da sacola
  const estoqueDoItem = (item: ItemCarrinho, lista: ProdutoVitrine[] = produtos): number | null => {
    const prod = lista.find((p) => p.id === item.produtoId);
    if (!prod) return null;
    return obterEstoqueVariacao(
      extrairEstoqueDetalhado(prod.estoqueDetalhado),
      item.corEscolhida,
      item.tamanhoEscolhido,
      prod.quantidadeEstoque
    );
  };

  // Aumenta/diminui a quantidade direto na sacola, respeitando o estoque
  const alterarQuantidadeCarrinho = (index: number, delta: number): void => {
    const item = carrinho[index];
    if (!item) return;
    const limite = estoqueDoItem(item);
    const nova = item.quantidade + delta;
    if (nova < 1) return;
    if (limite !== null && nova > limite) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Estoque na sacola',
        message: `Só temos ${limite} unidade(s) desta variação.`,
        confirmText: 'Ok',
      });
      return;
    }
    setCarrinho((prev) => prev.map((it, i) => (i === index ? { ...it, quantidade: nova } : it)));
  };

  // Recarrega o catálogo (estoque real) e ajusta a sacola ao que ainda existe
  const sincronizarEstoqueVitrine = async (avisar: boolean): Promise<void> => {
    try {
      const res = await api.get<PageSpring<ProdutoVitrine> | ProdutoVitrine[]>('/vitrine/produtos?size=50');
      const lista = Array.isArray((res.data as PageSpring<ProdutoVitrine>)?.content)
        ? (res.data as PageSpring<ProdutoVitrine>).content
        : (Array.isArray(res.data) ? (res.data as ProdutoVitrine[]) : null);
      if (!lista) return;
      setProdutos(lista);
      setProdutoSelecionado((atual) => (atual ? (lista.find((p) => p.id === atual.id) ?? atual) : atual));

      let ajustou = false;
      const ajustada: ItemCarrinho[] = [];
      for (const item of carrinhoRef.current) {
        const limite = estoqueDoItem(item, lista);
        if (limite === null || limite <= 0) {
          ajustou = true;
          continue;
        }
        if (item.quantidade > limite) {
          ajustou = true;
          ajustada.push({ ...item, quantidade: limite });
        } else {
          ajustada.push(item);
        }
      }
      if (ajustou) {
        setCarrinho(ajustada);
        if (avisar) {
          setModalSistema({
            isOpen: true,
            type: 'warning',
            title: 'Sacola atualizada',
            message: 'O estoque mudou: ajustamos sua sacola ao que ainda está disponível.',
            confirmText: 'Ok',
          });
        }
      }
    } catch {
      /* mantém o último catálogo conhecido */
    }
  };

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
      // Modo padrão: o desafio roda sozinho ao renderizar; aqui só reiniciamos para tentar de novo.
      w.turnstile.reset(turnstileWidgetId.current);
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
          appearance: 'always',
          retry: 'auto',
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaCarregando(false);
            setCaptchaErro('');
          },
          'error-callback': (codigo?: string) => {
            setCaptchaToken('');
            setCaptchaCarregando(false);
            setCaptchaErro(mensagemErroTurnstile(codigo));
            return true;
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
    if (compraDireta && !siteKey) {
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: 'Compra direta indisponível',
        message: 'A verificação “não sou um robô” não está ativa. Use a sacola condicional ou fale com a loja.',
        confirmText: 'Ok',
      });
      return;
    }
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
      // O estoque mudou no servidor: atualiza a vitrine para refletir o que saiu
      void sincronizarEstoqueVitrine(false);

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

      const whatsNaoEncontrado = /whatsapp n[ãa]o encontrado/i.test(mensagemErro);
      setModalSistema({
        isOpen: true,
        type: 'warning',
        title: whatsNaoEncontrado ? 'WhatsApp não encontrado' : 'Atenção ao Finalizar Sacola',
        message: estoque,
        confirmText: 'Ok',
      });
      if (/estoque|saldo/i.test(mensagemErro)) {
        void sincronizarEstoqueVitrine(false);
      }
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

  // Mantém a vitrine sincronizada com o estoque real (condicionais, devoluções, edições no painel)
  const abrirCarrinho = (): void => {
    setMostrarCarrinho(true);
    void sincronizarEstoqueVitrine(true);
  };

  useEffect(() => {
    const atualizar = () => {
      if (document.visibilityState === 'visible') {
        void sincronizarEstoqueVitrine(true);
      }
    };
    const intervalo = window.setInterval(atualizar, 60000);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', atualizar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtragem local segura com Array.isArray
  const produtosFiltrados = (Array.isArray(produtos) ? produtos : []).filter((p) => {
    const atendeCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
    return atendeCategoria;
  });

  const totalCarrinho = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);

  const totalItensSacola = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  const moeda = (valor: number | string) => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

  return (
    <div suppressHydrationWarning className="vitrine-root min-h-screen text-gray-800 pb-28 overflow-x-hidden">
      {/* HEADER / BARRA SUPERIOR */}
      <header className="bg-brand-900/95 backdrop-blur-md text-white py-2.5 px-3 sm:px-6 sticky top-0 z-40 shadow-md grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center min-h-[60px]">
        <div aria-hidden />

        <div className="min-w-0 flex items-center justify-center px-1">
          <img
            src="/escritocompleto1linha.svg"
            alt="Maria Morena"
            className="w-44 sm:w-52 h-auto object-contain object-center"
          />
        </div>

        <button
          type="button"
          onClick={abrirCarrinho}
          className="relative justify-self-end shrink-0 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition flex items-center justify-center min-h-11 min-w-11"
          aria-label="Abrir sacola"
        >
          <ShoppingBag className="w-5 h-5" />
          {totalItensSacola > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-clay-300 text-brand-950 text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
              {totalItensSacola}
            </span>
          )}
        </button>
      </header>

      <section className="px-4 md:px-6 max-w-7xl mx-auto min-w-0 w-full">
        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl mt-5 md:mt-8 bg-linear-to-br from-brand-800 via-brand-900 to-brand-950 text-white px-6 py-9 sm:px-10 sm:py-12 shadow-lg">
          <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="absolute -left-10 -bottom-24 w-64 h-64 rounded-full bg-clay-400/15 blur-2xl" />
          <div className="relative max-w-xl">
            <p className="text-xs font-semibold tracking-widest uppercase text-clay-200 mb-3">Coleção Maria Morena</p>
            <h1 className="font-display text-4xl sm:text-5xl font-medium leading-[1.05] tracking-tight">Vitrine Digital</h1>
            <p className="text-brand-100/85 mt-4 leading-relaxed text-base sm:text-lg">
              Escolha as peças para experimentar em casa ou comprar agora.
            </p>
          </div>
        </div>

        {/* CATEGORIAS */}
        <div className="sticky top-[60px] z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mt-2 bg-fundo/85 backdrop-blur-md">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categorias">
            {['', ...categoriasVitrine].map((cat) => {
              const ativa = categoriaFiltro === cat;
              return (
                <button
                  key={cat || 'todas'}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => setCategoriaFiltro(cat)}
                  className={`shrink-0 px-4 h-10 rounded-full text-sm font-semibold border transition ${
                    ativa
                      ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  {cat || 'Todas'}
                </button>
              );
            })}
          </div>
        </div>

        {!loading && !erro && (
          <p className="text-sm text-gray-500 mb-4 mt-1">
            {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'peça' : 'peças'}
            {categoriaFiltro ? ` em ${categoriaFiltro}` : ''}
          </p>
        )}

        {/* FEEDBACKS */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-4" aria-busy="true" aria-label="Buscando as peças da loja">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-200/70 animate-pulse">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3.5 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-9 w-full rounded-xl bg-gray-100 mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {erro && (
          <div className="mm-alert-err justify-center my-4">{erro}</div>
        )}

        {!loading && !erro && produtosFiltrados.length === 0 && (
          <div className="text-center py-20 mm-card">
            <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="font-display text-xl text-brand-900">Nenhuma peça por aqui ainda</p>
            <p className="text-sm text-gray-500 mt-1">Tente outra categoria ou volte em breve.</p>
          </div>
        )}

        {/* GRID DE PRODUTOS */}
        {!loading && !erro && produtosFiltrados.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {produtosFiltrados.map((prod) => {
              const fotos = obterImagens(prod);
              const iFoto = Math.min(indiceFoto[prod.id] || 0, Math.max(fotos.length - 1, 0));
              const src = fotos[iFoto] || '';
              return (
                <article
                  key={prod.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col border border-gray-200/70 min-w-0"
                >
                  <div
                    className="relative aspect-[3/4] w-full bg-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => abrirModalProduto(prod)}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={prod.nome}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
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
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-sm rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                          aria-label="Foto anterior"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndiceFoto((m) => ({ ...m, [prod.id]: (iFoto - 1 + fotos.length) % fotos.length }));
                          }}
                        >
                          <ChevronLeft className="w-4 h-4 text-brand-900" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-sm rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                          aria-label="Próxima foto"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIndiceFoto((m) => ({ ...m, [prod.id]: (iFoto + 1) % fotos.length }));
                          }}
                        >
                          <ChevronRight className="w-4 h-4 text-brand-900" />
                        </button>
                        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
                          {fotos.map((_, i) => (
                            <span key={i} className={`h-1.5 rounded-full transition-all ${i === iFoto ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
                          ))}
                        </div>
                      </>
                    )}
                    <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur text-brand-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
                      {prod.categoria || 'Geral'}
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] text-gray-900 line-clamp-2 leading-snug">{prod.nome}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[2rem]">
                      {prod.descricao || 'Peça da coleção Maria Morena.'}
                    </p>

                    <div className="mt-auto pt-3.5 flex flex-col gap-3">
                      <p className="font-display text-xl font-medium text-brand-900 tabular-nums">{moeda(prod.preco)}</p>
                      <button
                        type="button"
                        onClick={() => abrirModalProduto(prod)}
                        className="mm-btn-primary h-10 w-full text-sm"
                      >
                        Escolher
                      </button>
                    </div>
                  </div>
                </article>
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

        const fotosModal = obterImagens(produtoSelecionado);
        const iM = Math.min(indiceFotoModal, Math.max(fotosModal.length - 1, 0));
        const srcM = fotosModal[iM];

        return (
          <div
            className="fixed inset-0 bg-brand-950/55 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-fadeIn"
            onClick={() => setProdutoSelecionado(null)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md md:max-w-3xl shadow-2xl relative max-h-[94vh] overflow-y-auto animate-subir md:grid md:grid-cols-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setProdutoSelecionado(null)}
                className="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/95 text-brand-900 shadow-md hover:bg-white flex items-center justify-center transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-square md:aspect-auto md:min-h-[32rem] bg-gray-100 overflow-hidden relative sm:rounded-none">
                {!srcM ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Sem foto</div>
                ) : (
                  <>
                    <img src={srcM} alt={produtoSelecionado.nome} className="w-full h-full object-cover" />
                    {fotosModal.length > 1 && (
                      <>
                        <button type="button" aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-sm rounded-full p-2 transition" onClick={() => setIndiceFotoModal((iM - 1 + fotosModal.length) % fotosModal.length)}>
                          <ChevronLeft className="w-5 h-5 text-brand-900" />
                        </button>
                        <button type="button" aria-label="Próxima foto" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-sm rounded-full p-2 transition" onClick={() => setIndiceFotoModal((iM + 1) % fotosModal.length)}>
                          <ChevronRight className="w-5 h-5 text-brand-900" />
                        </button>
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                          {fotosModal.map((_, i) => (
                            <span key={i} className={`h-1.5 rounded-full transition-all ${i === iM ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="p-5 sm:p-7 space-y-5">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-clay-600 mb-1">{produtoSelecionado.categoria || 'Geral'}</p>
                  <h3 className="font-display text-2xl font-medium text-brand-900 leading-tight pr-8">{produtoSelecionado.nome}</h3>
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <p className="font-display text-2xl font-medium text-brand-900 tabular-nums">{moeda(produtoSelecionado.preco)}</p>
                    {saldoRestante > 0 ? (
                      <span className="mm-badge bg-emerald-50 text-emerald-700 border-emerald-200">
                        <Check className="w-3 h-3" /> {saldoRestante} {saldoRestante === 1 ? 'disponível' : 'disponíveis'}
                      </span>
                    ) : (
                      <span className="mm-badge bg-rose-50 text-rose-700 border-rose-200">
                        {estoqueDisponivel <= 0 ? 'Indisponível' : 'Limite da sacola'}
                      </span>
                    )}
                  </div>
                  {produtoSelecionado.descricao && (
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">
                      {produtoSelecionado.descricao}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="mm-label">Tamanho</span>
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
                          className={`min-w-11 h-11 px-3.5 rounded-xl border font-semibold text-sm transition-all ${
                            tamanho === tam
                              ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                          }`}
                        >
                          {tam}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="mm-label">Cor</span>
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
                            className={`h-11 px-4 rounded-xl border font-semibold text-sm transition-all ${
                              cor === c
                                ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                                : st === 0
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60 cursor-not-allowed'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                            }`}
                          >
                            {c} {st === 0 ? '(Esgotado)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="mm-label">Quantidade</span>
                    <div className="inline-flex items-center rounded-xl border border-gray-300 bg-white">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={saldoRestante <= 0 || quantidade <= 1}
                        onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                        className="w-11 h-11 text-brand-900 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 rounded-l-xl transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold tabular-nums">{quantidade}</span>
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        disabled={saldoRestante <= 0 || quantidade >= saldoRestante}
                        onClick={() => setQuantidade((q) => Math.min(saldoRestante, q + 1))}
                        className="w-11 h-11 text-brand-900 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-gray-50 rounded-r-xl transition"
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
                  className="mm-btn-primary w-full h-12 text-base"
                >
                  {saldoRestante <= 0
                    ? (estoqueDisponivel <= 0 ? 'Indisponível' : 'Já está no limite da sacola')
                    : 'Adicionar à sacola'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DRAWER DA SACOLA */}
      {mostrarCarrinho && (
        <div className="fixed inset-0 bg-brand-950/55 backdrop-blur-sm z-50 flex items-end sm:items-stretch sm:justify-end animate-fadeIn">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Fechar sacola"
            onClick={() => setMostrarCarrinho(false)}
          />
          <div className="relative z-10 bg-white w-full sm:max-w-md sm:h-full max-h-[88vh] sm:max-h-none rounded-t-3xl sm:rounded-none sm:rounded-l-3xl flex flex-col shadow-2xl animate-subir">
            <div className="flex justify-between items-center px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-display text-2xl font-medium text-brand-900">Sua sacola</h2>
                {carrinho.length > 0 && (
                  <p className="text-xs text-gray-500">{totalItensSacola} {totalItensSacola === 1 ? 'peça' : 'peças'}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMostrarCarrinho(false)}
                className="w-10 h-10 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              {carrinho.length === 0 ? (
                <div className="text-center py-14">
                  <ShoppingBag className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma peça adicionada ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {carrinho.map((item, index) => (
                    <div key={index} className="flex gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.imagemUrl ? (
                          <img src={item.imagemUrl} alt={item.nome} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{item.nome}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Tam. {item.tamanhoEscolhido} · {item.corEscolhida}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Diminuir quantidade"
                            disabled={item.quantidade <= 1}
                            onClick={() => alterarQuantidadeCarrinho(index, -1)}
                            className="w-7 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">{item.quantidade}</span>
                          <button
                            type="button"
                            aria-label="Aumentar quantidade"
                            disabled={(() => { const lim = estoqueDoItem(item); return lim !== null && item.quantidade >= lim; })()}
                            onClick={() => alterarQuantidadeCarrinho(index, 1)}
                            className="w-7 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-brand-900 mt-1.5 tabular-nums">{moeda(item.preco * item.quantidade)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(index)}
                        className="self-start text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition"
                        title="Remover peça"
                        aria-label="Remover peça"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {carrinho.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-brand-900">Seus dados para contato</h3>
                  {erroContatoLoja && (
                    <p className="mm-alert-warn text-xs">{erroContatoLoja}</p>
                  )}
                  <div>
                    <label className="mm-label">Seu WhatsApp *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={15}
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(formatarTelefoneInput(e.target.value))}
                      placeholder="Ex: (43) 99999-9999"
                      className="mm-input"
                    />
                  </div>

                  <div>
                    <label className="mm-label">Seu nome *</label>
                    <input
                      type="text"
                      autoComplete="name"
                      maxLength={40}
                      value={nomeCliente}
                      onChange={(e) => setNomeCliente(formatarNomePessoa(e.target.value))}
                      placeholder="Ex: Maria da Silva"
                      className="mm-input"
                    />
                    {nomeCliente.trim().length >= 2 && telefoneCliente.replace(/\D/g, '').length >= 10 && (
                      <p className="text-xs text-gray-500 mt-1.5">Pedido será enviado neste WhatsApp.</p>
                    )}
                  </div>
                  <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer bg-brand-50 border border-brand-100 rounded-xl p-3.5">
                    <input
                      type="checkbox"
                      checked={compraDireta}
                      onChange={(e) => setCompraDireta(e.target.checked)}
                      className="mt-0.5 w-4 h-4"
                    />
                    <span>Quero comprar agora, sem prova em casa (venda à vista).</span>
                  </label>
                </div>
              )}
            </div>

            {carrinho.length > 0 && (
              <div className="border-t border-gray-100 px-5 sm:px-6 pt-4 pb-5 bg-white">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-sm text-gray-600">Subtotal estimado</span>
                  <span className="font-display text-2xl font-medium text-brand-900 tabular-nums">{moeda(totalCarrinho)}</span>
                </div>
                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
                  <div className="mb-3">
                    {captchaCarregando && !captchaErro && (
                      <p className="text-xs text-gray-500 text-center mb-2">Validando…</p>
                    )}
                    {captchaErro && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 text-center">
                        <p className="text-xs text-amber-900">{captchaErro}</p>
                        <button
                          type="button"
                          onClick={reiniciarCaptcha}
                          className="mt-1 text-xs font-semibold text-brand-900 underline"
                        >
                          Tentar de novo
                        </button>
                      </div>
                    )}
                    {/* Nunca esconder: o Turnstile tenta de novo sozinho e falha (600010) se o iframe estiver oculto */}
                    <div className="flex justify-center">
                      <div
                        className={/^[123]x/.test(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '') ? 'turnstile-sem-faixa-teste' : undefined}
                        style={
                          /^[123]x/.test(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '')
                            ? { height: 65, maxHeight: 65, overflow: 'hidden' }
                            : undefined
                        }
                      >
                        <div ref={turnstileRef} />
                      </div>
                    </div>
                    {!captchaToken ? (
                      <button
                        type="button"
                        onClick={executarCaptcha}
                        disabled={captchaCarregando}
                        className="mm-btn-secondary mm-btn-sm mt-2 w-full"
                      >
                        Confirmar que não sou um robô
                      </button>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-700 text-center font-semibold">Verificação ok. Pode finalizar.</p>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={finalizarPedido}
                  disabled={finalizando}
                  className="mm-btn-primary w-full h-12 text-base"
                >
                  <MessageSquare className="w-4 h-4" />
                  {finalizando
                    ? 'Enviando pedido…'
                    : (compraDireta ? 'Confirmar compra direta' : 'Solicitar sacola condicional')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB sacola: visível no celular, não cobre o último card */}
      <button
        type="button"
        onClick={abrirCarrinho}
        className="sm:hidden fixed bottom-5 right-4 z-30 bg-brand-900 text-white rounded-full shadow-xl p-3.5 min-h-14 min-w-14 flex items-center justify-center active:scale-95 transition"
        aria-label="Abrir sacola"
      >
        <ShoppingBag className="w-5 h-5" />
        {totalItensSacola > 0 && (
          <span className="absolute -top-1 -right-1 bg-clay-300 text-brand-950 text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
            {totalItensSacola}
          </span>
        )}
      </button>

      {/* Modal customizado do sistema */}
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
