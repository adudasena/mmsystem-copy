/**
 * Formata datas ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm...) para o padrão brasileiro,
 * apenas para exibição. Valores fora do padrão são devolvidos como vieram.
 */
export function formatarData(valor?: string | null): string {
  if (!valor) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(valor);
  if (!m) return valor;
  const [, ano, mes, dia, hora, minuto] = m;
  return hora ? `${dia}/${mes}/${ano} ${hora}:${minuto}` : `${dia}/${mes}/${ano}`;
}

/** Deixa só a primeira letra maiúscula (ex.: ABERTA -> Aberta), para exibição de status. */
export function rotuloStatus(valor?: string | null): string {
  if (!valor) return '—';
  const texto = valor.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
