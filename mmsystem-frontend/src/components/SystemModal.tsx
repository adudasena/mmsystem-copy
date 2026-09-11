'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

interface SystemModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function SystemModal({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onClose,
}: SystemModalProps) {
  if (!isOpen) return null;

  const isConfirm = type === 'confirm';

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-300" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-300" />;
      case 'danger':
        return <XCircle className="w-6 h-6 text-rose-300" />;
      case 'confirm':
        return <AlertTriangle className="w-6 h-6 text-amber-300" />;
      default:
        return <Info className="w-6 h-6 text-emerald-300" />;
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Sucesso';
      case 'warning':
        return 'Aviso do Sistema';
      case 'danger':
        return 'Atenção';
      case 'confirm':
        return 'Confirmar Ação';
      default:
        return 'Informação';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-[#f7f8f4] border border-[#2d3a22]/20 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col transform transition-all scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header Bar */}
        <div className="bg-[#2d3a22] text-[#f7f8f4] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1 bg-white/10 rounded-lg flex items-center justify-center">
              {renderIcon()}
            </span>
            <h3 className="font-serif font-bold text-base tracking-wide text-white">
              {getDefaultTitle()}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#dcded0] hover:text-white transition p-1 rounded-md hover:bg-white/10 cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-gray-800 text-sm leading-relaxed font-sans whitespace-pre-line">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="bg-[#e8ebe0] px-5 py-3.5 flex items-center justify-end gap-3 border-t border-gray-300/40">
          {isConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#2d3a22] hover:bg-[#1f2817] rounded-lg transition shadow-xs cursor-pointer uppercase tracking-wider"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-[#2d3a22] hover:bg-[#1f2817] rounded-lg transition shadow-xs cursor-pointer uppercase tracking-wider"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
