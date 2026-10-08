'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function CampoAjuda({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto || !botaoRef.current) return;

    const colocar = () => {
      const r = botaoRef.current!.getBoundingClientRect();
      const largura = 256;
      const margem = 8;
      let left = r.left;
      if (left + largura > window.innerWidth - margem) {
        left = Math.max(margem, window.innerWidth - largura - margem);
      }
      let top = r.bottom + 6;
      const alturaEstimada = 120;
      if (top + alturaEstimada > window.innerHeight - margem) {
        top = Math.max(margem, r.top - alturaEstimada - 6);
      }
      setPos({ top, left });
    };

    colocar();
    const fechar = (evento: MouseEvent) => {
      if (botaoRef.current && !botaoRef.current.contains(evento.target as Node)) {
        const alvo = evento.target as HTMLElement;
        if (alvo.closest('[data-mm-ajuda="balao"]')) return;
        setAberto(false);
      }
    };
    window.addEventListener('resize', colocar);
    window.addEventListener('scroll', colocar, true);
    document.addEventListener('mousedown', fechar);
    return () => {
      window.removeEventListener('resize', colocar);
      window.removeEventListener('scroll', colocar, true);
      document.removeEventListener('mousedown', fechar);
    };
  }, [aberto]);

  return (
    <span className="inline-flex items-center shrink-0">
      <button
        ref={botaoRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setAberto((v) => !v);
        }}
        className="w-3.5 h-3.5 rounded-full bg-[#2c3e1c] text-[#dcded0] text-[8px] font-bold leading-none flex items-center justify-center hover:bg-[#3d5427] cursor-pointer"
        aria-label="Ajuda"
      >
        i
      </button>
      {aberto && typeof document !== 'undefined' && createPortal(
        <span
          data-mm-ajuda="balao"
          className="fixed z-[200] w-64 max-w-[calc(100vw-1rem)] bg-white border border-[#c5cbb8] rounded-lg shadow-xl p-2.5 text-[11px] font-normal normal-case tracking-normal text-gray-700 leading-snug"
          style={{ top: pos.top, left: pos.left }}
        >
          {texto}
        </span>,
        document.body
      )}
    </span>
  );
}
