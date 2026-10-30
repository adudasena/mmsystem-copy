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
  const [ehProprietaria, setEhProprietaria] = useState<boolean>(false);

  useEffect(() => {
    const perfil = (localStorage.getItem('mm_perfil') || '').toUpperCase();
    setEhProprietaria(perfil === 'ROLE_PROPRIETARIA' || perfil === 'PROPRIETARIA');
  }, []);

  const aplicar = useCallback((dados: WhatsAppConexao) => {
    setConexao((prev) => {
      const conectou = dados.estado === 'CONECTADO';
      return {
        ...dados,
        qrBase64: conectou ? null : (dados.qrBase64 || prev.qrBase64),
      };
    });
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
    const aguardandoLeitura = Boolean(conexao.qrBase64) && conexao.estado !== 'CONECTADO';
    const desconectado = conexao.estado === 'DESCONECTADO' || conexao.estado === 'ERRO';
    const intervaloMs = aguardandoLeitura ? 4000 : desconectado ? 15000 : 20000;
    const id = window.setInterval(() => {
      api.get<WhatsAppConexao>('/whatsapp/conexao')
        .then((res) => aplicar(res.data))
        .catch(() => { /* o aviso da tela já cobre */ });
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [conexao.estado, conexao.qrBase64, aplicar]);

  useEffect(() => {
    if (!ehProprietaria || !conexao.qrBase64 || conexao.estado === 'CONECTADO') return;
    const id = window.setInterval(() => {
      api.post<WhatsAppConexao>('/whatsapp/conexao/qr', {}, { timeout: 30000 })
        .then((res) => aplicar(res.data))
        .catch(() => { /* mantém o QR atual se o refresh falhar */ });
    }, 20000);
    return () => window.clearInterval(id);
  }, [ehProprietaria, conexao.qrBase64, conexao.estado, aplicar]);

  const conectado = conexao.estado === 'CONECTADO';
  const desligado = conexao.estado === 'DESLIGADO';

  return (
    <div className="mm-page">
      <div className="mm-page-inner">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="mm-title">WhatsApp da loja</h1>
            <p className="mm-subtitle">Pareamento com o WhatsApp Web da loja.</p>
          </div>
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
            <div className="mm-alert-ok">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Avisos e confirmações saem deste aparelho enquanto a sessão estiver aberta.</span>
            </div>
          )}

          {ehProprietaria && conectado && (
            <button
              type="button"
              onClick={() => setModalDesconectar(true)}
              disabled={desconectando}
              className="mm-btn-secondary w-full sm:w-auto"
            >
              {desconectando ? 'Desconectando…' : 'Desconectar'}
            </button>
          )}

          {ehProprietaria && !conectado && !desligado && (
            <ol className="text-sm text-gray-600 font-sans list-decimal pl-5 space-y-1.5">
              <li>No celular da loja abra o WhatsApp.</li>
              <li>Toque em <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong>.</li>
              <li>Aponte a câmera para o QR desta tela.</li>
            </ol>
          )}

          {ehProprietaria && conexao.qrBase64 && (
            <div className="flex flex-col items-center gap-3 py-2">
              <img
                src={conexao.qrBase64}
                alt="QR Code para conectar o WhatsApp da loja"
                className="w-64 h-64 bg-white rounded-2xl border border-gray-200 p-2"
              />
              <p className="text-xs text-gray-400 font-sans">O QR fica na tela e se renova sozinho a cada 20 segundos até você ler ou gerar outro.</p>
            </div>
          )}

          {ehProprietaria && !conectado && !desligado && (
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

          {!ehProprietaria && (
            <p className="text-xs text-gray-500 font-sans">
              Só a proprietária pode parear ou desconectar o celular da loja.
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 font-sans flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          Os avisos saem pelo celular da loja. Mantenha o WhatsApp nesse aparelho.
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
          O celular da loja sai do WhatsApp Web. Avisos automáticos param até você parear de novo com o QR.
        </p>
      </SystemModal>
    </div>
  );
};

export default TelaWhatsApp;
