import api from '@/services/api';

export type ResultadoWhatsApp = 'enviado' | 'fallback' | 'sem-telefone';

/** Abre o chat da cliente COM a loja. Não usa Evolution nem JWT. */
export function abrirWhatsAppLoja(mensagem: string, telefoneLoja?: string): boolean {
  const tel = (telefoneLoja || process.env.NEXT_PUBLIC_WHATSAPP_LOJA || '').replace(/\D/g, '');
  if (!tel) {
    return false;
  }
  const comDdi = tel.startsWith('55') ? tel : `55${tel}`;
  window.open(`https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`, '_blank');
  return true;
}

export function textoConfirmacaoWhatsApp(resultado: ResultadoWhatsApp): string {
  if (resultado === 'enviado') {
    return 'Mensagem enviada no WhatsApp da cliente.';
  }
  if (resultado === 'fallback') {
    return 'O sistema não enviou sozinho. Abriu o WhatsApp Web para você confirmar.';
  }
  return 'Esta cliente não tem WhatsApp cadastrado.';
}

export async function enviarWhatsApp(telefone: string | undefined, mensagem: string): Promise<ResultadoWhatsApp> {
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) {
    return 'sem-telefone';
  }
  try {
    const res = await api.post<{ enviado: boolean }>('/whatsapp/enviar', {
      telefone: tel,
      mensagem,
    });
    if (res.data?.enviado) {
      return 'enviado';
    }
  } catch {
    // fallback abaixo
  }
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`, '_blank');
  return 'fallback';
}
