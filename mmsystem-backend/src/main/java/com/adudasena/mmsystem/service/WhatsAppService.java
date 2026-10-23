package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);

    private final boolean enabled;
    private final String evolutionUrl;
    private final String instance;
    private final String apiKey;
    private final RestClient restClient;
    private final WhatsAppAntiSpamService antiSpamService;

    public WhatsAppService(
            @Value("${app.whatsapp.enabled:false}") boolean enabled,
            @Value("${app.whatsapp.evolution-url:}") String evolutionUrl,
            @Value("${app.whatsapp.instance:}") String instance,
            @Value("${app.whatsapp.api-key:}") String apiKey,
            WhatsAppAntiSpamService antiSpamService
    ) {
        this.enabled = enabled;
        this.evolutionUrl = evolutionUrl;
        this.instance = instance;
        this.apiKey = apiKey;
        this.antiSpamService = antiSpamService;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isEnabled() {
        return enabled && evolutionUrl != null && !evolutionUrl.isBlank()
                && instance != null && !instance.isBlank()
                && apiKey != null && !apiKey.isBlank();
    }

    public enum ResultadoNumero { EXISTE, NAO_EXISTE, INDETERMINADO }

    /**
     * Consulta a Evolution API para saber se o número tem WhatsApp.
     * INDETERMINADO quando a integração está desligada ou indisponível (não bloqueia a compra).
     */
    public ResultadoNumero verificarNumero(String telefone) {
        if (!isEnabled()) {
            return ResultadoNumero.INDETERMINADO;
        }
        String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (numero.isBlank()) {
            return ResultadoNumero.NAO_EXISTE;
        }
        if (numero.length() <= 11 && !numero.startsWith("55")) {
            numero = "55" + numero;
        }
        try {
            String url = evolutionUrl.replaceAll("/$", "") + "/chat/whatsappNumbers/" + instance;
            java.util.List<?> resposta = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("apikey", apiKey)
                    .body(Map.of("numbers", java.util.List.of(numero)))
                    .retrieve()
                    .body(java.util.List.class);
            if (resposta == null || resposta.isEmpty()) {
                return ResultadoNumero.INDETERMINADO;
            }
            if (resposta.get(0) instanceof Map<?, ?> mapa) {
                return Boolean.TRUE.equals(mapa.get("exists")) ? ResultadoNumero.EXISTE : ResultadoNumero.NAO_EXISTE;
            }
            return ResultadoNumero.INDETERMINADO;
        } catch (Exception e) {
            logger.warn("Não foi possível verificar o número no WhatsApp: {}", e.getMessage());
            return ResultadoNumero.INDETERMINADO;
        }
    }

    public boolean enviar(WhatsAppMensagemDTO dto) {
        if (!isEnabled()) {
            return false;
        }
        String numero = dto.telefone() == null ? "" : dto.telefone().replaceAll("\\D", "");
        if (numero.isBlank()) {
            logger.warn("WhatsApp não enviado: telefone em branco.");
            return false;
        }
        if (!antiSpamService.podeEnviar(numero)) {
            return false;
        }
        if (numero.length() <= 11 && !numero.startsWith("55")) {
            numero = "55" + numero;
        }
        try {
            String url = evolutionUrl.replaceAll("/$", "") + "/message/sendText/" + instance;
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("apikey", apiKey)
                    .body(Map.of("number", numero, "text", dto.mensagem()))
                    .retrieve()
                    .toBodilessEntity();
            antiSpamService.registrarEnvioAutomatico(dto.telefone());
            return true;
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().is4xxClientError()) {
                logger.warn("WhatsApp recusado (número inválido ou Evolution recusou): status={} body={}",
                        e.getStatusCode().value(), e.getResponseBodyAsString());
            } else {
                logger.warn("Evolution API indisponível: status={} body={}",
                        e.getStatusCode().value(), e.getResponseBodyAsString());
            }
            return false;
        } catch (Exception e) {
            logger.warn("Falha ao enviar WhatsApp via Evolution API: {}", e.getMessage());
            return false;
        }
    }
}
