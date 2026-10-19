package com.adudasena.mmsystem.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class CaptchaService {

    private static final Logger logger = LoggerFactory.getLogger(CaptchaService.class);

    private final boolean enabled;
    private final String secret;
    private final String provider;
    private final RestClient restClient;

    public CaptchaService(
            @Value("${app.captcha.enabled:false}") boolean enabled,
            @Value("${app.captcha.secret:}") String secret,
            @Value("${app.captcha.provider:turnstile}") String provider
    ) {
        this.enabled = enabled;
        this.secret = secret;
        this.provider = provider == null ? "turnstile" : provider.toLowerCase();
        this.restClient = RestClient.create();
    }

    public void validar(String token) {
        if (!enabled) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Confirme que você não é um robô antes de finalizar.");
        }
        if (secret == null || secret.isBlank()) {
            logger.warn("Captcha habilitado, mas o secret não está configurado.");
            throw new IllegalArgumentException("Checkout temporariamente indisponível. Tente de novo em instantes.");
        }
        try {
            String url = "google".equals(provider) || "recaptcha".equals(provider)
                    ? "https://www.google.com/recaptcha/api/siteverify"
                    : "https://challenges.cloudflare.com/turnstile/v0/siteverify";
            String form = "secret=" + java.net.URLEncoder.encode(secret, java.nio.charset.StandardCharsets.UTF_8)
                    + "&response=" + java.net.URLEncoder.encode(token, java.nio.charset.StandardCharsets.UTF_8);
            Map<?, ?> body = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
            Object success = body == null ? null : body.get("success");
            if (!Boolean.TRUE.equals(success)) {
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
