'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { abrirWhatsAppCliente, enviarWhatsApp } from '@/utils/whatsapp';

interface ModalWhatsAppMensagemProps {
  isOpen: boolean;
  titulo?: string;
  telefone?: string;
  mensagemInicial: string;
  onClose: () => void;
  onEnviado?: (aviso: string) => void;
  onAviso?: (aviso: string) => void;
}

const ModalWhatsAppMensagem: React.FC<ModalWhatsAppMensagemProps> = ({
  isOpen,
  titulo = 'Mensagem no WhatsApp',
  telefone,
  mensagemInicial,
  onClose,
  onEnviado,
  onAviso,
}) => {
  const [texto, setTexto] = useState(mensagemInicial);
  const [enviando, setEnviando] = useState(false);
  const [falhaApi, setFalhaApi] = useState(false);
  const [erroLocal, setErroLocal] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTexto(mensagemInicial);
      setFalhaApi(false);
      setErroLocal('');
      setEnviando(false);
    }
  }, [isOpen, mensagemInicial]);

  if (!isOpen) return null;

  const enviar = async (): Promise<void> => {
    const tel = (telefone || '').replace(/\D/g, '');
    if (!tel) {
      setErroLocal('Esta cliente não tem WhatsApp cadastrado.');
      return;
    }
    if (!texto.trim()) {
      setErroLocal('Escreva a mensagem antes de enviar.');
      return;
    }
    setEnviando(true);
    setErroLocal('');
    setFalhaApi(false);
    const { resultado, motivo } = await enviarWhatsApp(tel, texto.trim());
    setEnviando(false);
    if (resultado === 'enviado') {
      onEnviado?.('Mensagem enviada no WhatsApp da cliente.');
      onClose();
      return;
    }
    if (resultado === 'sem-telefone') {
      setErroLocal('Esta cliente não tem WhatsApp cadastrado.');
      return;
    }
    setFalhaApi(true);
    const aviso = motivo || 'A Evolution não enviou. Você pode abrir o WhatsApp da cliente pelo wa.me.';
    setErroLocal(aviso);
    onAviso?.(aviso);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-subir"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
            <MessageCircle className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-display text-lg font-semibold text-brand-900 leading-snug">{titulo}</h3>
            <p className="mt-1 text-xs text-gray-500 font-sans">
              Confira o texto, edite se quiser e envie pela Evolution. O wa.me só aparece se a API falhar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition p-1.5 -mr-2 -mt-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          {erroLocal && (
            <div className="mm-alert-err text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{erroLocal}</span>
            </div>
          )}
          {falhaApi && (
            <div className="mm-alert-warn text-xs">
              A Evolution não enviou. Use o botão abaixo só neste caso.
            </div>
          )}
          <label className="mm-label">Prévia da mensagem</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            className="mm-input resize-y min-h-40 font-sans"
          />
        </div>

        <div className="px-6 py-5 flex flex-wrap items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className="mm-btn-secondary">
            Cancelar
          </button>
          {falhaApi && (
            <button
              type="button"
              onClick={() => abrirWhatsAppCliente(telefone, texto.trim())}
              className="mm-btn-secondary"
            >
              Abrir wa.me
            </button>
          )}
          <button type="button" onClick={() => void enviar()} disabled={enviando} className="mm-btn-primary">
            {enviando ? 'Enviando…' : falhaApi ? 'Tentar de novo' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalWhatsAppMensagem;
