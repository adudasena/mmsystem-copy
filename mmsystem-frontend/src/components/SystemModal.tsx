'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export type ModalType = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

interface SystemModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm?: () => void;
  onClose: () => void;
}

export default function SystemModal({
  isOpen,
  title,
  message,
  children,
  type = 'info',
  confirmText,
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onClose,
}: SystemModalProps) {
  if (!isOpen) return null;

  const isConfirm = type === 'confirm' || !!onConfirm;
  const isDanger = type === 'danger' || confirmVariant === 'danger';

  const visual = (() => {
    switch (type) {
      case 'success':
        return { Icone: CheckCircle2, chip: 'bg-emerald-100 text-emerald-700' };
      case 'warning':
      case 'confirm':
        return { Icone: AlertTriangle, chip: 'bg-amber-100 text-amber-700' };
      case 'danger':
        return { Icone: XCircle, chip: 'bg-red-100 text-red-700' };
      default:
        return { Icone: Info, chip: 'bg-brand-100 text-brand-700' };
    }
  })();
  const Icone = visual.Icone;

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'Tudo certo';
      case 'warning':
        return 'Aviso do sistema';
      case 'danger':
        return 'Atenção';
      case 'confirm':
        return 'Confirmar ação';
      default:
        return 'Informação';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-brand-950/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-subir"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-2 flex items-start gap-4">
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${visual.chip}`}>
            <Icone className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-display text-lg font-semibold text-brand-900 leading-snug">{getDefaultTitle()}</h3>
            <div className="mt-1.5 text-sm text-gray-600 leading-relaxed">
              {message && <div className="whitespace-pre-line">{message}</div>}
              {children}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition p-1.5 -mr-2 -mt-1 rounded-lg hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex items-center justify-end gap-2.5">
          {isConfirm ? (
            <>
              <button type="button" onClick={onClose} className="mm-btn-secondary">
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={isDanger ? 'mm-btn-danger' : 'mm-btn-primary'}
              >
                {confirmText || 'Confirmar'}
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="mm-btn-primary">
              {confirmText || 'Entendido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
