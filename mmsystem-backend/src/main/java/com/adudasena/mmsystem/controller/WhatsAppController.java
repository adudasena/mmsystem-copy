package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
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
