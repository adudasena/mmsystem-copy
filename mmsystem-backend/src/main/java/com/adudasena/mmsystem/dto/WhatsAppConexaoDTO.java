package com.adudasena.mmsystem.dto;

public record WhatsAppConexaoDTO(
        boolean configurado,
        String estado,
        String mensagem,
        String qrBase64
) {
}
