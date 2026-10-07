package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);

    private final boolean enabled;
    private final String evolutionUrl;
    private final String instance;
    private final String apiKey;
    private final RestClient restClient;

    public WhatsAppService(
            @Value("${app.whatsapp.enabled:false}") boolean enabled,
            @Value("${app.whatsapp.evolution-url:}") String evolutionUrl,
            @Value("${app.whatsapp.instance:}") String instance,
            @Value("${app.whatsapp.api-key:}") String apiKey
    ) {
        this.enabled = enabled;
        this.evolutionUrl = evolutionUrl;
        this.instance = instance;
        this.apiKey = apiKey;
        this.restClient = RestClient.create();
    }

    public boolean isEnabled() {
        return enabled && evolutionUrl != null && !evolutionUrl.isBlank()
                && instance != null && !instance.isBlank()
                && apiKey != null && !apiKey.isBlank();
    }

    public boolean enviar(WhatsAppMensagemDTO dto) {
        if (!isEnabled()) {
            return false;
        }
        String numero = dto.telefone().replaceAll("\\D", "");
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
            return true;
        } catch (Exception e) {
            logger.warn("Falha ao enviar WhatsApp via Evolution API: {}", e.getMessage());
            return false;
        }
    }
}
