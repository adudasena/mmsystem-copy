'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginacaoProps {
  paginaAtual: number; // 0-indexed
  totalPaginas: number;
  totalElementos: number;
  onMudarPagina: (novaPagina: number) => void;
  tamanhoPagina?: number;
}

const Paginacao: React.FC<PaginacaoProps> = ({
  paginaAtual,
  totalPaginas,
  totalElementos,
  onMudarPagina,
}) => {
  if (totalPaginas <= 1) {
    return null;
  }

  const classeBotao = (ativo: boolean) =>
    `min-w-9 h-9 px-2 flex items-center justify-center rounded-xl text-sm font-semibold transition cursor-pointer ${
      ativo
        ? 'bg-brand-900 text-white shadow-sm'
        : 'text-gray-700 hover:bg-brand-100/70'
    }`;

  // Gera a lista de páginas de forma previsível para manter o layout estável
  const renderBotoesPagina = () => {
    const botoes: React.ReactNode[] = [];
    const maxBotoesVisiveis = 5;

    let startPage = Math.max(0, paginaAtual - Math.floor(maxBotoesVisiveis / 2));
    let endPage = startPage + maxBotoesVisiveis - 1;

    if (endPage >= totalPaginas) {
      endPage = totalPaginas - 1;
      startPage = Math.max(0, endPage - maxBotoesVisiveis + 1);
    }

    if (startPage > 0) {
      botoes.push(
        <button key={0} onClick={() => onMudarPagina(0)} className={classeBotao(paginaAtual === 0)}>
          1
        </button>
      );
      if (startPage > 1) {
        botoes.push(
          <span key="dots-start" className="w-6 text-center text-sm text-gray-400 select-none">
            …
          </span>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      botoes.push(
        <button key={i} onClick={() => onMudarPagina(i)} className={classeBotao(paginaAtual === i)}>
          {i + 1}
        </button>
      );
    }

    if (endPage < totalPaginas - 1) {
      if (endPage < totalPaginas - 2) {
        botoes.push(
          <span key="dots-end" className="w-6 text-center text-sm text-gray-400 select-none">
            …
          </span>
        );
      }
      botoes.push(
        <button
          key={totalPaginas - 1}
          onClick={() => onMudarPagina(totalPaginas - 1)}
          className={classeBotao(paginaAtual === totalPaginas - 1)}
        >
          {totalPaginas}
        </button>
      );
    }

    return botoes;
  };

  const classeSeta =
    'h-9 px-2.5 flex items-center justify-center gap-1 rounded-xl text-sm font-semibold text-gray-700 hover:bg-brand-100/70 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition';

  return (
    <div className="px-4 py-3.5 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600 select-none">
      <span>
        Página <strong className="text-brand-900">{paginaAtual + 1}</strong> de <strong className="text-brand-900">{totalPaginas}</strong>
        <span className="text-gray-400"> · </span>
        {totalElementos} {totalElementos === 1 ? 'item' : 'itens'}
      </span>

      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual === 0}
          className={classeSeta}
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        <div className="flex items-center gap-1">{renderBotoesPagina()}</div>

        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual >= totalPaginas - 1}
          className={classeSeta}
        >
          Próxima <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Paginacao;
