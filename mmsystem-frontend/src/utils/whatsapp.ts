import api from '@/services/api';

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
