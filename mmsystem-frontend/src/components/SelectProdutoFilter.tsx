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

  const obterEstoqueTotal = (p: ProdutoRef): number => {
    const est = p.estoqueDetalhado || p.estoque_detalhado;
    if (est) {
      try {
        const mapa = typeof est === 'string' ? JSON.parse(est) : est;
        if (typeof mapa === 'object' && mapa !== null) {
          return Object.values(mapa).reduce((acc: number, curr: unknown) => acc + Number(curr || 0), 0);
        }
      } catch {
        // fallback
      }
    }
    return p.quantidadeEstoque !== undefined ? p.quantidadeEstoque : 99;
  };

  const produtoAtual = produtos.find(
    (p) => String(p.id) === String(valorSelecionado)
  );

  const produtosFiltrados = produtos.filter((p) => {
    const estTotal = obterEstoqueTotal(p);
    const estaSelecionado = String(p.id) === String(valorSelecionado);
    const atendeEstoque = estTotal > 0 || estaSelecionado;
    const atendeBusca =
      (p.nome || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
      (p.preco ? p.preco.toString() : '').includes(termoBusca);

    return atendeEstoque && atendeBusca;
  });

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
    <div ref={containerRef} className="relative w-full text-sm">
      {/* Botão Gatilho (Dropdown Trigger) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto(!aberto)}
        className={`w-full flex items-center justify-between min-h-11 px-3.5 py-2 border bg-white rounded-xl text-left transition-all cursor-pointer ${
          aberto ? 'border-brand-600 ring-4 ring-brand-600/15' : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
      >
        <span className={`truncate ${produtoAtual ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
          {produtoAtual ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span>{produtoAtual.nome}</span>
              <span className="text-brand-700 font-semibold">— R$ {Number(produtoAtual.preco || 0).toFixed(2)}</span>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] px-1.5 py-0.5 rounded-lg font-semibold">
                ({obterEstoqueTotal(produtoAtual)} un. disp.)
              </span>
            </span>
          ) : (
            placeholder
          )}
        </span>

        <div className="flex items-center gap-1 ml-2 text-gray-400">
          {produtoAtual && (
            <span
              onClick={handleLimparSelecao}
              className="p-0.5 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
              title="Limpar Seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${aberto ? 'rotate-180 text-brand-700' : ''}`} />
        </div>
      </button>

      {/* Painel Flutuante do Dropdown (Filtro + Lista) */}
      {aberto && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-subir">
          {/* Cabeçalho do Filtro / Busca */}
          <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              ref={buscaInputRef}
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Digitar para buscar produto..."
              className="w-full text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
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
                Nenhum produto com estoque disponível.
              </li>
            ) : (
              produtosFiltrados.map((p) => {
                const selecionado = String(p.id) === String(valorSelecionado);
                const estTotal = obterEstoqueTotal(p);
                return (
                  <li
                    key={p.id}
                    onClick={() => handleSelecionar(p.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      selecionado
                        ? 'bg-brand-700/10 text-brand-900 font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{p.nome}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-brand-700 font-semibold">
                          R$ {Number(p.preco || 0).toFixed(2)}
                        </span>
                        <span className={`text-[11px] px-1.5 py-0.2 rounded-lg font-semibold ${
                          estTotal > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          Estoque: {estTotal} un.
                        </span>
                      </div>
                    </div>

                    {selecionado && <Check className="w-4 h-4 text-brand-700 shrink-0" />}
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
