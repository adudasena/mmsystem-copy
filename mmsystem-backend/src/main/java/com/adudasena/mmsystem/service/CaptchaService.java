package com.adudasena.mmsystem.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Service
public class CaptchaService {

    private static final Logger logger = LoggerFactory.getLogger(CaptchaService.class);

    private final String secret;
    private final String provider;
    private final boolean exigirNaVendaDireta;
    private final RestClient restClient;

    public CaptchaService(boolean enabled, String secret, String provider) {
        this(enabled, secret, provider, false);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public CaptchaService(
            @Value("${app.captcha.enabled:false}") boolean enabled,
            @Value("${app.captcha.secret:}") String secret,
            @Value("${app.captcha.provider:turnstile}") String provider,
            @Value("${app.captcha.exigir-venda-direta:true}") boolean exigirNaVendaDireta
    ) {
        this.exigirNaVendaDireta = exigirNaVendaDireta;
        // enabled permanece no construtor por compatibilidade; a secret é o que liga a verificação.
        this.secret = secret;
        this.provider = provider == null ? "turnstile" : provider.toLowerCase();
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /**
     * Compra direta (venda à vista) nunca passa sem anti-robô: se a secret não estiver
     * configurada o checkout é recusado (falha fechada), a menos que
     * app.captcha.exigir-venda-direta=false (dev/teste).
     */
    public void validarVendaDireta(String token, String remoteIp) {
        if (exigirNaVendaDireta && (secret == null || secret.isBlank())) {
            logger.error("Compra direta recusada: anti-robô (TURNSTILE_SECRET) não configurado no servidor.");
            throw new IllegalArgumentException(
                    "Compra direta indisponível no momento (verificação anti-robô não configurada). Use a sacola condicional ou fale com a loja.");
        }
        validar(token, remoteIp);
    }

    public void validar(String token, String remoteIp) {
        if (secret == null || secret.isBlank()) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Confirme que você não é um robô antes de finalizar.");
        }
        try {
            String url = "google".equals(provider) || "recaptcha".equals(provider)
                    ? "https://www.google.com/recaptcha/api/siteverify"
                    : "https://challenges.cloudflare.com/turnstile/v0/siteverify";
            String form = "secret=" + URLEncoder.encode(secret, StandardCharsets.UTF_8)
                    + "&response=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
            if (remoteIp != null && !remoteIp.isBlank()) {
                form += "&remoteip=" + URLEncoder.encode(remoteIp, StandardCharsets.UTF_8);
            }
            Map<?, ?> body = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            Object success = body == null ? null : body.get("success");
            if (!Boolean.TRUE.equals(success)) {
                Object erros = body == null ? null : body.get("error-codes");
                logger.warn("Captcha recusado. error-codes={}", erros);
                throw new IllegalArgumentException("Validação anti-robô falhou. Tente de novo.");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            logger.warn("Falha ao verificar captcha: {}", e.getMessage());
            throw new IllegalArgumentException("Não foi possível validar o anti-robô. Tente de novo.");
        }
    }
}
