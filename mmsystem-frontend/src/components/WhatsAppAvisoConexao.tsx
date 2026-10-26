'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import api from '@/services/api';

interface WhatsAppConexao {
  estado: string;
  mensagem: string;
}

const WhatsAppAvisoConexao = () => {
  const pathname = usePathname();
  const [aviso, setAviso] = useState<string | null>(null);

  const consultar = useCallback(() => {
    api.get<WhatsAppConexao>('/whatsapp/conexao')
      .then((res) => {
        const estado = res.data?.estado;
        if (estado === 'DESCONECTADO' || estado === 'ERRO' || estado === 'CONECTANDO') {
          setAviso(res.data.mensagem || 'WhatsApp da loja desconectado.');
        } else {
          setAviso(null);
        }
      })
      .catch(() => {
        setAviso(null);
      });
  }, []);

  useEffect(() => {
    consultar();
    const id = window.setInterval(consultar, 20000);
    return () => window.clearInterval(id);
  }, [consultar]);

  if (!aviso || pathname === '/whatsapp') {
    return null;
  }

  return (
    <div className="px-4 pt-4 lg:px-8">
      <div className="mm-alert-warn justify-between gap-3 max-w-7xl mx-auto">
        <p className="flex items-start gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-sm">{aviso}</span>
        </p>
        <Link href="/whatsapp" className="mm-btn-secondary mm-btn-sm shrink-0">
          Conectar
        </Link>
      </div>
    </div>
  );
};

export default WhatsAppAvisoConexao;
