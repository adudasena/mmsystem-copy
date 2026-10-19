package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import com.adudasena.mmsystem.service.WhatsAppAntiSpamService;
import com.adudasena.mmsystem.service.WhatsAppService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final WhatsAppService whatsAppService;
    private final WhatsAppAntiSpamService antiSpamService;

    @PostMapping("/webhook")
    public ResponseEntity<Map<String, Object>> webhook(@RequestBody(required = false) Map<String, Object> payload) {
        antiSpamService.processarWebhook(payload);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/enviar")
    public ResponseEntity<Map<String, Object>> enviar(@Valid @RequestBody WhatsAppMensagemDTO dto) {
        boolean enviado = whatsAppService.enviar(dto);
        if (enviado) {
            return ResponseEntity.ok(Map.of("enviado", true, "canal", "EVOLUTION"));
        }
        return ResponseEntity.ok(Map.of(
                "enviado", false,
                "canal", "FALLBACK",
                "mensagem", "Evolution API não configurada ou indisponível. Use o WhatsApp Web."
        ));
    }
}
