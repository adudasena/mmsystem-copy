'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import SystemModal from '@/components/SystemModal';

interface WhatsAppConexao {
  configurado: boolean;
  estado: 'DESLIGADO' | 'DESCONECTADO' | 'CONECTANDO' | 'CONECTADO' | 'ERRO' | string;
  mensagem: string;
  qrBase64: string | null;
}

const estadoVazio: WhatsAppConexao = {
  configurado: false,
  estado: 'DESLIGADO',
  mensagem: 'Consultando a Evolution…',
  qrBase64: null,
};

const TelaWhatsApp: React.FC = () => {
  const [conexao, setConexao] = useState<WhatsAppConexao>(estadoVazio);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [gerando, setGerando] = useState<boolean>(false);
  const [desconectando, setDesconectando] = useState<boolean>(false);
  const [modalDesconectar, setModalDesconectar] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  const aplicar = useCallback((dados: WhatsAppConexao) => {
    setConexao(dados);
    setErro('');
    setCarregando(false);
  }, []);

  const falhou = useCallback((mensagem: string) => {
    setErro(mensagem);
    setCarregando(false);
  }, []);

  const consultar = useCallback(() => {
    api.get<WhatsAppConexao>('/whatsapp/conexao')
      .then((res) => aplicar(res.data))
      .catch(() => falhou('Não foi possível consultar o WhatsApp da loja.'));
  }, [aplicar, falhou]);

  const gerarQr = useCallback(() => {
    setGerando(true);
    setErro('');
    api.post<WhatsAppConexao>('/whatsapp/conexao/qr', {}, { timeout: 30000 })
      .then((res) => aplicar(res.data))
      .catch(() => falhou('Não foi possível gerar o QR. Tente de novo.'))
      .finally(() => setGerando(false));
  }, [aplicar, falhou]);

  const desconectar = useCallback(() => {
    setDesconectando(true);
    setErro('');
    api.post<WhatsAppConexao>('/whatsapp/conexao/desconectar')
      .then((res) => aplicar(res.data))
      .catch(() => falhou('Não foi possível desconectar.'))
      .finally(() => setDesconectando(false));
  }, [aplicar, falhou]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  useEffect(() => {
    const conectando = conexao.estado === 'CONECTANDO' || Boolean(conexao.qrBase64);
    const desconectado = conexao.estado === 'DESCONECTADO' || conexao.estado === 'ERRO';
    const intervaloMs = conectando ? 3000 : desconectado ? 15000 : 20000;
    const id = window.setInterval(() => {
      api.get<WhatsAppConexao>('/whatsapp/conexao')
        .then((res) => aplicar(res.data))
        .catch(() => { /* o aviso da tela já cobre */ });
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [conexao.estado, conexao.qrBase64, aplicar]);

  const conectado = conexao.estado === 'CONECTADO';
  const desligado = conexao.estado === 'DESLIGADO';

  return (
    <div className="mm-page">
      <div className="mm-page-inner max-w-3xl">
        <div>
          <h1 className="mm-title">WhatsApp da loja</h1>
          <p className="mm-subtitle">
            Pareamento com o WhatsApp Web pela Evolution. É o mesmo celular da loja — sem gambiarra fora do sistema.
          </p>
        </div>

        {erro && (
          <div className="mm-alert-err">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="mm-card p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={`mm-badge ${
              conectado
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : desligado
                  ? 'bg-gray-50 text-gray-600 border-gray-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              {conectado ? 'Conectado' : desligado ? 'Desligado no servidor' : conexao.estado === 'CONECTANDO' ? 'Aguardando QR' : 'Desconectado'}
            </span>
            <button type="button" onClick={consultar} className="mm-btn-secondary mm-btn-sm" disabled={carregando}>
              <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          <p className="text-sm text-gray-700 font-sans">{conexao.mensagem}</p>

          {conectado && (
            <>
              <div className="mm-alert-ok">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Avisos e confirmações saem deste aparelho enquanto a sessão estiver aberta.</span>
              </div>
              <button
                type="button"
                onClick={() => setModalDesconectar(true)}
                disabled={desconectando}
                className="mm-btn-secondary w-full sm:w-auto"
              >
                {desconectando ? 'Desconectando…' : 'Desconectar'}
              </button>
            </>
          )}

          {!conectado && !desligado && (
            <ol className="text-sm text-gray-600 font-sans list-decimal pl-5 space-y-1.5">
              <li>No celular da loja abra o WhatsApp.</li>
              <li>Toque em <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong>.</li>
              <li>Aponte a câmera para o QR desta tela.</li>
            </ol>
          )}

          {conexao.qrBase64 && (
            <div className="flex flex-col items-center gap-3 py-2">
              <img
                src={conexao.qrBase64}
                alt="QR Code para conectar o WhatsApp da loja"
                className="w-64 h-64 bg-white rounded-2xl border border-gray-200 p-2"
              />
              <p className="text-xs text-gray-400 font-sans">O QR expira em cerca de 30 segundos. Gere de novo se a leitura falhar.</p>
            </div>
          )}

          {!conectado && !desligado && (
            <button
              type="button"
              onClick={gerarQr}
              disabled={gerando}
              className="mm-btn-primary w-full sm:w-auto"
            >
              <Smartphone className="w-4 h-4" />
              {gerando ? 'Gerando QR…' : conexao.qrBase64 ? 'Gerar QR de novo' : 'Mostrar QR para conectar'}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 font-sans flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          A chave da Evolution fica só no backend. Esta tela nunca fala com a API do WhatsApp direto.
        </p>
      </div>

      <SystemModal
        isOpen={modalDesconectar}
        type="confirm"
        title="Desconectar WhatsApp da loja"
        onClose={() => setModalDesconectar(false)}
        onConfirm={desconectar}
        confirmText="Desconectar"
        cancelText="Manter conectado"
        confirmVariant="danger"
      >
        <p className="text-sm text-gray-700">
          Avisos e confirmações deixam de sair até você ler o QR de novo neste painel.
        </p>
      </SystemModal>
    </div>
  );
};

export default TelaWhatsApp;
