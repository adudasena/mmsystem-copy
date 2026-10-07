package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.NotBlank;

public record WhatsAppMensagemDTO(
        @NotBlank(message = "O telefone é obrigatório.") String telefone,
        @NotBlank(message = "A mensagem é obrigatória.") String mensagem
) {
}
