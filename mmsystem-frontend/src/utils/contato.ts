export function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

export function formatarTelefoneInput(valor: string): string {
  const nums = somenteDigitos(valor).slice(0, 11);
  if (!nums) return '';
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 6) {
    return nums.replace(/(\d{2})(\d{0,4})/, '($1) $2').trim();
  }
  if (nums.length <= 10) {
    return nums.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return nums.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

export function formatarNomePessoa(valor: string): string {
  return valor
    .replace(/[^\p{L}\s'.-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

export function validarNomePessoa(valor: string): string | null {
  const nome = valor.trim();
  if (nome.length < 2) {
    return 'Informe o nome completo (mínimo 2 letras).';
  }
  if (nome.length > 40) {
    return 'O nome deve ter no máximo 40 caracteres.';
  }
  if (!/^[\p{L}]+(?:[ '.\\-][\p{L}]+)*$/u.test(nome)) {
    return 'O nome deve ter só letras (sem números).';
  }
  return null;
}

export function validarWhatsApp(valor: string): string | null {
  const nums = somenteDigitos(valor);
  if (nums.length < 10 || nums.length > 11) {
    return 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).';
  }
  return null;
}
