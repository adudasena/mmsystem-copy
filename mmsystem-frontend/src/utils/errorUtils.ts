import { AxiosError } from 'axios';

interface ApiErrorPayload {
  mensagem?: string;
  erro?: string;
  message?: string;
  error?: string;
}

/**
 * Extrai e sanitiza a mensagem de erro para apresentação ao usuário final.
 * Garante que termos de infraestrutura (Spring Boot, SQL, Hibernate, 500, etc.) não sejam expostos.
 */
export const formatErrorMessage = (error: unknown, mensagemPadrao: string = 'Não foi possível concluir a operação. Verifique as informações e tente novamente.'): string => {
  if (!error) return mensagemPadrao;

  const axiosError = error as AxiosError<ApiErrorPayload>;

  if (axiosError.response?.data) {
    const data = axiosError.response.data;
    const rawMsg = data.mensagem || data.erro || data.message || data.error;

    if (rawMsg && typeof rawMsg === 'string') {
      const msgLimpa = rawMsg.trim();

      // Se contiver nomes de classes ou infraestrutura Java/Spring/SQL, substitui por texto genérico e amigável
      if (
        /spring|hibernate|sql|constraint|nullpointer|exception|500|jdbc|psql|org\./i.test(msgLimpa)
      ) {
        return mensagemPadrao;
      }

      return msgLimpa;
    }
  }

  if (axiosError.message) {
    if (axiosError.message.includes('Network Error')) {
      return 'Falha na conexão com o servidor. Verifique sua internet ou tente novamente em alguns instantes.';
    }
    if (!/spring|hibernate|sql|exception|500/i.test(axiosError.message)) {
      return axiosError.message;
    }
  }

  return mensagemPadrao;
};
