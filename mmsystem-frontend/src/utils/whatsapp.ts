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
    return 'O WhatsApp da loja está desconectado. Confira a conexão na aba WhatsApp.';
  }
  return 'Esta cliente não tem WhatsApp cadastrado.';
}

/** wa.me da cliente. Só use se a Evolution tiver falhado. */
export function abrirWhatsAppCliente(telefone: string | undefined, mensagem: string): boolean {
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) return false;
  const comDdi = tel.startsWith('55') ? tel : `55${tel}`;
  window.open(`https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`, '_blank');
  return true;
}

export async function enviarWhatsApp(
  telefone: string | undefined,
  mensagem: string
): Promise<{ resultado: ResultadoWhatsApp; motivo?: string }> {
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) {
    return { resultado: 'sem-telefone' };
  }
  try {
    const res = await api.post<{ enviado: boolean; mensagem?: string }>('/whatsapp/enviar', {
      telefone: tel,
      mensagem,
    }, { timeout: 30000 });
    if (res.data?.enviado) {
      return { resultado: 'enviado' };
    }
    return { resultado: 'fallback', motivo: res.data?.mensagem };
  } catch {
    return { resultado: 'fallback', motivo: 'Não foi possível falar com o servidor.' };
  }
}
