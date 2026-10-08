'use client';

import { useEffect, useState } from 'react';

export interface PassoGuia {
  id: string;
  titulo: string;
  texto: string;
}

const PASSOS: PassoGuia[] = [
  {
    id: 'nome',
    titulo: '1. Nome do produto',
    texto: 'Como a cliente vê o card na vitrine. Nome claro, sem emoji. Até 80 caracteres.',
  },
  {
    id: 'categoria',
    titulo: '2. Categoria',
    texto: 'Agrupa as peças na vitrine (Vestidos, Saias…). Uma categoria por tipo de peça. Pode criar uma nova ao lado.',
  },
  {
    id: 'descricao',
    titulo: '3. Descrição',
    texto: 'Tecido, caimento e detalhes. Aparece menor no card. Até 500 caracteres.',
  },
  {
    id: 'preco',
    titulo: '4. Preço',
    texto: 'Valor da peça na vitrine e na venda. Use reais, com centavos se precisar.',
  },
  {
    id: 'variacoes',
    titulo: '5. Tamanhos e cores',
    texto: 'Marque as variações desta peça. Sem isso a grade de estoque não fecha direito.',
  },
  {
    id: 'estoque',
    titulo: '6. Grade de estoque',
    texto: 'Quantidade por cor e tamanho. Zero nessa combinação = esgotado na vitrine.',
  },
  {
    id: 'imagens',
    titulo: '7. Imagens',
    texto: 'Por último: foto nítida, fundo limpo. Até 4 fotos. Se tiver mais de uma, a cliente passa para o lado na vitrine.',
  },
];

interface Props {
  ativo: boolean;
  onPular: () => void;
  onConcluir: () => void;
}

export default function GuiaCadastroProduto({ ativo, onPular, onConcluir }: Props) {
  const [indice, setIndice] = useState(0);
  const [caixa, setCaixa] = useState<DOMRect | null>(null);

  const passo = PASSOS[indice];

  useEffect(() => {
    if (!ativo) return;
    const atualizar = () => {
      const el = document.querySelector(`[data-guia="${passo.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setCaixa(el.getBoundingClientRect());
      } else {
        setCaixa(null);
      }
    };
    const t = window.setTimeout(atualizar, 80);
    window.addEventListener('resize', atualizar);
    window.addEventListener('scroll', atualizar, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', atualizar);
      window.removeEventListener('scroll', atualizar, true);
    };
  }, [ativo, passo.id]);

  if (!ativo || !passo) return null;

  const ultimo = indice === PASSOS.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/45 pointer-events-none" />
      {caixa && (
        <div
          className="fixed z-[61] rounded-xl ring-2 ring-[#2c3e1c] ring-offset-2 pointer-events-none"
          style={{
            top: caixa.top - 6,
            left: caixa.left - 6,
            width: caixa.width + 12,
            height: caixa.height + 12,
          }}
        />
      )}
      <div
        className="fixed z-[62] w-[min(22rem,calc(100%-1.5rem))] bg-white rounded-xl shadow-2xl border border-[#c5cbb8] p-4"
        style={{
          top: caixa ? Math.min(caixa.bottom + 12, window.innerHeight - 200) : 80,
          left: 16,
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2c3e1c] mb-1">
          Cadastro guiado · {indice + 1} de {PASSOS.length}
        </p>
        <h3 className="text-sm font-semibold text-gray-900">{passo.titulo}</h3>
        <p className="text-xs text-gray-600 mt-1 leading-snug">{passo.texto}</p>
        <div className="flex justify-between items-center mt-3 gap-2">
          <button
            type="button"
            onClick={onPular}
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            Pular guia
          </button>
          <div className="flex gap-2">
            {indice > 0 && (
              <button
                type="button"
                onClick={() => setIndice((i) => i - 1)}
                className="px-3 py-1.5 text-[11px] font-bold uppercase border rounded-lg cursor-pointer"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (ultimo) onConcluir();
                else setIndice((i) => i + 1);
              }}
              className="px-3 py-1.5 text-[11px] font-bold uppercase bg-[#2c3e1c] text-white rounded-lg cursor-pointer"
            >
              {ultimo ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
