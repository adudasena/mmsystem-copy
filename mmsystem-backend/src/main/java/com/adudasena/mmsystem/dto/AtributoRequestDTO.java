package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.NotBlank;

public record AtributoRequestDTO(
        @NotBlank(message = "O nome é obrigatório.") String nome,
        String hexCode
) {
}
