'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { ProdutoRef } from '@/app/(admin)/pedidos/page';

interface SelectProdutoFilterProps {
  produtos: ProdutoRef[];
  valorSelecionado: string | number;
  onChange: (valor: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SelectProdutoFilter: React.FC<SelectProdutoFilterProps> = ({
  produtos,
  valorSelecionado,
  onChange,
  placeholder = 'Selecione um produto...',
  disabled = false,
}) => {
  const [aberto, setAberto] = useState<boolean>(false);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buscaInputRef = useRef<HTMLInputElement>(null);

  // Fecha o dropdown ao clicar fora dele
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
    };
  }, []);

  // Foca no input de busca ao abrir
  useEffect(() => {
    if (aberto && buscaInputRef.current) {
      buscaInputRef.current.focus();
    }
  }, [aberto]);

  const produtoAtual = produtos.find(
    (p) => String(p.id) === String(valorSelecionado)
  );

  const produtosFiltrados = produtos.filter((p) =>
    (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
    (p.preco ? p.preco.toString() : '').includes(termoBusca)
  );

  const handleSelecionar = (id: number) => {
    onChange(id);
    setAberto(false);
    setTermoBusca('');
  };

  const handleLimparSelecao = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setTermoBusca('');
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Botão Gatilho (Dropdown Trigger) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto(!aberto)}
        className={`w-full flex items-center justify-between p-2 border bg-white rounded-md text-left transition-all shadow-2xs cursor-pointer ${
          aberto ? 'border-[#4a5d33] ring-1 ring-[#4a5d33]' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      >
        <span className={`truncate ${produtoAtual ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
          {produtoAtual ? (
            <span>
              {produtoAtual.nome} <span className="text-[#4a5d33] font-bold">— R$ {Number(produtoAtual.preco || 0).toFixed(2)}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>

        <div className="flex items-center gap-1 ml-2 text-gray-400">
          {produtoAtual && (
            <span
              onClick={handleLimparSelecao}
              className="p-0.5 hover:text-red-500 rounded transition-colors cursor-pointer"
              title="Limpar Seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aberto ? 'rotate-180 text-[#4a5d33]' : ''}`} />
        </div>
      </button>

      {/* Painel Flutuante do Dropdown (Filtro + Lista) */}
      {aberto && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Cabeçalho do Filtro / Busca */}
          <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={buscaInputRef}
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digitar para buscar produto..."
              className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca('')}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista Scrollável de Opções */}
          <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
            {produtosFiltrados.length === 0 ? (
              <li className="p-3 text-center text-gray-400 italic">
                Nenhum produto encontrado.
              </li>
            ) : (
              produtosFiltrados.map((p) => {
                const selecionado = String(p.id) === String(valorSelecionado);
                return (
                  <li
                    key={p.id}
                    onClick={() => handleSelecionar(p.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      selecionado
                        ? 'bg-[#4a5d33]/10 text-[#2d3a22] font-bold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{p.nome}</span>
                      <span className="text-[11px] text-[#4a5d33] font-semibold">
                        R$ {Number(p.preco || 0).toFixed(2)}
                      </span>
                    </div>

                    {selecionado && <Check className="w-4 h-4 text-[#4a5d33] shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SelectProdutoFilter;
