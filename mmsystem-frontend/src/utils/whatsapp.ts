import api from '@/services/api';

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

export async function enviarWhatsApp(telefone: string | undefined, mensagem: string): Promise<boolean> {
  const tel = (telefone || '').replace(/\D/g, '');
  if (!tel) {
    return false;
  }
  try {
    const res = await api.post<{ enviado: boolean }>('/whatsapp/enviar', {
      telefone: tel,
      mensagem,
    });
    if (res.data?.enviado) {
      return true;
    }
  } catch {
    // fallback abaixo
  }
  window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`, '_blank');
  return false;
}
