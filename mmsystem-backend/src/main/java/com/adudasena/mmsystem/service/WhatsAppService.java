package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.WhatsAppConexaoDTO;
import com.adudasena.mmsystem.dto.WhatsAppEnvioResultadoDTO;
import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class WhatsAppService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppService.class);

    private final boolean enabled;
    private final String evolutionUrl;
    private final String instance;
    private final String apiKey;
    private final RestClient restClient;
    private final RestClient restClientQr;
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

        SimpleClientHttpRequestFactory qrFactory = new SimpleClientHttpRequestFactory();
        qrFactory.setConnectTimeout(Duration.ofSeconds(5));
        qrFactory.setReadTimeout(Duration.ofSeconds(25));
        this.restClientQr = RestClient.builder().requestFactory(qrFactory).build();
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
        String numero = numeroEvolution(telefone);
        if (numero.isBlank()) {
            return ResultadoNumero.NAO_EXISTE;
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
        return enviarDetalhe(dto).enviado();
    }

    public WhatsAppEnvioResultadoDTO enviarDetalhe(WhatsAppMensagemDTO dto) {
        if (!isEnabled()) {
            return new WhatsAppEnvioResultadoDTO(false, "WhatsApp da loja não está ligado neste servidor.");
        }
        String numero = numeroEvolution(dto.telefone());
        if (numero.isBlank()) {
            logger.warn("WhatsApp não enviado: telefone em branco.");
            return new WhatsAppEnvioResultadoDTO(false, "Telefone em branco.");
        }
        if (!antiSpamService.podeEnviar(dto.telefone())) {
            return new WhatsAppEnvioResultadoDTO(false,
                    "Este número está em pausa anti-spam. Espere a cliente responder ou zere o bloqueio no banco.");
        }
        try {
            String url = evolutionUrl.replaceAll("/$", "") + "/message/sendText/" + instance;
            restClientQr.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("apikey", apiKey)
                    .body(Map.of("number", numero, "text", dto.mensagem()))
                    .retrieve()
                    .toBodilessEntity();
            antiSpamService.registrarEnvioAutomatico(dto.telefone());
            return new WhatsAppEnvioResultadoDTO(true, null);
        } catch (RestClientResponseException e) {
            logger.warn("WhatsApp recusado pela Evolution: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return new WhatsAppEnvioResultadoDTO(false,
                    "O WhatsApp da loja está desconectado. Confira a conexão na aba WhatsApp.");
        } catch (Exception e) {
            logger.warn("Falha ao enviar WhatsApp via Evolution API: {}", e.getMessage());
            return new WhatsAppEnvioResultadoDTO(false,
                    "Não deu para enviar agora. Confira se o WhatsApp da loja está conectado.");
        }
    }

    /** DDD+8 dígitos vira DDD+9+8; Evolution espera 55 + 11 dígitos. */
    static String numeroEvolution(String telefone) {
        String numero = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (numero.startsWith("55") && numero.length() >= 12) {
            numero = numero.substring(2);
        }
        if (numero.length() == 10) {
            numero = numero.substring(0, 2) + "9" + numero.substring(2);
        }
        if (numero.length() == 11) {
            return "55" + numero;
        }
        return numero;
    }

    public WhatsAppConexaoDTO statusConexao() {
        if (!isEnabled()) {
            return desligado();
        }
        try {
            JsonNode body = getJson("/instance/connectionState/" + instance);
            String estadoEvolution = extrairEstado(body);
            return deEstadoEvolution(estadoEvolution, null);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                return new WhatsAppConexaoDTO(true, "DESCONECTADO",
                        "O WhatsApp da loja ainda não foi pareado. Gere o QR e leia com o celular da loja.", null);
            }
            logger.warn("Evolution recusou status da conexão: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "Não foi possível consultar a Evolution. Tente de novo em instantes.", null);
        } catch (Exception e) {
            logger.warn("Falha ao consultar conexão WhatsApp: {}", e.getMessage());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "A Evolution não respondeu. Confira se o serviço está no ar.", null);
        }
    }

    public WhatsAppConexaoDTO desconectar() {
        if (!isEnabled()) {
            return desligado();
        }
        try {
            restClientQr.delete()
                    .uri(baseUrl() + "/instance/logout/" + instance)
                    .header("apikey", apiKey)
                    .retrieve()
                    .toBodilessEntity();
            return new WhatsAppConexaoDTO(true, "DESCONECTADO",
                    "WhatsApp da loja desconectado. Gere o QR para parear de novo.", null);
        } catch (RestClientResponseException e) {
            logger.warn("Evolution recusou o logout: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "Não foi possível desconectar. Tente de novo.", null);
        } catch (Exception e) {
            logger.warn("Falha ao desconectar WhatsApp: {}", e.getMessage());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "A Evolution não respondeu ao desconectar.", null);
        }
    }

    public WhatsAppConexaoDTO gerarQr() {
        if (!isEnabled()) {
            return desligado();
        }
        try {
            JsonNode body = conectarInstancia();
            String qr = extrairQr(body);
            String estadoEvolution = extrairEstado(body);
            if (qr == null && ("open".equalsIgnoreCase(estadoEvolution) || body.path("instance").path("state").asText("").equalsIgnoreCase("open"))) {
                return deEstadoEvolution("open", null);
            }
            if (qr != null) {
                return new WhatsAppConexaoDTO(true, "CONECTANDO",
                        "Leia o QR no WhatsApp do celular da loja: Aparelhos conectados → Conectar um aparelho.", qr);
            }
            return deEstadoEvolution(estadoEvolution.isBlank() ? "connecting" : estadoEvolution, null);
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 404) {
                return criarInstanciaEConectar();
            }
            logger.warn("Evolution recusou o QR: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "Não foi possível gerar o QR. Tente de novo.", null);
        } catch (Exception e) {
            logger.warn("Falha ao gerar QR WhatsApp: {}", e.getMessage());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "A Evolution não respondeu ao pedir o QR. Confira se o serviço está no ar.", null);
        }
    }

    private WhatsAppConexaoDTO criarInstanciaEConectar() {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("instanceName", instance);
            payload.put("qrcode", true);
            payload.put("integration", "WHATSAPP-BAILEYS");
            JsonNode criado = restClientQr.post()
                    .uri(baseUrl() + "/instance/create")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("apikey", apiKey)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
            String qr = extrairQr(criado);
            if (qr != null) {
                return new WhatsAppConexaoDTO(true, "CONECTANDO",
                        "Leia o QR no WhatsApp do celular da loja: Aparelhos conectados → Conectar um aparelho.", qr);
            }
            JsonNode body = conectarInstancia();
            qr = extrairQr(body);
            if (qr != null) {
                return new WhatsAppConexaoDTO(true, "CONECTANDO",
                        "Leia o QR no WhatsApp do celular da loja: Aparelhos conectados → Conectar um aparelho.", qr);
            }
            return deEstadoEvolution(extrairEstado(body), null);
        } catch (RestClientResponseException e) {
            logger.warn("Falha ao criar instância Evolution: status={} body={}",
                    e.getStatusCode().value(), e.getResponseBodyAsString());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "Não foi possível criar a conexão na Evolution. Tente de novo.", null);
        } catch (Exception e) {
            logger.warn("Falha ao criar instância Evolution: {}", e.getMessage());
            return new WhatsAppConexaoDTO(true, "ERRO",
                    "A Evolution não respondeu ao criar a conexão.", null);
        }
    }

    private JsonNode conectarInstancia() {
        return restClientQr.get()
                .uri(baseUrl() + "/instance/connect/" + instance)
                .header("apikey", apiKey)
                .retrieve()
                .body(JsonNode.class);
    }

    private JsonNode getJson(String caminho) {
        return restClient.get()
                .uri(baseUrl() + caminho)
                .header("apikey", apiKey)
                .retrieve()
                .body(JsonNode.class);
    }

    private String baseUrl() {
        return evolutionUrl.replaceAll("/$", "");
    }

    private WhatsAppConexaoDTO desligado() {
        return new WhatsAppConexaoDTO(false, "DESLIGADO",
                "O WhatsApp da loja ainda não está ligado neste servidor.", null);
    }

    private WhatsAppConexaoDTO deEstadoEvolution(String estadoEvolution, String qr) {
        String estado = (estadoEvolution == null ? "" : estadoEvolution).trim().toLowerCase();
        return switch (estado) {
            case "open" -> new WhatsAppConexaoDTO(true, "CONECTADO",
                    "WhatsApp da loja conectado. Avisos e confirmações podem sair daqui.", qr);
            case "connecting" -> new WhatsAppConexaoDTO(true, "CONECTANDO",
                    "Aguardando a leitura do QR no celular da loja.", qr);
            default -> new WhatsAppConexaoDTO(true, "DESCONECTADO",
                    "WhatsApp da loja desconectado. Abra esta aba e gere o QR para parear de novo.", qr);
        };
    }

    private static String extrairEstado(JsonNode body) {
        if (body == null || body.isNull()) {
            return "";
        }
        if (body.hasNonNull("state")) {
            return body.get("state").asText("");
        }
        JsonNode instanceNode = body.path("instance");
        if (instanceNode.hasNonNull("state")) {
            return instanceNode.get("state").asText("");
        }
        if (instanceNode.hasNonNull("status")) {
            return instanceNode.get("status").asText("");
        }
        return "";
    }

    private static String extrairQr(JsonNode body) {
        if (body == null || body.isNull()) {
            return null;
        }
        String direto = textoQr(body.get("base64"));
        if (direto != null) {
            return direto;
        }
        JsonNode qrcode = body.get("qrcode");
        if (qrcode != null && !qrcode.isNull()) {
            if (qrcode.isTextual()) {
                return textoQr(qrcode);
            }
            String aninhado = textoQr(qrcode.get("base64"));
            if (aninhado != null) {
                return aninhado;
            }
        }
        return null;
    }

    private static String textoQr(JsonNode node) {
        if (node == null || !node.isTextual()) {
            return null;
        }
        String valor = node.asText("").trim();
        if (valor.isEmpty()) {
            return null;
        }
        if (valor.startsWith("data:image")) {
            return valor;
        }
        return "data:image/png;base64," + valor;
    }
}
