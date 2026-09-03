'use client';

import React from 'react';

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

    // Primeira página + reticências
    if (startPage > 0) {
      botoes.push(
        <button
          key={0}
          onClick={() => onMudarPagina(0)}
          className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer border ${
            paginaAtual === 0
              ? 'bg-[#4a5d33] text-white border-[#4a5d33]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
          }`}
        >
          1
        </button>
      );
      if (startPage > 1) {
        botoes.push(
          <span key="dots-start" className="w-6 text-center text-xs text-gray-400 select-none">
            ...
          </span>
        );
      }
    }

    // Intervalo principal de páginas
    for (let i = startPage; i <= endPage; i++) {
      botoes.push(
        <button
          key={i}
          onClick={() => onMudarPagina(i)}
          className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer border ${
            paginaAtual === i
              ? 'bg-[#4a5d33] text-white border-[#4a5d33]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
          }`}
        >
          {i + 1}
        </button>
      );
    }

    // Última página + reticências
    if (endPage < totalPaginas - 1) {
      if (endPage < totalPaginas - 2) {
        botoes.push(
          <span key="dots-end" className="w-6 text-center text-xs text-gray-400 select-none">
            ...
          </span>
        );
      }
      botoes.push(
        <button
          key={totalPaginas - 1}
          onClick={() => onMudarPagina(totalPaginas - 1)}
          className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-all cursor-pointer border ${
            paginaAtual === totalPaginas - 1
              ? 'bg-[#4a5d33] text-white border-[#4a5d33]'
              : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
          }`}
        >
          {totalPaginas}
        </button>
      );
    }

    return botoes;
  };

  return (
    <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 select-none">
      <span className="font-medium">
        Página <strong>{paginaAtual + 1}</strong> de <strong>{totalPaginas}</strong> (Total: {totalElementos} {totalElementos === 1 ? 'item' : 'itens'})
      </span>

      <div className="flex items-center gap-1.5 min-w-[280px] justify-end">
        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual - 1)}
          disabled={paginaAtual === 0}
          className="px-3 h-8 flex items-center justify-center border border-gray-300 rounded font-bold text-xs uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
        >
          ← Anterior
        </button>

        <div className="flex items-center gap-1">
          {renderBotoesPagina()}
        </div>

        <button
          type="button"
          onClick={() => onMudarPagina(paginaAtual + 1)}
          disabled={paginaAtual >= totalPaginas - 1}
          className="px-3 h-8 flex items-center justify-center border border-gray-300 rounded font-bold text-xs uppercase bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
        >
          Próxima →
        </button>
      </div>
    </div>
  );
};

export default Paginacao;
