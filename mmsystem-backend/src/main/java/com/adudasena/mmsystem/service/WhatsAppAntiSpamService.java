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
            @Value("${app.whatsapp.max-envios-sem-resposta:10}") int maxEnvios,
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
        Map<String, Object> chave = chaveMensagem(payload);
        if (chave == null) {
            return;
        }
        if (ehVerdadeiro(chave.get("fromMe"))) {
            return;
        }
        String telefone = jidParaTelefone(chave.get("remoteJid"));
        if (telefone == null || telefone.isBlank()) {
            return;
        }
        registrarResposta(telefone);
        logger.info("Resposta da cliente no WhatsApp: pausa/contador zerados ({})", mascara(telefone));
    }

    private Usuario localizar(String telefone) {
        if (telefone == null || telefone.isBlank()) {
            return null;
        }
        for (Usuario candidato : usuarioRepository.findAll()) {
            if (mesmoWhatsApp(telefone, candidato.getTelefone())) {
                return candidato;
            }
        }
        return null;
    }

    static boolean mesmoWhatsApp(String a, String b) {
        String x = nacionais(a);
        String y = nacionais(b);
        if (x.length() < 10 || y.length() < 10) {
            return false;
        }
        if (x.equals(y)) {
            return true;
        }
        // BR: DDD + 9 + 8 dígitos vs DDD + 8 (WhatsApp às vezes omite o 9)
        String dddX = x.substring(0, 2);
        String dddY = y.substring(0, 2);
        return dddX.equals(dddY) && ultimos8(x).equals(ultimos8(y));
    }

    private static String nacionais(String telefone) {
        String d = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (d.startsWith("55") && d.length() >= 12) {
            d = d.substring(2);
        }
        if (d.length() > 11) {
            d = d.substring(d.length() - 11);
        }
        return d;
    }

    private static String ultimos8(String nacionais) {
        return nacionais.length() <= 8 ? nacionais : nacionais.substring(nacionais.length() - 8);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> chaveMensagem(Map<String, Object> payload) {
        Object data = payload.get("data");
        if (data instanceof java.util.List<?> lista && !lista.isEmpty() && lista.get(0) instanceof Map<?, ?> primeiro) {
            return chaveMensagem((Map<String, Object>) primeiro);
        }
        if (data instanceof Map<?, ?> mapaData) {
            Map<String, Object> aninhado = chaveMensagem((Map<String, Object>) mapaData);
            if (aninhado != null) {
                return aninhado;
            }
        }
        Object key = payload.get("key");
        if (key instanceof Map<?, ?> mapaKey) {
            return (Map<String, Object>) mapaKey;
        }
        return null;
    }

    private static String jidParaTelefone(Object remoteJid) {
        if (!(remoteJid instanceof String s) || s.isBlank()) {
            return null;
        }
        if (s.contains("@g.us") || s.contains("status@broadcast")) {
            return null;
        }
        return s.split("@")[0];
    }

    private static boolean ehVerdadeiro(Object valor) {
        if (Boolean.TRUE.equals(valor)) {
            return true;
        }
        return valor instanceof String s && "true".equalsIgnoreCase(s.trim());
    }

    private static String mascara(String telefone) {
        String d = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (d.length() < 4) {
            return "****";
        }
        return "*".repeat(Math.max(0, d.length() - 4)) + d.substring(d.length() - 4);
    }
}
