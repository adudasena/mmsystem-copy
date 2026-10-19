package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class WhatsAppAntiSpamService {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppAntiSpamService.class);

    private final UsuarioRepository usuarioRepository;
    private final int maxEnvios;
    private final int pausaHoras;

    public WhatsAppAntiSpamService(
            UsuarioRepository usuarioRepository,
            @Value("${app.whatsapp.max-envios-sem-resposta:3}") int maxEnvios,
            @Value("${app.whatsapp.pausa-horas:24}") int pausaHoras
    ) {
        this.usuarioRepository = usuarioRepository;
        this.maxEnvios = Math.max(1, maxEnvios);
        this.pausaHoras = Math.max(1, pausaHoras);
    }

    @Transactional(readOnly = true)
    public boolean podeEnviar(String telefone) {
        Usuario usuario = localizar(telefone);
        if (usuario == null) {
            return true;
        }
        LocalDateTime bloqueadoAte = usuario.getWhatsappBloqueadoAte();
        if (bloqueadoAte != null && bloqueadoAte.isAfter(LocalDateTime.now())) {
            logger.info("WhatsApp pausado até {} para o número {}", bloqueadoAte, mascara(telefone));
            return false;
        }
        return true;
    }

    @Transactional
    public void registrarEnvioAutomatico(String telefone) {
        Usuario usuario = localizar(telefone);
        if (usuario == null) {
            return;
        }
        int contador = usuario.getWhatsappEnviosSemResposta() + 1;
        usuario.setWhatsappEnviosSemResposta(contador);
        if (contador >= maxEnvios) {
            usuario.setWhatsappBloqueadoAte(LocalDateTime.now().plusHours(pausaHoras));
            logger.info("Pausa de {}h no WhatsApp automático após {} envios sem resposta ({})",
                    pausaHoras, contador, mascara(telefone));
        }
        usuarioRepository.save(usuario);
    }

    @Transactional
    public void registrarResposta(String telefone) {
        Usuario usuario = localizar(telefone);
        if (usuario == null) {
            return;
        }
        usuario.setWhatsappEnviosSemResposta(0);
        usuario.setWhatsappBloqueadoAte(null);
        usuarioRepository.save(usuario);
    }

    @Transactional
    public void processarWebhook(Map<String, Object> payload) {
        if (payload == null) {
            return;
        }
        String telefone = extrairTelefone(payload);
        if (telefone == null || telefone.isBlank()) {
            return;
        }
        Object fromMe = buscar(payload, "fromMe");
        if (Boolean.TRUE.equals(fromMe)) {
            return;
        }
        registrarResposta(telefone);
    }

    private Usuario localizar(String telefone) {
        if (telefone == null || telefone.isBlank()) {
            return null;
        }
        String digits = telefone.replaceAll("\\D", "");
        if (digits.startsWith("55") && digits.length() >= 12) {
            digits = digits.substring(2);
        }
        if (digits.length() < 10) {
            return null;
        }
        String chave = digits.length() > 11 ? digits.substring(digits.length() - 11) : digits;
        Usuario direto = usuarioRepository.findByTelefone(chave).orElse(null);
        if (direto != null) {
            return direto;
        }
        for (Usuario candidato : usuarioRepository.findAll()) {
            String cand = candidato.getTelefone() == null ? "" : candidato.getTelefone().replaceAll("\\D", "");
            if (cand.startsWith("55") && cand.length() >= 12) {
                cand = cand.substring(2);
            }
            String candChave = cand.length() > 11 ? cand.substring(cand.length() - 11) : cand;
            if (!candChave.isEmpty() && candChave.equals(chave)) {
                return candidato;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static String extrairTelefone(Map<String, Object> payload) {
        Object remote = buscar(payload, "remoteJid");
        if (remote instanceof String s && !s.isBlank()) {
            return s.split("@")[0];
        }
        Object data = payload.get("data");
        if (data instanceof Map<?, ?> map) {
            return extrairTelefone((Map<String, Object>) map);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static Object buscar(Map<String, Object> map, String chave) {
        if (map.containsKey(chave)) {
            return map.get(chave);
        }
        for (Object valor : map.values()) {
            if (valor instanceof Map<?, ?> nested) {
                Object achado = buscar((Map<String, Object>) nested, chave);
                if (achado != null) {
                    return achado;
                }
            }
        }
        return null;
    }

    private static String mascara(String telefone) {
        String d = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (d.length() < 4) {
            return "****";
        }
        return "*".repeat(Math.max(0, d.length() - 4)) + d.substring(d.length() - 4);
    }
}
