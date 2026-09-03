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
    <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      {/* Campo de Busca Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={termoBusca}
          onChange={(e) => onBuscaChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-[#2d3a22]"
        />
      </div>

      {/* Select de Filtro (Renderiza apenas se passadas as opções e a função) */}
      {onFiltroChange && opcoesFiltro.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filtroValor}
            onChange={(e) => onFiltroChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-[#2d3a22]"
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