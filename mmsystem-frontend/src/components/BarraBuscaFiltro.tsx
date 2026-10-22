'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';

export interface OpcaoFiltro {
  label: string;
  value: string;
}

interface BarraBuscaFiltroProps {
  termoBusca: string;
  onBuscaChange: (novoTermo: string) => void;
  placeholder?: string;

  // As props de filtro são opcionais para o caso de telas que usam só busca
  filtroValor?: string;
  onFiltroChange?: (novoFiltro: string) => void;
  opcoesFiltro?: OpcaoFiltro[];
}

export const BarraBuscaFiltro: React.FC<BarraBuscaFiltroProps> = ({
  termoBusca,
  onBuscaChange,
  placeholder = 'Buscar...',
  filtroValor,
  onFiltroChange,
  opcoesFiltro = []
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-sm">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={placeholder}
          value={termoBusca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="w-full h-11 pl-10 pr-4 border border-gray-200 rounded-xl bg-gray-50 text-sm transition focus:bg-white"
        />
      </div>

      {onFiltroChange && opcoesFiltro.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filtroValor}
            onChange={(e) => onFiltroChange(e.target.value)}
            className="h-11 px-3.5 border border-gray-200 rounded-xl bg-gray-50 text-sm transition focus:bg-white"
          >
            {opcoesFiltro.map((opcao) => (
              <option key={opcao.value} value={opcao.value}>
                {opcao.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default BarraBuscaFiltro;
